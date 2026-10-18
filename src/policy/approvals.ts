import type { ProviderStatus } from "../schemas/tenancy.ts";
import type { SupportAccessScope } from "../schemas/support-access.ts";
import { MAX_SUPPORT_ACCESS_MINUTES } from "../schemas/support-access.ts";

// four-eyes、Provider 生命周期、支持访问的小规则。业务规则只在这里定义一次，API 和前端共用。

export interface DecisionCheck {
	isAllowed: boolean;
	/** 不允许时给用户看的原因。 */
	reason: string | null;
}

/** four-eyes：发起人不能批准自己的申请；只能处理 Pending 状态（Super Admin PRD §4-C）。 */
export function canDecideApproval(request: { requestedBy: string; status: string }, deciderId: string): DecisionCheck {
	if (request.status !== "Pending") return { isAllowed: false, reason: "This request has already been decided." };
	if (request.requestedBy === deciderId) {
		return { isAllowed: false, reason: "A second person must approve this. You can't approve your own request." };
	}
	return { isAllowed: true, reason: null };
}

/** Provider 生命周期允许的状态转换（Super Admin PRD §4-D 状态图）。 */
const PROVIDER_TRANSITIONS: Readonly<Record<ProviderStatus, readonly ProviderStatus[]>> = {
	Draft: ["Onboarding", "Cancelled"],
	Onboarding: ["Active", "Cancelled"],
	Active: ["Suspended", "Terminating"],
	Suspended: ["Active", "Terminating"],
	Terminating: ["Terminated"],
	Terminated: [],
	Cancelled: [],
};

export function canTransitionProvider(from: ProviderStatus, to: ProviderStatus): boolean {
	return PROVIDER_TRANSITIONS[from].includes(to);
}

/** 只有 Metadata 级支持访问不含健康信息；其他范围都含（审批界面必须明确显示）。 */
export function supportScopeIncludesHealthInformation(scope: SupportAccessScope): boolean {
	return scope !== "Metadata";
}

/** 机构审批时只能缩短时长，不能延长；上限 4 小时。 */
export function isApprovedDurationAllowed(requestedMinutes: number, approvedMinutes: number): boolean {
	return approvedMinutes > 0 && approvedMinutes <= requestedMinutes && approvedMinutes <= MAX_SUPPORT_ACCESS_MINUTES;
}
