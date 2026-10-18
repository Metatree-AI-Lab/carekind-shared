import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./common.ts";

// 审计事件（ADR-0006：audit_event 表只允许 INSERT）。
// 记录"谁、何时、做了什么、对象 ID"；不记录健康信息内容、住户姓名、原因正文。

export const AUDIT_ACTOR_TYPES = ["SuperAdminUser", "ProviderStaff", "SupportSession", "System"] as const;
export const AuditActorTypeSchema = z.enum(AUDIT_ACTOR_TYPES);
export type AuditActorType = z.infer<typeof AuditActorTypeSchema>;

export const AUDIT_TARGET_TYPES = [
	"Provider",
	"Region",
	"Facility",
	"Unit",
	"StaffMember",
	"Resident",
	"ResidentTransfer",
	"RosterImportBatch",
	"ConfigVersion",
	"StateRulePack",
	"DocumentTemplate",
	"FeatureFlag",
	"Plan",
	"ComplianceStatus",
	"GoLiveChecklistItem",
	"SupportAccessRequest",
	"ApprovalRequest",
	"SuperAdminUser",
	"Session",
] as const;
export const AuditTargetTypeSchema = z.enum(AUDIT_TARGET_TYPES);
export type AuditTargetType = z.infer<typeof AuditTargetTypeSchema>;

/** 动作名：`<对象>.<动词>`，全小写，例如 "staff.deactivate"、"config.rejected_looser"。 */
export const AuditActionSchema = z.string().regex(/^[a-z_]+(\.[a-z_]+)+$/);
export type AuditAction = z.infer<typeof AuditActionSchema>;

/**
 * 附加上下文只允许 ID、代码、数字和布尔值；字符串限长 120，防止有人把正文塞进来。
 * 写入方仍须保证不放姓名或健康信息（rules/02 §7）。
 */
export const AuditContextSchema = z.record(
	z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{0,40}$/),
	z.union([z.string().max(120), z.number(), z.boolean(), z.null()]),
);
export type AuditContext = z.infer<typeof AuditContextSchema>;

export const AuditEventSchema = z.object({
	id: IdSchema,
	/** 平台级事件（例如发布州规则包）为 null；租户事件必须带 providerId。 */
	providerId: IdSchema.nullable(),
	facilityId: IdSchema.nullable(),
	actorType: AuditActorTypeSchema,
	actorId: IdSchema.nullable(),
	action: AuditActionSchema,
	targetType: AuditTargetTypeSchema,
	targetId: z.string().min(1).max(80),
	outcome: z.enum(["Succeeded", "Rejected"]),
	occurredAt: IsoDateTimeSchema,
	context: AuditContextSchema,
	/** 哈希链：本条哈希 = H(上一条哈希 + 本条内容)，用于证明没有被改删。 */
	previousHash: z
		.string()
		.regex(/^[a-f0-9]{64}$/)
		.nullable(),
	hash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const AuditQuerySchema = z.object({
	facilityId: IdSchema.optional(),
	actorId: IdSchema.optional(),
	targetType: AuditTargetTypeSchema.optional(),
	targetId: z.string().min(1).max(80).optional(),
	action: AuditActionSchema.optional(),
	from: IsoDateTimeSchema.optional(),
	to: IsoDateTimeSchema.optional(),
});
export type AuditQuery = z.infer<typeof AuditQuerySchema>;
