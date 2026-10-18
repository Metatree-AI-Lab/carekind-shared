import type { z } from "zod";
import type { EndpointContract } from "../contracts/define.ts";
import { ApiErrorBodySchema } from "../schemas/errors.ts";
import { ApiInputValidationError, ApiRequestError, ApiResponseValidationError } from "./errors.ts";

// 基于 fetch 的类型化客户端：输入和输出类型都从契约推导，不手写第二份。
// 服务器响应也是边界输入：每个响应都用契约的 response schema 校验，不符合就抛出，不静默使用。
// 认证靠 httpOnly cookie（credentials: "include"），客户端代码碰不到 token。

/** 某个输入槽（params / query / body）：schema 的所有字段都可选时，这个槽也可以省略。 */
type InputSlot<Name extends string, Schema extends z.ZodType> =
	Record<string, never> extends z.input<Schema>
		? { [Key in Name]?: z.input<Schema> }
		: { [Key in Name]: z.input<Schema> };

export type EndpointInput<Endpoint extends EndpointContract> = InputSlot<"params", Endpoint["params"]> &
	InputSlot<"query", Endpoint["query"]> &
	InputSlot<"body", Endpoint["body"]>;

export type EndpointOutput<Endpoint extends EndpointContract> = z.output<Endpoint["response"]>;

export interface ApiClientOptions {
	/** API 根地址，例如 "https://api.example.com"（不以 / 结尾）。 */
	baseUrl: string;
	/** 测试时可注入；默认用全局 fetch。 */
	fetchImpl?: typeof fetch;
}

export interface ApiClient {
	call<Endpoint extends EndpointContract>(
		endpoint: Endpoint,
		input: EndpointInput<Endpoint>,
	): Promise<EndpointOutput<Endpoint>>;
}

function issuePaths(error: z.ZodError): string[] {
	return error.issues.map((issue) => issue.path.map(String).join(".") || "(root)");
}

function parseInput(endpoint: EndpointContract, schema: z.ZodType, value: unknown): unknown {
	const result = schema.safeParse(value ?? {});
	if (!result.success) throw new ApiInputValidationError(endpoint.path, issuePaths(result.error));
	return result.data;
}

/** 把 `:name` 替换成编码后的参数值，并附上查询串。 */
export function buildRequestUrl(
	baseUrl: string,
	path: string,
	params: Record<string, unknown>,
	query: Record<string, unknown>,
): string {
	const filledPath = path.replace(/:([A-Za-z]+)/g, (_match, name: string) => {
		const value = params[name];
		if (value === undefined) throw new ApiInputValidationError(path, [`params.${name}`]);
		return encodeURIComponent(String(value));
	});
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== null) search.set(key, String(value));
	}
	const queryString = search.toString();
	return `${baseUrl}${filledPath}${queryString ? `?${queryString}` : ""}`;
}

/** 读取 JSON；响应体不是 JSON 时返回 undefined，由调用方决定怎么报错。 */
async function readJsonBody(response: Response): Promise<unknown> {
	const text = await response.text();
	if (text.length === 0) return undefined;
	try {
		return JSON.parse(text);
	} catch (error) {
		if (error instanceof SyntaxError) return undefined;
		throw error;
	}
}

async function toRequestError(response: Response, endpointPath: string): Promise<ApiRequestError> {
	const parsed = ApiErrorBodySchema.safeParse(await readJsonBody(response));
	return new ApiRequestError(response.status, parsed.success ? parsed.data : null, endpointPath);
}

export function createApiClient(options: ApiClientOptions): ApiClient {
	const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
	return {
		async call<Endpoint extends EndpointContract>(
			endpoint: Endpoint,
			input: EndpointInput<Endpoint>,
		): Promise<EndpointOutput<Endpoint>> {
			const slots = input as { params?: unknown; query?: unknown; body?: unknown };
			const params = parseInput(endpoint, endpoint.params, slots.params) as Record<string, unknown>;
			const query = parseInput(endpoint, endpoint.query, slots.query) as Record<string, unknown>;
			const body = parseInput(endpoint, endpoint.body, slots.body);
			const hasBody = endpoint.method !== "GET";
			const response = await fetchImpl(buildRequestUrl(options.baseUrl, endpoint.path, params, query), {
				method: endpoint.method,
				credentials: "include",
				headers: hasBody
					? { Accept: "application/json", "Content-Type": "application/json" }
					: { Accept: "application/json" },
				body: hasBody ? JSON.stringify(body) : undefined,
			});
			if (!response.ok) throw await toRequestError(response, endpoint.path);
			const result = endpoint.response.safeParse(await readJsonBody(response));
			if (!result.success) throw new ApiResponseValidationError(endpoint.path, issuePaths(result.error));
			return result.data as EndpointOutput<Endpoint>;
		},
	};
}

export type BoundEndpoints<Endpoints extends Record<string, EndpointContract>> = {
	[Name in keyof Endpoints]: (input: EndpointInput<Endpoints[Name]>) => Promise<EndpointOutput<Endpoints[Name]>>;
};

/** 把一组契约绑定成调用函数，例如 `bindEndpoints(client, endpoints.portal).listStaff({ query: {} })`。 */
export function bindEndpoints<Endpoints extends Record<string, EndpointContract>>(
	client: ApiClient,
	endpointRecord: Endpoints,
): BoundEndpoints<Endpoints> {
	const bound: Partial<BoundEndpoints<Endpoints>> = {};
	for (const name of Object.keys(endpointRecord) as Array<keyof Endpoints>) {
		const endpoint = endpointRecord[name];
		bound[name] = (input) => client.call(endpoint, input);
	}
	return bound as BoundEndpoints<Endpoints>;
}
