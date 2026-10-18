import { z } from "zod";
import { EmailSchema, IdSchema, IsoDateTimeSchema, PersonNameSchema, ReasonTextSchema } from "./common.ts";
import { AuditTargetTypeSchema } from "./audit.ts";

// careKind 内部角色（Super Admin PRD §4-C、§11.9 #1）：做成可分配的权限组，不写死人名。
// 默认拒绝；"发起"和"批准"同一操作必须是两个人（four-eyes）。

export const SUPER_ADMIN_PERMISSION_GROUPS = [
	"PlatformOwner",
	"Onboarding",
	"ContentGovernance",
	"Support",
	"Commercial",
	"EngineerOnCall",
	"ReadOnlyAuditor",
] as const;
export const SuperAdminPermissionGroupSchema = z.enum(SUPER_ADMIN_PERMISSION_GROUPS);
export type SuperAdminPermissionGroup = z.infer<typeof SuperAdminPermissionGroupSchema>;

export const SUPER_ADMIN_PERMISSIONS = [
	"providers.read",
	"providers.write",
	"providers.lifecycle.request",
	"facilities.write",
	"compliance.write",
	"plans.write",
	"content.draft",
	"content.publish.request",
	"flags.write",
	"approvals.decide",
	"support.request",
	"metrics.read",
	"audit.read",
	"users.manage",
] as const;
export const SuperAdminPermissionSchema = z.enum(SUPER_ADMIN_PERMISSIONS);
export type SuperAdminPermission = z.infer<typeof SuperAdminPermissionSchema>;

/**
 * 权限组 → 权限。为什么这样分：Implementation（Onboarding）不能发布内容、不能申请支持访问；
 * Support 不能写客户数据；Commercial 不能改配置下限；审计员只读（§4-C 表）。
 * approvals.decide 只表示"可以当第二批准人"，仍不能批准自己发起的操作。
 */
export const SUPER_ADMIN_GROUP_PERMISSIONS: Readonly<
	Record<SuperAdminPermissionGroup, readonly SuperAdminPermission[]>
> = {
	PlatformOwner: [
		"providers.read",
		"providers.lifecycle.request",
		"approvals.decide",
		"metrics.read",
		"audit.read",
		"users.manage",
	],
	Onboarding: [
		"providers.read",
		"providers.write",
		"providers.lifecycle.request",
		"facilities.write",
		"compliance.write",
		"approvals.decide",
	],
	ContentGovernance: [
		"providers.read",
		"content.draft",
		"content.publish.request",
		"flags.write",
		"approvals.decide",
	],
	Support: ["providers.read", "support.request"],
	Commercial: ["providers.read", "plans.write", "compliance.write", "providers.lifecycle.request"],
	EngineerOnCall: ["metrics.read"],
	ReadOnlyAuditor: ["providers.read", "audit.read"],
};

export const SUPER_ADMIN_USER_STATUSES = ["Active", "Disabled"] as const;

/** careKind 内部用户。只允许公司身份；没有共享账号；不做 MFA（ADR-0005）。 */
export const SuperAdminUserSchema = z.object({
	id: IdSchema,
	email: EmailSchema,
	displayName: PersonNameSchema,
	groups: z.array(SuperAdminPermissionGroupSchema),
	status: z.enum(SUPER_ADMIN_USER_STATUSES),
	lastActiveAt: IsoDateTimeSchema.nullable(),
	createdAt: IsoDateTimeSchema,
});
export type SuperAdminUser = z.infer<typeof SuperAdminUserSchema>;

/** 需要 four-eyes 的操作类型。 */
export const APPROVAL_KINDS = [
	"ProviderActivate",
	"ProviderSuspend",
	"ProviderResume",
	"ProviderTerminate",
	"FacilityStateChange",
	"RulePackPublish",
	"TemplatePublish",
	"PlatformConfigPublish",
	"FeatureFlagGlobalEnable",
] as const;
export const ApprovalKindSchema = z.enum(APPROVAL_KINDS);
export type ApprovalKind = z.infer<typeof ApprovalKindSchema>;

export const APPROVAL_STATUSES = ["Pending", "Approved", "Rejected", "Withdrawn"] as const;
export const ApprovalStatusSchema = z.enum(APPROVAL_STATUSES);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalRequestSchema = z.object({
	id: IdSchema,
	kind: ApprovalKindSchema,
	providerId: IdSchema.nullable(),
	targetType: AuditTargetTypeSchema,
	targetId: z.string().min(1).max(80),
	/** 给批准人看的变更摘要，例如 "Grevillea House: NSW → QLD"。不含健康信息。 */
	summary: z.string().trim().min(1).max(300),
	reason: ReasonTextSchema,
	status: ApprovalStatusSchema,
	requestedBy: IdSchema,
	requestedAt: IsoDateTimeSchema,
	decidedBy: IdSchema.nullable(),
	decidedAt: IsoDateTimeSchema.nullable(),
	decisionNote: ReasonTextSchema.nullable(),
});
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
