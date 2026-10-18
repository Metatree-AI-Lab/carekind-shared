import type { LimitUnit, Plan } from "../schemas/commercial.ts";

// 套餐限额（Super Admin PRD §4-L）：超限时禁用"新增员工 / 新增养老院"并提示；
// 已有员工不会被停用，护士端不受影响（不能因为账务原因中断临床记录）。

export interface PlanLimitCheck {
	isAllowed: boolean;
	/** false = Super Admin 还没给这个 Provider 设置套餐。 */
	hasPlan: boolean;
	unit: LimitUnit;
	/** null = 套餐没有限制这个单位。 */
	maxValue: number | null;
	currentCount: number;
	/** 还能新增多少；没有限制时为 null。 */
	remaining: number | null;
}

/**
 * 判断在当前数量上再新增 additions 个是否超限。
 * 没有套餐时默认拒绝：开通流程第 4 步必须先选套餐（默认安全）。
 */
export function checkPlanLimit(
	plan: Plan | null,
	unit: LimitUnit,
	currentCount: number,
	additions: number = 1,
): PlanLimitCheck {
	if (!plan) {
		return { isAllowed: false, hasPlan: false, unit, maxValue: null, currentCount, remaining: 0 };
	}
	const limit = plan.limits.find((planLimit) => planLimit.unit === unit);
	if (!limit) {
		return { isAllowed: true, hasPlan: true, unit, maxValue: null, currentCount, remaining: null };
	}
	return {
		isAllowed: currentCount + additions <= limit.maxValue,
		hasPlan: true,
		unit,
		maxValue: limit.maxValue,
		currentCount,
		remaining: Math.max(limit.maxValue - currentCount, 0),
	};
}

const UNIT_NOUNS: Readonly<Record<LimitUnit, string>> = {
	seat: "staff accounts",
	bed: "beds",
	facility: "facilities",
};

/** 超限时界面显示的文字，例如 "Your plan allows 40 staff accounts. Contact careKind to change your plan."。 */
export function planLimitMessage(check: PlanLimitCheck): string {
	if (!check.hasPlan) return "Your organisation doesn't have a plan yet. Contact careKind to set one up.";
	if (check.maxValue === null) return "";
	return `Your plan allows ${check.maxValue} ${UNIT_NOUNS[check.unit]}. Contact careKind to change your plan.`;
}
