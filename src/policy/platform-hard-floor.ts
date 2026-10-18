import type {
	FacilityGoLiveConfig,
	GoLiveChecklistEntry,
	LifecycleChecklistConfig,
	LifecycleChecklistItem,
	ReviewCategory,
	StaffOnboardingConfig,
	Tier,
	WorkflowConfig,
	WorkflowItem,
} from "../schemas/workflow-config.ts";
import { REVIEW_CATEGORIES } from "../schemas/workflow-config.ts";

// Layer 0：careKind 硬底线，写在代码里，任何人（包括 Super Admin）都不能放松。
// Platform 层（Layer 1）的每个新版本都必须 isStricterOrEqual(新版本, 硬底线)。
// 来源：Super Admin PRD §4-G、§4-J；Provider Portal PRD §4.6.1；分级审核 PRD §4.1。

/** Tier 3 敏感事件类别：不能调到 Tier 1 / 2，只能 RN 逐条确认（分级审核 PRD §4.1）。 */
export const TIER3_LOCKED_CATEGORIES: readonly ReviewCategory[] = [
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
];

function buildFloorTiers(): Record<ReviewCategory, Tier> {
	const tiers = {} as Record<ReviewCategory, Tier>;
	for (const category of REVIEW_CATEGORIES) {
		tiers[category] = TIER3_LOCKED_CATEGORIES.includes(category) ? 3 : 1;
	}
	return tiers;
}

function statutoryItem(
	id: string,
	event: LifecycleChecklistItem["event"],
	label: string,
	statutoryRef: string,
): LifecycleChecklistItem {
	return {
		id,
		event,
		label,
		responsibleRole: "FacilityManager",
		isStatutory: true,
		statutoryRef,
		reminderLeadDays: 0,
	};
}

/** 第 4 项预置的法定清单（Provider Portal PRD §4.6.1 表）。只提醒有没有完成。 */
const STATUTORY_LIFECYCLE_ITEMS: LifecycleChecklistItem[] = [
	statutoryItem(
		"care-plan-by-start-day",
		"Admission",
		"Care and services plan in place on or before the start day",
		"Rules 148-80(1)(a)",
	),
	statutoryItem(
		"care-plan-copy-given",
		"Admission",
		"Copy of the care and services plan given to the resident",
		"Rules 148-80(4)",
	),
	statutoryItem(
		"service-agreement-by-start-day",
		"Admission",
		"Service agreement in place on or before the start day",
		"Rules 148-65",
	),
	statutoryItem(
		"start-notification",
		"Admission",
		"Start notification within 28 days of the start day",
		"Rules 149-10(5)",
	),
	statutoryItem(
		"ai-notice-and-consent",
		"Admission",
		"AI documentation notice given and consent status recorded",
		"SQS 2.7.2(c)(d)",
	),
	statutoryItem(
		"registered-supporter-recorded",
		"Admission",
		"Registered supporter contact details recorded",
		"Rules 154-1000(1)(h)",
	),
	statutoryItem("room-change-reason", "RoomChange", "Reason for the room change recorded", "Rules 149-70"),
	statutoryItem(
		"records-to-new-provider",
		"TransferOut",
		"Records transferred within 28 days of the new provider's request",
		"Rules 149-80(3)",
	),
	statutoryItem(
		"written-notice-and-continuity-plan",
		"DepartureRequested",
		"At least 14 days' written notice and a continuity of care plan",
		"Rules 149-60, 149-65, 149-75",
	),
	statutoryItem(
		"cessation-notification",
		"DepartureOrDeath",
		"Cessation notification within 28 days",
		"Rules 149-20, 149-25",
	),
];

function goLive(
	itemNumber: number,
	label: string,
	isGoLiveGate: boolean,
	side: GoLiveChecklistEntry["side"],
): GoLiveChecklistEntry {
	return { itemNumber, label, isGoLiveGate, side, responsibleName: null, plannedDate: null };
}

/** 新养老院上线清单 19 项（Super Admin PRD §4-E，来自 paperwork-requirements-by-event.md §18）。 */
const GO_LIVE_ENTRIES: GoLiveChecklistEntry[] = [
	goLive(1, "Pilot Agreement signed", true, "CareKind"),
	goLive(2, "Written success criteria agreed", false, "CareKind"),
	goLive(3, "DPA / Privacy Schedule signed", true, "CareKind"),
	goLive(4, "careKind MVP PIA completed and summary provided", true, "CareKind"),
	goLive(5, "Provider PIA / privacy policy updated (including APP 1.7–1.9)", false, "Provider"),
	goLive(6, "Staff notice and consent recorded", true, "Provider"),
	goLive(7, "Resident and family notice sent; opt-out register available", true, "Provider"),
	goLive(8, "Security questionnaire answered", false, "CareKind"),
	goLive(9, "Subprocessor list provided", false, "CareKind"),
	goLive(10, "Insurance certificate current", true, "CareKind"),
	goLive(11, "Breach notification contact and timeframe registered", true, "CareKind"),
	goLive(12, "Clinical safety pack provided", false, "CareKind"),
	goLive(13, "Provider confirms IMS / SIRS process is unchanged", true, "Provider"),
	goLive(14, "Review tiers, templates and export configured", true, "Provider"),
	goLive(15, "Baseline measurement completed", false, "CareKind"),
	goLive(16, "On-site staff police check and vaccination verified", false, "CareKind"),
	goLive(17, "Commissioner notification considered", false, "Provider"),
	goLive(18, "Support SLA and support access approvers registered", true, "CareKind"),
	goLive(19, "Exit terms (return and deletion) in the contract", false, "CareKind"),
];

const STAFF_ONBOARDING_FLOOR: StaffOnboardingConfig = {
	item: "StaffOnboarding",
	steps: [
		{ id: "recording-ai-notice", label: "Recording and AI notice acknowledged", isMandatory: true },
		{ id: "carekind-training", label: "careKind training confirmed", isMandatory: true },
		{ id: "registration-attestation", label: "RN / EN registration attested", isMandatory: true },
	],
};

const LIFECYCLE_FLOOR: LifecycleChecklistConfig = { item: "LifecycleChecklist", items: STATUTORY_LIFECYCLE_ITEMS };
const GO_LIVE_FLOOR: FacilityGoLiveConfig = { item: "FacilityGoLive", entries: GO_LIVE_ENTRIES };

/** 每个流程项的硬底线（最松的允许值）。 */
export const PLATFORM_HARD_FLOOR: Readonly<Record<WorkflowItem, WorkflowConfig>> = {
	ReviewChain: {
		item: "ReviewChain",
		categoryTiers: buildFloorTiers(),
		canPcwConfirmTier1: true,
		canEnConfirmTier2: true,
		requiresSecondRnForSelfConfirmedTier3: false,
	},
	EscalationRouting: {
		item: "EscalationRouting",
		primaryRecipient: { type: "Role", role: "RnInCharge" },
		backupRecipient: { type: "Role", role: "CareManager" },
		backupTimeoutMinutes: 30,
		sirsAssessmentOwner: { type: "Role", role: "CareManager" },
	},
	LifecycleChecklist: LIFECYCLE_FLOOR,
	StaffOnboarding: STAFF_ONBOARDING_FLOOR,
	FacilityGoLive: GO_LIVE_FLOOR,
};
