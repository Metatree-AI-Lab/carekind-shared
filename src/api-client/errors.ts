import type { ApiErrorBody } from "../schemas/errors.ts";

// 客户端错误类型：调用方可以按类型区分"服务器拒绝了请求"和"服务器返回了不符合契约的数据"。

/** 服务器返回非 2xx。body 是按 ApiErrorBodySchema 校验过的错误体；不符合时为 null。 */
export class ApiRequestError extends Error {
	readonly status: number;
	readonly body: ApiErrorBody | null;
	readonly endpointPath: string;

	constructor(status: number, body: ApiErrorBody | null, endpointPath: string) {
		super(body?.message ?? `Request to ${endpointPath} failed with status ${status}.`);
		this.name = "ApiRequestError";
		this.status = status;
		this.body = body;
		this.endpointPath = endpointPath;
	}
}

/** 服务器响应不符合契约（服务器响应也是边界输入，必须校验）。issues 只含字段路径，不含值。 */
export class ApiResponseValidationError extends Error {
	readonly endpointPath: string;
	readonly issuePaths: string[];

	constructor(endpointPath: string, issuePaths: string[]) {
		super(`Response from ${endpointPath} did not match the contract.`);
		this.name = "ApiResponseValidationError";
		this.endpointPath = endpointPath;
		this.issuePaths = issuePaths;
	}
}

/** 发送前请求参数不符合契约（调用方的编程错误或未校验的用户输入）。 */
export class ApiInputValidationError extends Error {
	readonly endpointPath: string;
	readonly issuePaths: string[];

	constructor(endpointPath: string, issuePaths: string[]) {
		super(`Request to ${endpointPath} has invalid input.`);
		this.name = "ApiInputValidationError";
		this.endpointPath = endpointPath;
		this.issuePaths = issuePaths;
	}
}
