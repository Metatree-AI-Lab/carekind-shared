import { z } from "zod";
import { AcknowledgementSchema } from "../schemas/common.ts";
import {
	AcceptInvitationRequestSchema,
	LoginRequestSchema,
	PortalCurrentUserSchema,
	PortalDemoPersonaSchema,
	SessionInfoSchema,
	SuperAdminCurrentUserSchema,
} from "../schemas/auth.ts";
import { defineEndpoint } from "./define.ts";

// 认证端点：两个 audience 各一套路径，cookie 不共用（Super Admin PRD §4-N：独立部署与域名）。
// token 只在 httpOnly cookie 里，响应体只返回会话信息和当前用户。

const superAdminSession = z.object({ user: SuperAdminCurrentUserSchema, session: SessionInfoSchema });
const portalSession = z.object({ user: PortalCurrentUserSchema, session: SessionInfoSchema });

export const authEndpoints = {
	superAdminLogin: defineEndpoint({
		method: "POST",
		path: "/auth/super-admin/login",
		summary: "Super Admin 邮箱 + 密码登录，设置 super-admin audience 的 cookie",
		access: { app: "super-admin", isPublic: true },
		body: LoginRequestSchema,
		response: superAdminSession,
	}),
	superAdminRefresh: defineEndpoint({
		method: "POST",
		path: "/auth/super-admin/refresh",
		summary: "用 refresh cookie 轮换 access / refresh token",
		access: { app: "super-admin", isPublic: true },
		response: SessionInfoSchema,
		isAudited: false,
	}),
	superAdminLogout: defineEndpoint({
		method: "POST",
		path: "/auth/super-admin/logout",
		summary: "撤销当前 refresh token 并清除 cookie",
		access: { app: "super-admin", isPublic: true },
		response: AcknowledgementSchema,
	}),
	superAdminMe: defineEndpoint({
		method: "GET",
		path: "/auth/super-admin/me",
		summary: "当前 Super Admin 用户、权限组和权限",
		access: { app: "super-admin", isPublic: false, permissions: [] },
		response: SuperAdminCurrentUserSchema,
	}),
	superAdminEnterDemo: defineEndpoint({
		method: "POST",
		path: "/auth/super-admin/demo-session",
		summary: "进入 Demo console（只含虚构 Provider，24 小时过期，修改只作用于本会话）",
		access: { app: "super-admin", isPublic: false, permissions: [] },
		response: superAdminSession,
	}),
	portalLogin: defineEndpoint({
		method: "POST",
		path: "/auth/portal/login",
		summary: "Provider Portal 邮箱 + 密码登录，设置 portal audience 的 cookie",
		access: { app: "portal", isPublic: true },
		body: LoginRequestSchema,
		response: portalSession,
	}),
	portalRefresh: defineEndpoint({
		method: "POST",
		path: "/auth/portal/refresh",
		summary: "用 refresh cookie 轮换 access / refresh token",
		access: { app: "portal", isPublic: true },
		response: SessionInfoSchema,
		isAudited: false,
	}),
	portalLogout: defineEndpoint({
		method: "POST",
		path: "/auth/portal/logout",
		summary: "撤销当前 refresh token 并清除 cookie",
		access: { app: "portal", isPublic: true },
		response: AcknowledgementSchema,
	}),
	portalMe: defineEndpoint({
		method: "GET",
		path: "/auth/portal/me",
		summary: "当前管理端用户、Provider、管理端角色与范围",
		access: { app: "portal", isPublic: false, roles: [], scope: "Provider" },
		response: PortalCurrentUserSchema,
	}),
	portalAcceptInvitation: defineEndpoint({
		method: "POST",
		path: "/auth/portal/invitations/accept",
		summary: "用一次性邀请链接（72 小时过期）设置密码并登录",
		access: { app: "portal", isPublic: true },
		body: AcceptInvitationRequestSchema,
		response: portalSession,
	}),
	portalEnterDemo: defineEndpoint({
		method: "POST",
		path: "/auth/portal/demo-session",
		summary: "以虚构 Demo 身份进入 Wattle Grove Care Group（隔离会话，可重置）",
		access: { app: "portal", isPublic: true },
		body: z.strictObject({ persona: PortalDemoPersonaSchema }),
		response: portalSession,
	}),
} as const;
