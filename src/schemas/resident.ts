import { z } from "zod";
import { IdSchema, IsoDateSchema, IsoDateTimeSchema, PersonNameSchema, ReasonTextSchema } from "./common.ts";

// 住户管理：Provider Portal PRD §4.5。住户属于且只属于一家 Facility。
// 本文件只定义管理端需要的身份、位置、同意、联系人字段；不含任何临床内容。

/**
 * 住户状态。只有 Admitted / OnLeave（返回后）进入护士端本班名单。
 * Provider Portal PRD §4.5 用 "Active" 表示已入住，这里叫 Admitted，含义相同。
 * 同公司转院不是状态，是 ResidentTransfer 记录（住户 ID 不变）。
 */
export const RESIDENT_STATUSES = ["PreAdmission", "Admitted", "OnLeave", "InHospital", "Departed", "Deceased"] as const;
export const ResidentStatusSchema = z.enum(RESIDENT_STATUSES);
export type ResidentStatus = z.infer<typeof ResidentStatusSchema>;

/** AI 文书同意状态。Opted out 即时生效：该住户不起草，提示手动记录（主 PRD §7.8）。 */
export const AI_DOCUMENTATION_CONSENTS = ["Pending", "Informed", "Consented", "OptedOut"] as const;
export const AiDocumentationConsentSchema = z.enum(AI_DOCUMENTATION_CONSENTS);
export type AiDocumentationConsent = z.infer<typeof AiDocumentationConsentSchema>;

export const ConsentSourceSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("Self") }),
	z.object({
		type: z.literal("Representative"),
		representativeName: PersonNameSchema,
		/** 例："son"。 */
		relationship: z.string().trim().min(1).max(60),
	}),
]);
export type ConsentSource = z.infer<typeof ConsentSourceSchema>;

export const ResidentConsentSchema = z.object({
	aiDocumentation: AiDocumentationConsentSchema,
	/** 录音退出（是 / 否）。 */
	isRecordingOptedOut: z.boolean(),
	source: ConsentSourceSchema.nullable(),
	recordedOn: IsoDateSchema.nullable(),
	recordedBy: IdSchema.nullable(),
});
export type ResidentConsent = z.infer<typeof ResidentConsentSchema>;

/**
 * 联系人角色类型。系统不推导谁是 person responsible，不把 "NOK" 当作约束性措施同意人
 * （state-clinical-practice-rules.md §0 第 2 条、§2.3）；决策人文件类型的官方名称由州规则包提供。
 */
export const CONTACT_ROLE_TYPES = ["RegisteredSupporter", "SubstituteDecisionMaker", "FamilyContact"] as const;
export const ContactRoleTypeSchema = z.enum(CONTACT_ROLE_TYPES);
export type ContactRoleType = z.infer<typeof ContactRoleTypeSchema>;

/** 联系人：只存姓名、关系和角色类型（数据最小化）。电话、邮箱、文件引用留在机构 CMS。 */
export const ResidentContactSchema = z.object({
	id: IdSchema,
	name: PersonNameSchema,
	relationship: z.string().trim().min(1).max(60),
	roleType: ContactRoleTypeSchema,
});
export type ResidentContact = z.infer<typeof ResidentContactSchema>;

/** 机构自己的住户编号（匹配键的一部分）。 */
export const FacilityResidentIdSchema = z.string().trim().min(1).max(40);

export const ResidentSchema = z.object({
	id: IdSchema,
	providerId: IdSchema,
	facilityId: IdSchema,
	unitId: IdSchema.nullable(),
	room: z.string().trim().min(1).max(20).nullable(),
	legalName: PersonNameSchema,
	preferredName: PersonNameSchema.nullable(),
	dateOfBirth: IsoDateSchema,
	/** 匹配键 = 机构住户 ID 或 CMS ID + 出生日期；姓名永远不能单独作为匹配键。 */
	facilityResidentId: FacilityResidentIdSchema,
	cmsId: z.string().trim().min(1).max(60).nullable(),
	status: ResidentStatusSchema,
	startDay: IsoDateSchema.nullable(),
	departedOn: IsoDateSchema.nullable(),
	consent: ResidentConsentSchema,
	contacts: z.array(ResidentContactSchema),
	/** 同院内有近似名（Joan Walsh / June Walsh）时两人都标记。 */
	hasSimilarNameFlag: z.boolean(),
	/** 最近一次房间变动时间；护士端名单据此显示 "Room changed" 标记。 */
	roomChangedAt: IsoDateTimeSchema.nullable(),
	createdAt: IsoDateTimeSchema,
	updatedAt: IsoDateTimeSchema,
});
export type Resident = z.infer<typeof ResidentSchema>;

/** 同院房间调换的原因类别（Rules 149-70）；careKind 只登记，不判断理由是否充分。 */
export const ROOM_CHANGE_REASONS = [
	"ResidentRequest",
	"ResidentAgreed",
	"AssessedClinicalReason",
	"Maintenance",
	"Emergency",
] as const;
export const RoomChangeReasonSchema = z.enum(ROOM_CHANGE_REASONS);
export type RoomChangeReason = z.infer<typeof RoomChangeReasonSchema>;

export const TRANSFER_STATUSES = ["Blocked", "AwaitingAcceptance", "Completed", "Cancelled"] as const;
export const TransferStatusSchema = z.enum(TRANSFER_STATUSES);
export type TransferStatus = z.infer<typeof TransferStatusSchema>;

/** 转院原因类别。PRD 只要求"原因类别"，未列出取值；以下为开发默认，⚠️ 需 Lightman 确认。 */
export const TRANSFER_REASON_CATEGORIES = [
	"CareNeeds",
	"ResidentOrFamilyRequest",
	"FacilityCapacity",
	"Other",
] as const;
export const TransferReasonCategorySchema = z.enum(TRANSFER_REASON_CATEGORIES);
export type TransferReasonCategory = z.infer<typeof TransferReasonCategorySchema>;

/** 转院阻断项：发起院未确认草稿 / 未分配片段 / 未关闭 FollowUp / 未接收交接。 */
export const TransferBlockerSchema = z.object({
	kind: z.enum(["UnconfirmedDrafts", "UnassignedSegments", "OpenFollowUps", "UnacceptedHandovers"]),
	count: z.number().int().min(1),
	resolution: z.enum(["Unresolved", "HandledAtOrigin", "HandedToDestination"]),
});
export type TransferBlocker = z.infer<typeof TransferBlockerSchema>;

/**
 * 同公司转院（Provider Portal PRD §4.5）：按住户 ID 进行，永远不按房间。
 * 跨 Provider 不是 Transfer，而是 Departed + 按住户导出。
 */
export const ResidentTransferSchema = z.object({
	id: IdSchema,
	providerId: IdSchema,
	residentId: IdSchema,
	fromFacilityId: IdSchema,
	toFacilityId: IdSchema,
	toUnitId: IdSchema.nullable(),
	toRoom: z.string().trim().min(1).max(20).nullable(),
	effectiveAt: IsoDateTimeSchema,
	reasonCategory: TransferReasonCategorySchema,
	status: TransferStatusSchema,
	blockers: z.array(TransferBlockerSchema),
	initiatedBy: IdSchema,
	acceptedBy: IdSchema.nullable(),
	acceptedAt: IsoDateTimeSchema.nullable(),
	cancelReason: ReasonTextSchema.nullable(),
	createdAt: IsoDateTimeSchema,
});
export type ResidentTransfer = z.infer<typeof ResidentTransferSchema>;
