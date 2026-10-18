import { z } from "zod";
import { IdSchema, IsoDateSchema, PersonNameSchema } from "./common.ts";
import { PortalRoleSchema } from "./staff.ts";

// 流程配置（Provider Portal PRD §4.6.1）。MVP 只做第 1、2、4、7、8 项；
// 第 3、5、6 项是 TGA 🟡，审查通过后才做（§4.11），这里不定义。
// "只能调严"的比较逻辑在 src/policy/workflow-strictness.ts，业务规则只定义一次。

export const TIERS = [1, 2, 3] as const;
export const TierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type Tier = z.infer<typeof TierSchema>;

/** 审核分类（分级审核 PRD §4.1 默认表）。分级只用于审核路由，不是临床判断。 */
export const REVIEW_CATEGORIES = [
	"Adl",
	"Diet",
	"Activity",
	"Mood",
	"Social",
	"Sleep",
	"Pain",
	"Skin",
	"ContinenceChange",
	"AppetiteChange",
	"VitalSignsNarrative",
	"PrnEffect",
	"Fall",
	"Injury",
	"BehaviourEvent",
	"RestrictivePractice",
	"SuspectedAbuseOrNeglect",
	"ConditionChange",
	"MissingResident",
	"EndOfLifeAndDeath",
	"MedicationIncident",
	"PsychotropicPrn",
] as const;
export const ReviewCategorySchema = z.enum(REVIEW_CATEGORIES);
export type ReviewCategory = z.infer<typeof ReviewCategorySchema>;

/** 第 1 项：审核链与分级。 */
export const ReviewChainConfigSchema = z.object({
	item: z.literal("ReviewChain"),
	categoryTiers: z.record(ReviewCategorySchema, TierSchema),
	canPcwConfirmTier1: z.boolean(),
	canEnConfirmTier2: z.boolean(),
	/** RN 自审自己口述的 Tier 3 时是否需要第二位 RN；不需要时审计链标 "self-confirmed"。 */
	requiresSecondRnForSelfConfirmedTier3: z.boolean(),
});
export type ReviewChainConfig = z.infer<typeof ReviewChainConfigSchema>;

/** 通知收件人：角色或本院 Active 员工。 */
export const RecipientSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("Role"), role: z.enum(["RnInCharge", "CareManager", "ClinicalLead"]) }),
	z.object({ type: z.literal("Staff"), staffId: IdSchema }),
]);
export type Recipient = z.infer<typeof RecipientSchema>;

/** 备岗时限的上限（分钟）。PRD 写 {{TBD：30}}，这里按 PRD 建议值做开发默认。 */
export const MAX_BACKUP_TIMEOUT_MINUTES: number = 30;

/** 第 2 项：升级与通知路由。只通知谁，不判断是否 reportable（护栏 G6）。 */
export const EscalationRoutingConfigSchema = z.object({
	item: z.literal("EscalationRouting"),
	primaryRecipient: RecipientSchema,
	backupRecipient: RecipientSchema,
	backupTimeoutMinutes: z.number().int().min(1).max(MAX_BACKUP_TIMEOUT_MINUTES),
	sirsAssessmentOwner: RecipientSchema,
});
export type EscalationRoutingConfig = z.infer<typeof EscalationRoutingConfigSchema>;

export const LIFECYCLE_EVENTS = [
	"Admission",
	"RoomChange",
	"TransferOut",
	"DepartureRequested",
	"DepartureOrDeath",
] as const;
export const LifecycleEventSchema = z.enum(LIFECYCLE_EVENTS);
export type LifecycleEvent = z.infer<typeof LifecycleEventSchema>;

export const ChecklistItemIdSchema = z.string().regex(/^[a-z0-9-]{2,60}$/, "Use lowercase letters, digits and dashes.");

