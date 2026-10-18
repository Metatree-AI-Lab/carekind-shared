import type {
	EscalationRoutingConfig,
	FacilityGoLiveConfig,
	LifecycleChecklistConfig,
	ReviewCategory,
	ReviewChainConfig,
	StaffOnboardingConfig,
	Tier,
	WorkflowConfig,
} from "../schemas/workflow-config.ts";
import { REVIEW_CATEGORIES } from "../schemas/workflow-config.ts";

// 生效值 = 逐层取"更严"的值（Super Admin PRD §4-G）。
// 为什么不直接用最下层的值：上层下限之后可能被调严（例如 careKind 提高平台下限），
// 这时下层旧值比新下限松，必须自动按新下限执行，而不是等机构重新保存。
// "更严"的方向与 workflow-strictness.ts 一致；没有松紧之分的字段（收件人、文字、负责人）取下层的值。

function mergeReviewChain(upper: ReviewChainConfig, lower: ReviewChainConfig): ReviewChainConfig {
	const categoryTiers = {} as Record<ReviewCategory, Tier>;
	for (const category of REVIEW_CATEGORIES) {
		categoryTiers[category] = Math.max(upper.categoryTiers[category], lower.categoryTiers[category]) as Tier;
	}
	return {
		item: "ReviewChain",
		categoryTiers,
		canPcwConfirmTier1: upper.canPcwConfirmTier1 && lower.canPcwConfirmTier1,
		canEnConfirmTier2: upper.canEnConfirmTier2 && lower.canEnConfirmTier2,
		requiresSecondRnForSelfConfirmedTier3:
			upper.requiresSecondRnForSelfConfirmedTier3 || lower.requiresSecondRnForSelfConfirmedTier3,
	};
}

function mergeRouting(upper: EscalationRoutingConfig, lower: EscalationRoutingConfig): EscalationRoutingConfig {
	return { ...lower, backupTimeoutMinutes: Math.min(upper.backupTimeoutMinutes, lower.backupTimeoutMinutes) };
}

/** 按 key 合并两层列表：下层的项在前（保留下层的顺序和文字），上层独有的项补在后面。 */
function unionByKey<Item, Key>(
	upperItems: readonly Item[],
	lowerItems: readonly Item[],
	keyOf: (item: Item) => Key,
	combine: (upperItem: Item, lowerItem: Item) => Item,
): Item[] {
	const upperByKey = new Map(upperItems.map((item) => [keyOf(item), item]));
	const lowerKeys = new Set(lowerItems.map(keyOf));
	const merged = lowerItems.map((lowerItem) => {
		const upperItem = upperByKey.get(keyOf(lowerItem));
		return upperItem ? combine(upperItem, lowerItem) : lowerItem;
	});
	const upperOnly = upperItems.filter((item) => !lowerKeys.has(keyOf(item)));
	return [...merged, ...upperOnly];
}

function mergeLifecycle(upper: LifecycleChecklistConfig, lower: LifecycleChecklistConfig): LifecycleChecklistConfig {
	const items = unionByKey(
		upper.items,
		lower.items,
		(item) => item.id,
		(upperItem, lowerItem) => ({
			...lowerItem,
			isStatutory: upperItem.isStatutory || lowerItem.isStatutory,
			statutoryRef: upperItem.statutoryRef ?? lowerItem.statutoryRef,
			reminderLeadDays: Math.max(upperItem.reminderLeadDays, lowerItem.reminderLeadDays),
		}),
	);
	return { item: "LifecycleChecklist", items };
}

function mergeOnboarding(upper: StaffOnboardingConfig, lower: StaffOnboardingConfig): StaffOnboardingConfig {
	const steps = unionByKey(
		upper.steps,
		lower.steps,
		(step) => step.id,
		(upperStep, lowerStep) => ({ ...lowerStep, isMandatory: upperStep.isMandatory || lowerStep.isMandatory }),
	);
	return { item: "StaffOnboarding", steps };
}

function mergeGoLive(upper: FacilityGoLiveConfig, lower: FacilityGoLiveConfig): FacilityGoLiveConfig {
	const entries = unionByKey(
		upper.entries,
		lower.entries,
		(entry) => entry.itemNumber,
		(upperEntry, lowerEntry) => ({
			...lowerEntry,
			isGoLiveGate: upperEntry.isGoLiveGate || lowerEntry.isGoLiveGate,
		}),
	);
	return { item: "FacilityGoLive", entries: entries.sort((first, second) => first.itemNumber - second.itemNumber) };
}

/** 合并相邻两层（upper = 更上层，例如 Platform；lower = 更下层，例如 Provider）。 */
export function mergeStricter(upper: WorkflowConfig, lower: WorkflowConfig): WorkflowConfig {
	if (upper.item !== lower.item) {
		throw new Error(`Cannot merge workflow item ${upper.item} with ${lower.item}.`);
	}
	switch (upper.item) {
		case "ReviewChain":
			return mergeReviewChain(upper, lower as ReviewChainConfig);
		case "EscalationRouting":
			return mergeRouting(upper, lower as EscalationRoutingConfig);
		case "LifecycleChecklist":
			return mergeLifecycle(upper, lower as LifecycleChecklistConfig);
		case "StaffOnboarding":
			return mergeOnboarding(upper, lower as StaffOnboardingConfig);
		case "FacilityGoLive":
			return mergeGoLive(upper, lower as FacilityGoLiveConfig);
	}
}

/** 某个 Facility 的生效配置：Platform → Provider → Facility，缺的层跳过。 */
export function resolveEffectiveConfig(
	platform: WorkflowConfig,
	provider: WorkflowConfig | null,
	facility: WorkflowConfig | null,
): WorkflowConfig {
	const withProvider = provider ? mergeStricter(platform, provider) : platform;
	return facility ? mergeStricter(withProvider, facility) : withProvider;
}
