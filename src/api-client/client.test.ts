import { describe, expect, it } from "vitest";
import { endpoints } from "../contracts/index.ts";
import { bindEndpoints, buildRequestUrl, createApiClient } from "./client.ts";
import { ApiInputValidationError, ApiRequestError, ApiResponseValidationError } from "./errors.ts";

// 只用虚构数据（Wattle Grove Care Group）。fetch 被替换成记录请求、返回固定响应的假实现。

const facilityId = "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f";
const unitId = "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a";

interface RecordedRequest {
	url: string;
	init: RequestInit | undefined;
}

function fakeFetch(status: number, responseBody: unknown, recorded: RecordedRequest[]): typeof fetch {
	return async (input, init) => {
		recorded.push({ url: String(input), init });
		const text = responseBody === undefined ? "" : JSON.stringify(responseBody);
		return new Response(text, { status, headers: { "Content-Type": "application/json" } });
	};
}

const wattleWing = {
	id: unitId,
	providerId: "0b6f3a1e-2c4d-4e5f-8a9b-1c2d3e4f5a6b",
	facilityId,
	name: "Wattle wing",
	description: null,
	isActive: true,
	createdAt: "2026-10-06T09:00:00+11:00",
};

describe("buildRequestUrl", () => {
	it("fills path parameters and encodes the query string", () => {
		const url = buildRequestUrl(
			"https://api.test",
			"/portal/facilities/:facilityId/residents",
			{ facilityId },
			{
				status: "Admitted",
				cursor: undefined,
				limit: 50,
			},
		);
		expect(url).toBe(`https://api.test/portal/facilities/${facilityId}/residents?status=Admitted&limit=50`);
	});
});

describe("createApiClient", () => {
	it("sends a validated request with cookies and returns the validated response", async () => {
		const recorded: RecordedRequest[] = [];
		const client = createApiClient({
			baseUrl: "https://api.test",
			fetchImpl: fakeFetch(200, [wattleWing], recorded),
		});
		const units = await client.call(endpoints.portal.listUnits, { params: { facilityId } });
		expect(units[0]?.name).toBe("Wattle wing");
		expect(recorded[0]?.url).toBe(`https://api.test/portal/facilities/${facilityId}/units`);
		expect(recorded[0]?.init?.credentials).toBe("include");
		expect(recorded[0]?.init?.body).toBeUndefined();
	});

	it("rejects invalid input before sending anything", async () => {
		const recorded: RecordedRequest[] = [];
		const client = createApiClient({ baseUrl: "https://api.test", fetchImpl: fakeFetch(200, [], recorded) });
		await expect(
			client.call(endpoints.portal.listUnits, { params: { facilityId: "not-a-uuid" } }),
		).rejects.toBeInstanceOf(ApiInputValidationError);
		expect(recorded).toHaveLength(0);
	});

	it("throws ApiRequestError with the parsed error body on a non-2xx response", async () => {
		const errorBody = {
			code: "PlanLimitReached",
			message: "Your plan allows 60 staff accounts. Contact careKind to change your plan.",
		};
		const client = createApiClient({ baseUrl: "https://api.test", fetchImpl: fakeFetch(409, errorBody, []) });
		const call = client.call(endpoints.portal.createUnit, {
			params: { facilityId },
			body: { name: "Banksia wing (memory support)", description: null },
		});
		await expect(call).rejects.toBeInstanceOf(ApiRequestError);
		await expect(call).rejects.toMatchObject({ status: 409, body: errorBody });
	});

	it("throws ApiResponseValidationError when the server response breaks the contract", async () => {
		const client = createApiClient({
			baseUrl: "https://api.test",
			fetchImpl: fakeFetch(200, [{ ...wattleWing, id: 42 }], []),
		});
		await expect(client.call(endpoints.portal.listUnits, { params: { facilityId } })).rejects.toBeInstanceOf(
			ApiResponseValidationError,
		);
	});

	it("binds a group of endpoints into callable functions", async () => {
		const recorded: RecordedRequest[] = [];
		const client = createApiClient({
			baseUrl: "https://api.test",
			fetchImpl: fakeFetch(200, { ok: true }, recorded),
		});
		const portal = bindEndpoints(client, endpoints.portal);
		await expect(portal.resetDemo({})).resolves.toEqual({ ok: true });
		expect(recorded[0]?.init?.method).toBe("POST");
		expect(recorded[0]?.init?.body).toBe("{}");
	});
});
