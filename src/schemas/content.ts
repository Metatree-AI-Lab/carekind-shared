import { z } from "zod";
import {
	AustralianStateSchema,
	ExternalRefSchema,
	IdSchema,
	IsoDateSchema,
	IsoDateTimeSchema,
	ReasonTextSchema,
} from "./common.ts";
import { TierSchema } from "./workflow-config.ts";

// Super Admin 维护的全局内容：州规则包（§4-H）、文书模板库（§4-I）、功能开关（§4-K）。

export const CONTENT_STATUSES = ["Draft", "PendingApproval", "Published", "Deprecated"] as const;
export const ContentStatusSchema = z.enum(CONTENT_STATUSES);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

/** 规则包 ID：<STATE>-<YYYY.MM>-<n>，例如 "NSW-2026.10-1"。 */
export const RulePackIdSchema = z.string().regex(/^(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)-\d{4}\.(0[1-9]|1[0-2])-[1-9]\d*$/);
export type RulePackId = z.infer<typeof RulePackIdSchema>;

/**
 * 规则包条目只有三类：提示文字、字段配置、参考链接。
 * 它不做判断、不根据记录内容触发提示、不预填 🧑 人工字段（state-clinical-practice-rules.md §7）。
 */
export const RulePackEntrySchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("HintText"),
		templateId: z.string().min(1).max(120),
		fieldKey: z.string().min(1).max(120),
		text: z.string().trim().min(1).max(1000),
		isVerified: z.boolean(),
	}),
	z.object({
		kind: z.literal("FieldOptions"),
		templateId: z.string().min(1).max(120),
		fieldKey: z.string().min(1).max(120),
		options: z.array(z.object({ value: z.string().min(1).max(80), label: z.string().min(1).max(200) })).min(1),
		isVerified: z.boolean(),
	}),
	z.object({
		kind: z.literal("ReferenceLink"),
		/** 只存名称和官方页面地址，不存带令牌的链接。 */
		title: z.string().trim().min(1).max(200),
		url: z.url().nullable(),
		isVerified: z.boolean(),
	}),
]);
export type RulePackEntry = z.infer<typeof RulePackEntrySchema>;

export const RulePackSourceSchema = z.object({
	/** meta repo 中的来源文件，例如 "03-legal-compliance/references/state-clinical-practice-rules.md §1.2"。 */
	reference: z.string().min(1).max(300),
	verifiedOn: IsoDateSchema,
});

/** 州规则包（版本化，按州绑定）。未核实条目默认不对客户显示（内部标签 "To be verified"）。 */
export const StateRulePackSchema = z.object({
	id: RulePackIdSchema,
	state: AustralianStateSchema,
	status: ContentStatusSchema,
	entries: z.array(RulePackEntrySchema),
	sources: z.array(RulePackSourceSchema).min(1),
	draftedBy: IdSchema,
	approvedBy: IdSchema.nullable(),
	publishedAt: IsoDateTimeSchema.nullable(),
	createdAt: IsoDateTimeSchema,
});
export type StateRulePack = z.infer<typeof StateRulePackSchema>;

/**
 * 约束性措施同意过渡期开关（Super Admin PRD §4-H、§11.9 #5）：只能人工切换并写审计，
 * 不会到日期自动切换。默认 Active（01/12/2026 前的现行安排）。
 */
export const RpConsentTransitionSchema = z.discriminatedUnion("status", [
	z.object({ status: z.literal("Active") }),
	z.object({ status: z.literal("Ended") }),
	z.object({ status: z.literal("ExtendedUntil"), until: IsoDateSchema }),
]);
export type RpConsentTransition = z.infer<typeof RpConsentTransitionSchema>;

export const RpConsentTransitionSettingSchema = z.object({
	global: RpConsentTransitionSchema,
	stateOverrides: z.array(z.object({ state: AustralianStateSchema, setting: RpConsentTransitionSchema })),
	changedBy: IdSchema,
	changedAt: IsoDateTimeSchema,
	reason: ReasonTextSchema,
});
export type RpConsentTransitionSetting = z.infer<typeof RpConsentTransitionSettingSchema>;

/** 模板名 = meta repo `06-app-development/product/document-templates/` 下的文件名（不含 .md）。 */
export const TemplateNameSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const SemverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

/**
 * 全局文书模板库中的一个模板版本（引用，不存模板正文）。
 * 不得收入 paperwork-templates/ 的第三方原文（非商业许可）。
 */
export const DocumentTemplateRefSchema = z.object({
	id: IdSchema,
	templateName: TemplateNameSchema,
	title: z.string().trim().min(1).max(200),
	/** 字段增删 = 主版本，提示文字 = 次版本。 */
	version: SemverSchema,
	/** meta repo 中模板文件的 git 提交号。 */
	sourceCommit: z
		.string()
		.regex(/^[a-f0-9]{7,40}$/)
		.nullable(),
	defaultTier: TierSchema,
	/** 只能由员工填写的 🧑 字段；发布时校验这些字段不能标为 AI 可起草。 */
	humanOnlyFields: z.array(z.string().min(1).max(120)),
	applicableStates: z.union([z.literal("All"), z.array(AustralianStateSchema).min(1)]),
	/** Planned = Phase 2 文书，库里可见但机构不能启用。 */
	status: z.union([ContentStatusSchema, z.literal("Planned")]),
	createdAt: IsoDateTimeSchema,
});
export type DocumentTemplateRef = z.infer<typeof DocumentTemplateRefSchema>;

/** 功能开关三类：发布开关、风险开关（需要法律前提）、运维开关。 */
export const FEATURE_FLAG_CATEGORIES = ["Release", "Risk", "Operations"] as const;
export const FeatureFlagCategorySchema = z.enum(FEATURE_FLAG_CATEGORIES);

export const FeatureFlagKeySchema = z.string().regex(/^[a-z][a-z0-9_]{2,60}$/);

export const FeatureFlagOverrideSchema = z.discriminatedUnion("scope", [
	z.object({ scope: z.literal("Global"), isEnabled: z.boolean() }),
	z.object({ scope: z.literal("State"), state: AustralianStateSchema, isEnabled: z.boolean() }),
	z.object({ scope: z.literal("Provider"), providerId: IdSchema, isEnabled: z.boolean() }),
	z.object({ scope: z.literal("Facility"), providerId: IdSchema, facilityId: IdSchema, isEnabled: z.boolean() }),
]);
export type FeatureFlagOverride = z.infer<typeof FeatureFlagOverrideSchema>;

/** 功能开关默认关（rules/02 §7 默认安全）；关闭开关不删除已有数据。 */
export const FeatureFlagSchema = z.object({
	key: FeatureFlagKeySchema,
	description: z.string().trim().min(1).max(300),
	category: FeatureFlagCategorySchema,
	isEnabledByDefault: z.literal(false),
	overrides: z.array(FeatureFlagOverrideSchema),
	/** 风险开关：律师书面意见登记前，界面上不能打开。 */
	legalOpinionRef: ExternalRefSchema.nullable(),
	updatedBy: IdSchema,
	updatedAt: IsoDateTimeSchema,
});
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;