export const LifecycleChecklistItemSchema = z.object({
	id: ChecklistItemIdSchema,
	event: LifecycleEventSchema,
	label: z.string().trim().min(1).max(200),
	responsibleRole: PortalRoleSchema,
	/** 法定项标 "Required by Aged Care Rules"，不能删除。 */
	isStatutory: z.boolean(),
	/** 法定依据，例如 "Rules 148-80(1)(a)"。 */
	statutoryRef: z.string().max(80).nullable(),
	/** 提前几天提醒；越大越严。 */
	reminderLeadDays: z.number().int().min(0).max(90),
});
export type LifecycleChecklistItem = z.infer<typeof LifecycleChecklistItemSchema>;

/** 第 4 项：入住 / 转院 / 离开清单。只提醒有没有完成，careKind 不起草这些文件。 */
export const LifecycleChecklistConfigSchema = z.object({
	item: z.literal("LifecycleChecklist"),
	items: z.array(LifecycleChecklistItemSchema),
});
export type LifecycleChecklistConfig = z.infer<typeof LifecycleChecklistConfigSchema>;

/** 员工上线的三项不可移除步骤（流程第 7 项）。 */
export const MANDATORY_STAFF_ONBOARDING_STEP_IDS: readonly string[] = [
	"recording-ai-notice",
	"carekind-training",
	"registration-attestation",
];

export const StaffOnboardingStepSchema = z.object({
	id: ChecklistItemIdSchema,
	label: z.string().trim().min(1).max(200),
	isMandatory: z.boolean(),
});
export type StaffOnboardingStep = z.infer<typeof StaffOnboardingStepSchema>;

/** 第 7 项：员工上线流程。全部步骤完成才 Active。 */
export const StaffOnboardingConfigSchema = z.object({
	item: z.literal("StaffOnboarding"),
	steps: z.array(StaffOnboardingStepSchema).min(1),
});
export type StaffOnboardingConfig = z.infer<typeof StaffOnboardingConfigSchema>;

export const GoLiveChecklistEntrySchema = z.object({
	/** 1–19，对应 paperwork-requirements-by-event.md §18。 */
	itemNumber: z.number().int().min(1).max(19),
	label: z.string().trim().min(1).max(200),
	/** ★ 项：未完成时该 Facility 的护士端不能开班次（Demo 除外）。 */
	isGoLiveGate: z.boolean(),
	/** 谁更新状态：careKind 侧由 Super Admin 更新，机构侧在 Provider Portal 更新。 */
	side: z.enum(["CareKind", "Provider"]),
	responsibleName: PersonNameSchema.nullable(),
	plannedDate: IsoDateSchema.nullable(),
});
export type GoLiveChecklistEntry = z.infer<typeof GoLiveChecklistEntrySchema>;

/** 第 8 项：新养老院上线清单的配置（负责人、计划日期）。完成状态见 compliance.ts 的 GoLiveChecklistItemStatus。 */
export const FacilityGoLiveConfigSchema = z.object({
	item: z.literal("FacilityGoLive"),
	entries: z.array(GoLiveChecklistEntrySchema),
});
export type FacilityGoLiveConfig = z.infer<typeof FacilityGoLiveConfigSchema>;

export const WorkflowConfigSchema = z.discriminatedUnion("item", [
	ReviewChainConfigSchema,
	EscalationRoutingConfigSchema,
	LifecycleChecklistConfigSchema,
	StaffOnboardingConfigSchema,
	FacilityGoLiveConfigSchema,
]);
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;

export const WORKFLOW_ITEMS = [
	"ReviewChain",
	"EscalationRouting",
	"LifecycleChecklist",
	"StaffOnboarding",
	"FacilityGoLive",
] as const;
export const WorkflowItemSchema = z.enum(WORKFLOW_ITEMS);
export type WorkflowItem = z.infer<typeof WorkflowItemSchema>;

/** "临床项"需要 Clinical Lead + 第二人批准（Provider Portal PRD §4.2 规则 2）。 */
export const CLINICAL_WORKFLOW_ITEMS: readonly WorkflowItem[] = ["ReviewChain", "EscalationRouting"];
