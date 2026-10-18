import { z } from "zod";
import { ExternalRefSchema, IdSchema, IsoDateSchema, IsoDateTimeSchema, PersonNameSchema } from "./common.ts";

// 套餐与限额（Super Admin PRD §4-L）、签约与合规状态（§4-F）、上线清单（§4-E）。
// 只记录 + 限额生效；不做在线支付、发票、自动扣款。不存合同原件。

/** 限额单位：席位 / 床位 / Facility（计价单位未定，主 PRD §12；Super Admin PRD §11.9 #3）。 */
export const LIMIT_UNITS = ["seat", "bed", "facility"] as const;
export const LimitUnitSchema = z.enum(LIMIT_UNITS);
export type LimitUnit = z.infer<typeof LimitUnitSchema>;

export const PlanLimitSchema = z.object({
	unit: LimitUnitSchema,
	maxValue: z.number().int().min(0).max(100000),
});
export type PlanLimit = z.infer<typeof PlanLimitSchema>;

export const BILLING_STATUSES = ["NotInvoiced", "Invoiced", "Paid", "Overdue"] as const;
export const BillingStatusSchema = z.enum(BILLING_STATUSES);
export type BillingStatus = z.infer<typeof BillingStatusSchema>;

export const PlanSchema = z.object({
	id: IdSchema,
	providerId: IdSchema,
	/** 例："Pilot"。 */
	name: z.string().trim().min(1).max(80),
	/** 每个单位最多一条；同一套餐可以同时限制席位和 Facility 数（Demo：60 席位 + 3 家院）。 */
	limits: z.array(PlanLimitSchema),
	contractStart: IsoDateSchema.nullable(),
	contractEnd: IsoDateSchema.nullable(),
	/** 人工更新，来源是会计系统（只存引用）。 */
	billingStatus: BillingStatusSchema,
	accountingRef: ExternalRefSchema.nullable(),
	updatedBy: IdSchema,
	updatedAt: IsoDateTimeSchema,
});
export type Plan = z.infer<typeof PlanSchema>;

export const COMPLIANCE_DOCUMENT_TYPES = [
	"PilotAgreement",
	"SuccessCriteria",
	"Msa",
	"Dpa",
	"CarekindPia",
	"ProviderPia",
	"InsuranceProfessionalIndemnity",
	"InsuranceCyber",
	"InsurancePublicLiability",
	"SecurityQuestionnaire",
	"SubprocessorList",
	"ClinicalSafetyPack",
] as const;
export const ComplianceDocumentTypeSchema = z.enum(COMPLIANCE_DOCUMENT_TYPES);
export type ComplianceDocumentType = z.infer<typeof ComplianceDocumentTypeSchema>;

export const COMPLIANCE_STATUSES = ["NotStarted", "Drafting", "Sent", "Signed", "Expired", "NotApplicable"] as const;
export const ComplianceStatusValueSchema = z.enum(COMPLIANCE_STATUSES);
export type ComplianceStatusValue = z.infer<typeof ComplianceStatusValueSchema>;

/** 备注字段：禁止填健康信息（输入框下方提示 "Do not enter resident or health information"）。 */
export const ComplianceNoteSchema = z.string().trim().max(500);

/**
 * 一份合同 / 合规文件的状态记录：只存状态、日期、负责人和外部引用，不存原件。
 * 偏离标准条款时必须有 Lightman 批准日期（rules/01 §2）。
 */
export const ComplianceStatusSchema = z
	.object({
		providerId: IdSchema,
		documentType: ComplianceDocumentTypeSchema,
		status: ComplianceStatusValueSchema,
		effectiveOn: IsoDateSchema.nullable(),
		expiresOn: IsoDateSchema.nullable(),
		carekindOwnerId: IdSchema.nullable(),
		providerOwner: z.object({ name: PersonNameSchema, position: z.string().trim().min(1).max(120) }).nullable(),
		externalRef: ExternalRefSchema.nullable(),
		hasNonStandardTerms: z.boolean(),
		nonStandardApprovedOn: IsoDateSchema.nullable(),
		notes: ComplianceNoteSchema.nullable(),
		updatedBy: IdSchema,
		updatedAt: IsoDateTimeSchema,
	})
	.refine((record) => !record.hasNonStandardTerms || record.nonStandardApprovedOn !== null, {
		message: "Non-standard terms need Lightman's approval date.",
		path: ["nonStandardApprovedOn"],
	});
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

export const BREACH_REGIMES = ["CommonwealthNdb", "NswPublicSector", "QldPublicSector", "VicOvic", "Other"] as const;

/** 泄露通报登记（上线清单 ★11）：只是登记和提醒，事件处理走 data-breach-response-plan.md。 */
export const BreachNotificationRegistrationSchema = z.object({
	providerId: IdSchema,
	contactName: PersonNameSchema,
	contactPosition: z.string().trim().min(1).max(120),
	regime: z.enum(BREACH_REGIMES),
	/** careKind 承诺通知时限（小时）；默认 24，NSW 公营建议 12。 */
	carekindCommitmentHours: z.number().int().min(1).max(72),
	updatedBy: IdSchema,
	updatedAt: IsoDateTimeSchema,
});
export type BreachNotificationRegistration = z.infer<typeof BreachNotificationRegistrationSchema>;

/** 某家 Facility 上线清单某一项的完成情况（19 项，★ 为转 Active 的硬门槛）。 */
export const GoLiveChecklistItemStatusSchema = z.object({
	facilityId: IdSchema,
	itemNumber: z.number().int().min(1).max(19),
	isComplete: z.boolean(),
	completedAt: IsoDateTimeSchema.nullable(),
	completedBy: IdSchema.nullable(),
	/** 状态来源：合同状态、Provider 自报、Provider Portal 事件、Super Admin。 */
	source: z.enum(["ContractStatus", "ProviderSelfReport", "ProviderPortal", "SuperAdmin"]),
});
export type GoLiveChecklistItemStatus = z.infer<typeof GoLiveChecklistItemStatusSchema>;
