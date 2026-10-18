import { z } from "zod";
import { EmailSchema, IdSchema, IsoDateTimeSchema, PersonNameSchema } from "./common.ts";
import { NurseAppRoleSchema, PortalRoleGrantSchema } from "./staff.ts";
import { SuperAdminPermissionGroupSchema, SuperAdminPermissionSchema } from "./super-admin.ts";

// 认证（ADR-0006）：邮箱 + 密码（argon2id）；短期 access token + 轮换 refresh token，
// 放在 httpOnly、SameSite=Strict 的 cookie 里，所以响应体里没有 token。
// Super Admin 与 Provider Portal 用不同的 token audience；不做 MFA（ADR-0005）。

export const AUTH_AUDIENCES = ["super-admin", "portal"] as const;
export const AuthAudienceSchema = z.enum(AUTH_AUDIENCES);
export type AuthAudience = z.infer<typeof AuthAudienceSchema>;

export const LoginRequestSchema = z.object({
	email: EmailSchema,
	/** 只做长度校验；密码强度规则由 API 定义。 */
	password: z.string().min(1).max(256),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const SessionInfoSchema = z.object({
	accessExpiresAt: IsoDateTimeSchema,
	/** 空闲超时（分钟）；管理端默认 15。 */
	idleTimeoutMinutes: z.number().int().min(1).max(480),
});
export type SessionInfo = z.infer<typeof SessionInfoSchema>;

export const SuperAdminCurrentUserSchema = z.object({
	audience: z.literal("super-admin"),
	userId: IdSchema,
	email: EmailSchema,
	displayName: PersonNameSchema,
	groups: z.array(SuperAdminPermissionGroupSchema),
	permissions: z.array(SuperAdminPermissionSchema),
	/** Demo console 会话：只看到虚构 Provider。 */
	isDemo: z.boolean(),
});
export type SuperAdminCurrentUser = z.infer<typeof SuperAdminCurrentUserSchema>;

export const PortalCurrentUserSchema = z.object({
	audience: z.literal("portal"),
	staffId: IdSchema,
	providerId: IdSchema,
	providerName: z.string().min(1).max(200),
	email: EmailSchema,
	displayName: PersonNameSchema,
	nurseAppRole: NurseAppRoleSchema,
	portalRoles: z.array(PortalRoleGrantSchema).min(1),
	/** Demo 会话：页面常驻 Demo 横幅，所有修改只作用于本体验者的隔离数据。 */
	isDemo: z.boolean(),
});
export type PortalCurrentUser = z.infer<typeof PortalCurrentUserSchema>;

export const CurrentUserSchema = z.discriminatedUnion("audience", [
	SuperAdminCurrentUserSchema,
	PortalCurrentUserSchema,
]);
export type CurrentUser = z.infer<typeof CurrentUserSchema>;

/** Demo 身份（全部虚构）。只开放受控操作；进入 Demo 不需要真实账号。 */
export const PORTAL_DEMO_PERSONAS = [
	"Owner",
	"FacilityManager",
	"ClinicalLead",
	"CareManager",
	"ProviderAdmin",
] as const;
export const PortalDemoPersonaSchema = z.enum(PORTAL_DEMO_PERSONAS);
export type PortalDemoPersona = z.infer<typeof PortalDemoPersonaSchema>;

/** 邀请链接设置密码（一次性链接，72 小时过期）。 */
export const AcceptInvitationRequestSchema = z.object({
	invitationToken: z.string().min(32).max(256),
	password: z.string().min(12).max(256),
});
export type AcceptInvitationRequest = z.infer<typeof AcceptInvitationRequestSchema>;
