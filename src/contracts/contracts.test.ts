import { describe, expect, it } from "vitest";
import { z } from "zod";
import { endpoints, type EndpointContract } from "./index.ts";

// 契约自检：路径唯一、前缀与 app 一致、路径参数与 params schema 一一对应、写操作默认审计。

const groups: Array<[string, Record<string, EndpointContract>]> = [
	["auth", endpoints.auth],
	["superAdmin", endpoints.superAdmin],
	["portal", endpoints.portal],
];
const allEndpoints = groups.flatMap(([group, record]) =>
	Object.entries(record).map(([name, endpoint]) => ({ group, name, endpoint })),
);

function pathParamNames(path: string): string[] {
	return [...path.matchAll(/:([A-Za-z]+)/g)].map((match) => match[1] ?? "");
}

describe("API contracts", () => {
	it("has a unique method + path for every endpoint", () => {
		const keys = allEndpoints.map(({ endpoint }) => `${endpoint.method} ${endpoint.path}`);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("uses the path prefix that matches each group", () => {
		const prefixes: Record<string, string> = { auth: "/auth/", superAdmin: "/super-admin/", portal: "/portal/" };
		for (const { group, endpoint } of allEndpoints) {
			expect(endpoint.path.startsWith(prefixes[group] ?? "")).toBe(true);
		}
	});

	it("keeps Super Admin endpoints in the super-admin app and portal endpoints in the portal app", () => {
		for (const { group, endpoint } of allEndpoints) {
			if (group === "superAdmin") expect(endpoint.access.app).toBe("super-admin");
			if (group === "portal") expect(endpoint.access.app).toBe("portal");
		}
	});

	it("declares a params schema whose keys equal the path parameters", () => {
		for (const { name, endpoint } of allEndpoints) {
			const declared = endpoint.params instanceof z.ZodObject ? Object.keys(endpoint.params.shape).sort() : [];
			expect({ name, params: declared }).toEqual({ name, params: pathParamNames(endpoint.path).sort() });
		}
	});

	it("only exposes public access on auth endpoints", () => {
		for (const { group, name, endpoint } of allEndpoints) {
			if (endpoint.access.isPublic) expect({ group, name }).toEqual({ group: "auth", name });
		}
	});

	it("audits every write endpoint", () => {
		const unauditedWrites = allEndpoints
			.filter(({ endpoint }) => endpoint.method !== "GET" && !endpoint.isAudited)
			.map(({ name }) => name);
		expect(unauditedWrites).toEqual(["superAdminRefresh", "portalRefresh"]);
	});

	it("has no Super Admin endpoint that returns resident records", () => {
		const residentPaths = Object.values(endpoints.superAdmin).filter((endpoint) => /resident/i.test(endpoint.path));
		expect(residentPaths).toEqual([]);
	});
});
