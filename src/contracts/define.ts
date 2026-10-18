import { z } from "zod";
import type { PortalRole } from "../schemas/staff.ts";
import type { SuperAdminPermission } from "../schemas/super-admin.ts";

// API 契约 = 数据结构，不是框架代码。API（NestJS）据此注册路由和校验，
// 前端据此生成类型化调用（src/api-client/）。新端点默认需要登录且拒绝访问（rules/02 §7）。

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * 权限要求：
 * - public：只用于登录、刷新、接受邀请、进入 Demo（仍按 audience 隔离 cookie）。
 * - super-admin：用户的权限组里至少有 permissions 中的一个权限；空数组 = 任何已登录的 Super Admin 用户。
 * - portal：用户在请求的范围内至少有 roles 中的一个角色；空数组 = 任何已登录的管理端用户。
 *   scope 说明范围从哪里取。数据范围过滤（只返回有权限的 Facility）始终由 API 执行。
 */
export type EndpointAccess =
	| { app: "super-admin" | "portal"; isPublic: true }
	| { app: "super-admin"; isPublic: false; permissions: readonly SuperAdminPermission[] }
	| {
			app: "portal";
			isPublic: false;
			roles: readonly PortalRole[];
			/** Provider = 整个租户；Facility = 从路径或请求里的 facilityId 判断范围。 */
			scope: "Provider" | "Facility";
	  };

export interface EndpointContract<
	Params extends z.ZodType = z.ZodType,
	Query extends z.ZodType = z.ZodType,
	Body extends z.ZodType = z.ZodType,
	Response extends z.ZodType = z.ZodType,
> {
	method: HttpMethod;
	/** 路径参数写成 `:name`，例如 `/super-admin/providers/:providerId`。 */
	path: string;
	summary: string;
	access: EndpointAccess;
	params: Params;
	query: Query;
	body: Body;
	response: Response;
	/** 写操作是否写审计（只追加）。读取住户临床内容的端点同样必须写读取审计。 */
	isAudited: boolean;
}

/** 没有参数 / 查询 / 请求体时用的空对象 schema（strict：多传字段也拒绝）。 */
export const NoInput = z.strictObject({});

interface EndpointDefinition<
	Params extends z.ZodType,
	Query extends z.ZodType,
	Body extends z.ZodType,
	Response extends z.ZodType,
> {
	method: HttpMethod;
	path: string;
	summary: string;
	access: EndpointAccess;
	params?: Params;
	query?: Query;
	body?: Body;
	response: Response;
	isAudited?: boolean;
}

/**
 * 定义一个端点。省略的 params / query / body 用 NoInput；
 * isAudited 默认：GET 不写、其他方法写（写操作全部审计，Provider Portal PRD §4.8）。
 */
export function defineEndpoint<
	Params extends z.ZodType = typeof NoInput,
	Query extends z.ZodType = typeof NoInput,
	Body extends z.ZodType = typeof NoInput,
	Response extends z.ZodType = z.ZodType,
>(definition: EndpointDefinition<Params, Query, Body, Response>): EndpointContract<Params, Query, Body, Response> {
	return {
		method: definition.method,
		path: definition.path,
		summary: definition.summary,
		access: definition.access,
		params: (definition.params ?? NoInput) as Params,
		query: (definition.query ?? NoInput) as Query,
		body: (definition.body ?? NoInput) as Body,
		response: definition.response,
		isAudited: definition.isAudited ?? definition.method !== "GET",
	};
}

/** 只给 Super Admin 某些权限的快捷写法。 */
export function superAdminAccess(...permissions: SuperAdminPermission[]): EndpointAccess {
	return { app: "super-admin", isPublic: false, permissions };
}

/** 只给 Provider Portal 某些角色的快捷写法。 */
export function portalAccess(scope: "Provider" | "Facility", ...roles: PortalRole[]): EndpointAccess {
	return { app: "portal", isPublic: false, roles, scope };
}
