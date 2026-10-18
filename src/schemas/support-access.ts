import { z } from "zod";
import { IdSchema, IsoDateTimeSchema, ReasonTextSchema } from "./common.ts";

// careKind 支持访问（Super Admin PRD §4-M，Provider Portal PRD §4.8）：
// 工单 + 机构批准 + 限范围限时 + 全程审计 + 机构可见。只读；没有"整个租户"选项。

/** 范围从小到大，默认最小。大多数工单应只用 Metadata（不含健康内容）。 */
export const SUPPORT_ACCESS_SCOPES = ["Metadata", "SingleRecordOrExportJob", "UnitShiftRecordList"] as const;
export const SupportAccessScopeSchema = z.enum(SUPPORT_ACCESS_SCOPES);
export type SupportAccessScope = z.infer<typeof SupportAccessScopeSchema>;

export const SUPPORT_ACCESS_STATUSES = ["Pending", "Approved", "Rejected", "Active", "Expired", "Revoked"] as const;
export const SupportAccessStatusSchema = z.enum(SUPPORT_ACCESS_STATUSES);
export type SupportAccessStatus = z.infer<typeof SupportAccessStatusSchema>;

/** 时长上限 4 小时，默认 2 小时。 */
export const MAX_SUPPORT_ACCESS_MINUTES: number = 240;
export const DEFAULT_SUPPORT_ACCESS_MINUTES: number = 120;

/** 工单号，例如 "SUP-0142"。 */
export const SupportTicketRefSchema = z.string().regex(/^[A-Z]{2,5}-\d{3,8}$/);

/** 访问目标：Metadata 级只指向 Facility；内容级必须指向具体对象或某 Unit 某一班。 */
export const SupportAccessTargetSchema = z.discriminatedUnion("scope", [
	z.object({ scope: z.literal("Metadata"), facilityId: IdSchema }),
	z.object({
		scope: z.literal("SingleRecordOrExportJob"),
		facilityId: IdSchema,
		objectType: z.enum(["Record", "ExportJob"]),
		objectId: IdSchema,
	}),
	z.object({
		scope: z.literal("UnitShiftRecordList"),
		facilityId: IdSchema,
		unitId: IdSchema,
		shiftStartsAt: IsoDateTimeSchema,
	}),
]);
export type SupportAccessTarget = z.infer<typeof SupportAccessTargetSchema>;

export const SupportAccessRequestSchema = z.object({
	id: IdSchema,
	providerId: IdSchema,
	ticketRef: SupportTicketRefSchema,
	reason: ReasonTextSchema,
	target: SupportAccessTargetSchema,
	/** 由 target.scope 决定：只有 Metadata 不含健康信息。冗余存储便于审批界面直接显示。 */
	includesHealthInformation: z.boolean(),
	durationMinutes: z.number().int().min(15).max(MAX_SUPPORT_ACCESS_MINUTES),
	status: SupportAccessStatusSchema,
	requestedBy: IdSchema,
	requestedAt: IsoDateTimeSchema,
	/** 机构侧审批人（Owner 或 Provider admin）。 */
	decidedBy: IdSchema.nullable(),
	decidedAt: IsoDateTimeSchema.nullable(),
	decisionNote: ReasonTextSchema.nullable(),
	startedAt: IsoDateTimeSchema.nullable(),
	expiresAt: IsoDateTimeSchema.nullable(),
	endedAt: IsoDateTimeSchema.nullable(),
	revokedBy: IdSchema.nullable(),
	/** 结束后的访问摘要：看了哪些对象（只计数和类型，不含内容）。 */
	accessSummary: z
		.object({
			objectsViewed: z.array(z.object({ objectType: z.string().max(60), count: z.number().int().min(0) })),
		})
		.nullable(),
	/** Demo 中审批为预生成。 */
	isPreGenerated: z.boolean(),
});
export type SupportAccessRequest = z.infer<typeof SupportAccessRequestSchema>;
