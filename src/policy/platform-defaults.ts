import type { ReviewCategory, Tier, WorkflowConfig, WorkflowItem } from "../schemas/workflow-config.ts";
import { REVIEW_CATEGORIES } from "../schemas/workflow-config.ts";
import { PLATFORM_HARD_FLOOR, TIER3_LOCKED_CATEGORIES } from "./platform-hard-floor.ts";

// careKind 全局默认值（Layer 1 的第一个版本，API 种子数据用）。Super Admin 之后发布的新版本会替代它。
// 来源：分级审核 PRD §4.1 默认表；Provider Portal PRD §4.6.1 "默认值" 列与 §12.9 #4（PCW 确认 Tier 1 默认 Off）。

/** 默认 Tier 2 的临床观察类别。 */
const DEFAULT_TIER2_CATEGORIES: readonly ReviewCategory[] = [
	"Pain",
	"Skin",
	"ContinenceChange",
	"AppetiteChange",
	"VitalSignsNarrative",
	"PrnEffect",
];

function defaultTierFor(category: ReviewCategory): Tier {
	if (TIER3_LOCKED_CATEGORIES.includes(category)) return 3;
	if (DEFAULT_TIER2_CATEGORIES.includes(category)) return 2;
	return 1;
}

function buildDefaultTiers(): Record<ReviewCategory, Tier> {
	const tiers = {} as Record<ReviewCategory, Tier>;
	for (const category of REVIEW_CATEGORIES) {
		tiers[category] = defaultTierFor(category);
	}
	return tiers;
}

/** 备岗时限默认值（分钟）。PRD 写 {{TBD：15}}，这里按建议值做开发默认，⚠️ 需 Lightman 确认。 */
export const DEFAULT_BACKUP_TIMEOUT_MINUTES: number = 15;

export const PLATFORM_DEFAULT_CONFIG: Readonly<Record<WorkflowItem, WorkflowConfig>> = {
	ReviewChain: {
		item: "ReviewChain",
		categoryTiers: buildDefaultTiers(),
		canPcwConfirmTier1: false,
		canEnConfirmTier2: false,
		requiresSecondRnForSelfConfirmedTier3: false,
	},
	EscalationRouting: {
		item: "EscalationRouting",
		primaryRecipient: { type: "Role", role: "RnInCharge" },
		backupRecipient: { type: "Role", role: "CareManager" },
		backupTimeoutMinutes: DEFAULT_BACKUP_TIMEOUT_MINUTES,
		sirsAssessmentOwner: { type: "Role", role: "CareManager" },
	},
	LifecycleChecklist: PLATFORM_HARD_FLOOR.LifecycleChecklist,
	StaffOnboarding: PLATFORM_HARD_FLOOR.StaffOnboarding,
	FacilityGoLive: PLATFORM_HARD_FLOOR.FacilityGoLive,
};
