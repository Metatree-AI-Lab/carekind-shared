import type {
	EscalationRoutingConfig,
	FacilityGoLiveConfig,
	LifecycleChecklistConfig,
	ReviewChainConfig,
	StaffOnboardingConfig,
	WorkflowConfig,
} from "../schemas/workflow-config.ts";
import { REVIEW_CATEGORIES } from "../schemas/workflow-config.ts";

// "只能调严"（Super Admin PRD §4-G、Provider Portal PRD §4.6.0）的唯一实现。
// 每一项的"更严"方向写死在这里：
//   审核链：Tier 只能上调；PCW / EN 的确认权限只能收回；"RN 自审需要第二位 RN"只能打开。
//   升级路由：备岗时限只能缩短；收件人可以自由选择（没有松紧之分），但必须存在（schema 保证）。
//   入住 / 转院 / 离开清单：上一层的项不能删；法定项必须仍是法定项；提醒只能提前。
//   员工上线：上一层的步骤不能删；必选步骤必须仍是必选。
//   新院上线：上一层的清单项不能删；★ 门槛项必须仍是门槛项。

/** 一条"比上一层更松"的设置，field 用点路径表示，message 是给管理员看的澳式英语说明。 */
export interface LooserSetting {
	field: string;
	message: string;
}

function reviewChainLooser(candidate: ReviewChainConfig, baseline: ReviewChainConfig): LooserSetting[] {
	const looser: LooserSetting[] = [];
	for (const category of REVIEW_CATEGORIES) {
		if (candidate.categoryTiers[category] < baseline.categoryTiers[category]) {
			looser.push({
				field: `categoryTiers.${category}`,
				message: `${category} can't be set below Tier ${baseline.categoryTiers[category]}.`,
			});
		}
	}
	if (candidate.canPcwConfirmTier1 && !baseline.canPcwConfirmTier1) {
		looser.push({
			field: "canPcwConfirmTier1",
			message: "PCWs can't confirm Tier 1 notes under the current policy.",
		});
	}
	if (candidate.canEnConfirmTier2 && !baseline.canEnConfirmTier2) {
		looser.push({
			field: "canEnConfirmTier2",
			message: "ENs can't confirm Tier 2 notes under the current policy.",
		});
	}
	if (!candidate.requiresSecondRnForSelfConfirmedTier3 && baseline.requiresSecondRnForSelfConfirmedTier3) {
		looser.push({
			field: "requiresSecondRnForSelfConfirmedTier3",
			message: "A second RN is required for self-confirmed Tier 3 notes.",
		});
	}
	return looser;
}

function routingLooser(candidate: EscalationRoutingConfig, baseline: EscalationRoutingConfig): LooserSetting[] {
	if (candidate.backupTimeoutMinutes <= baseline.backupTimeoutMinutes) return [];
	return [
		{
			field: "backupTimeoutMinutes",
			message: `The backup time can't be longer than ${baseline.backupTimeoutMinutes} minutes.`,
		},
	];
}

function lifecycleLooser(candidate: LifecycleChecklistConfig, baseline: LifecycleChecklistConfig): LooserSetting[] {
	const looser: LooserSetting[] = [];
	const candidateById = new Map(candidate.items.map((item) => [item.id, item]));
	for (const baseItem of baseline.items) {
		const field = `items.${baseItem.id}`;
		const candidateItem = candidateById.get(baseItem.id);
		if (!candidateItem) {
			looser.push({ field, message: `"${baseItem.label}" can't be removed.` });
			continue;
		}
		if (baseItem.isStatutory && !candidateItem.isStatutory) {
			looser.push({ field, message: `"${baseItem.label}" is required by the Aged Care Rules.` });
		}
		if (candidateItem.reminderLeadDays < baseItem.reminderLeadDays) {
			looser.push({ field, message: `"${baseItem.label}" reminders can only be made earlier.` });
		}
	}
	return looser;
}

function onboardingLooser(candidate: StaffOnboardingConfig, baseline: StaffOnboardingConfig): LooserSetting[] {
	const looser: LooserSetting[] = [];
	const candidateById = new Map(candidate.steps.map((step) => [step.id, step]));
	for (const baseStep of baseline.steps) {
		const candidateStep = candidateById.get(baseStep.id);
		if (!candidateStep || (baseStep.isMandatory && !candidateStep.isMandatory)) {
			looser.push({
				field: `steps.${baseStep.id}`,
				message: `"${baseStep.label}" can't be removed or made optional.`,
			});
		}
	}
	return looser;
}

function goLiveLooser(candidate: FacilityGoLiveConfig, baseline: FacilityGoLiveConfig): LooserSetting[] {
	const looser: LooserSetting[] = [];
	const candidateByNumber = new Map(candidate.entries.map((entry) => [entry.itemNumber, entry]));
	for (const baseEntry of baseline.entries) {
		const candidateEntry = candidateByNumber.get(baseEntry.itemNumber);
		if (!candidateEntry || (baseEntry.isGoLiveGate && !candidateEntry.isGoLiveGate)) {
			looser.push({
				field: `entries.${baseEntry.itemNumber}`,
				message: `Go-live item ${baseEntry.itemNumber} can't be removed or skipped.`,
			});
		}
	}
	return looser;
}

function assertSameItem(candidate: WorkflowConfig, baseline: WorkflowConfig): void {
	if (candidate.item !== baseline.item) {
		throw new Error(`Cannot compare workflow item ${candidate.item} with ${baseline.item}.`);
	}
}

/**
 * 列出 candidate 中比 baseline（上一层的生效值）更松的设置；空数组 = 可以保存。
 * 比较不同流程项是调用方的编程错误，直接抛出。
 */
export function findLooserSettings(candidate: WorkflowConfig, baseline: WorkflowConfig): LooserSetting[] {
	assertSameItem(candidate, baseline);
	// switch 之后的类型收窄需要两个参数同时收窄；assertSameItem 已保证 item 相同。
	switch (candidate.item) {
		case "ReviewChain":
			return reviewChainLooser(candidate, baseline as ReviewChainConfig);
		case "EscalationRouting":
			return routingLooser(candidate, baseline as EscalationRoutingConfig);
		case "LifecycleChecklist":
			return lifecycleLooser(candidate, baseline as LifecycleChecklistConfig);
		case "StaffOnboarding":
			return onboardingLooser(candidate, baseline as StaffOnboardingConfig);
		case "FacilityGoLive":
			return goLiveLooser(candidate, baseline as FacilityGoLiveConfig);
	}
}

/** candidate 是否与 baseline 一样严或更严。 */
export function isStricterOrEqual(candidate: WorkflowConfig, baseline: WorkflowConfig): boolean {
	return findLooserSettings(candidate, baseline).length === 0;
}
