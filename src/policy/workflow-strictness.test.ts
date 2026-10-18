import { describe, expect, it } from "vitest";
import type {
	EscalationRoutingConfig,
	FacilityGoLiveConfig,
	LifecycleChecklistConfig,
	ReviewChainConfig,
	StaffOnboardingConfig,
} from "../schemas/workflow-config.ts";
import { WorkflowConfigSchema } from "../schemas/workflow-config.ts";
import { PLATFORM_DEFAULT_CONFIG } from "./platform-defaults.ts";
import { PLATFORM_HARD_FLOOR } from "./platform-hard-floor.ts";
import { findLooserSettings, isStricterOrEqual } from "./workflow-strictness.ts";

// 场景来自 Provider Portal PRD §12 场景 6 与 Super Admin PRD §11.2（虚构的 Wattle Grove Care Group）。

const companyReviewChain = PLATFORM_DEFAULT_CONFIG.ReviewChain as ReviewChainConfig;
const companyRouting = PLATFORM_DEFAULT_CONFIG.EscalationRouting as EscalationRoutingConfig;
const lifecycleFloor = PLATFORM_HARD_FLOOR.LifecycleChecklist as LifecycleChecklistConfig;
const onboardingFloor = PLATFORM_HARD_FLOOR.StaffOnboarding as StaffOnboardingConfig;
const goLiveFloor = PLATFORM_HARD_FLOOR.FacilityGoLive as FacilityGoLiveConfig;

describe("isStricterOrEqual — review chain", () => {
	it("rejects moving Fall from Tier 3 to Tier 2", () => {
		const candidate = {
			...companyReviewChain,
			categoryTiers: { ...companyReviewChain.categoryTiers, Fall: 2 as const },
		};
		expect(isStricterOrEqual(candidate, companyReviewChain)).toBe(false);
		expect(findLooserSettings(candidate, companyReviewChain).map((setting) => setting.field)).toEqual([
			"categoryTiers.Fall",
		]);
	});

	it("allows raising Skin from Tier 2 to Tier 3", () => {
		const candidate = {
			...companyReviewChain,
			categoryTiers: { ...companyReviewChain.categoryTiers, Skin: 3 as const },
		};
		expect(isStricterOrEqual(candidate, companyReviewChain)).toBe(true);
	});

	it("rejects letting ENs confirm Tier 2 when the company policy says no", () => {
		const candidate = { ...companyReviewChain, canEnConfirmTier2: true };
		expect(findLooserSettings(candidate, companyReviewChain)[0]?.field).toBe("canEnConfirmTier2");
	});

	it("allows requiring a second RN, and rejects removing that requirement", () => {
		const stricter = { ...companyReviewChain, requiresSecondRnForSelfConfirmedTier3: true };
		expect(isStricterOrEqual(stricter, companyReviewChain)).toBe(true);
		expect(isStricterOrEqual(companyReviewChain, stricter)).toBe(false);
	});

	it("treats an identical setting as equal, so saving without changes is allowed", () => {
		expect(isStricterOrEqual(companyReviewChain, companyReviewChain)).toBe(true);
	});
});

describe("isStricterOrEqual — escalation routing", () => {
	it("allows shortening the backup time from 15 to 10 minutes", () => {
		expect(isStricterOrEqual({ ...companyRouting, backupTimeoutMinutes: 10 }, companyRouting)).toBe(true);
	});

	it("rejects lengthening the backup time from 15 to 20 minutes", () => {
		const looser = findLooserSettings({ ...companyRouting, backupTimeoutMinutes: 20 }, companyRouting);
		expect(looser).toEqual([
			{ field: "backupTimeoutMinutes", message: "The backup time can't be longer than 15 minutes." },
		]);
	});

	it("lets the facility choose a different recipient", () => {
		const candidate: EscalationRoutingConfig = {
			...companyRouting,
			backupRecipient: { type: "Role", role: "ClinicalLead" },
		};
		expect(isStricterOrEqual(candidate, companyRouting)).toBe(true);
	});
});

describe("isStricterOrEqual — checklists", () => {
	it("rejects removing a statutory admission item", () => {
		const candidate = { ...lifecycleFloor, items: lifecycleFloor.items.slice(1) };
		expect(findLooserSettings(candidate, lifecycleFloor).map((setting) => setting.field)).toEqual([
			"items.care-plan-by-start-day",
		]);
	});

	it("allows adding a facility item and reminding earlier", () => {
		const candidate: LifecycleChecklistConfig = {
			item: "LifecycleChecklist",
			items: [
				...lifecycleFloor.items.map((item) => ({ ...item, reminderLeadDays: 2 })),
				{
					id: "welcome-pack",
					event: "Admission",
					label: "Welcome pack given",
					responsibleRole: "CareManager",
					isStatutory: false,
					statutoryRef: null,
					reminderLeadDays: 1,
				},
			],
		};
		expect(isStricterOrEqual(candidate, lifecycleFloor)).toBe(true);
	});

	it("rejects making a mandatory onboarding step optional", () => {
		const candidate = {
			...onboardingFloor,
			steps: onboardingFloor.steps.map((step) => ({ ...step, isMandatory: step.id !== "carekind-training" })),
		};
		expect(findLooserSettings(candidate, onboardingFloor)[0]?.field).toBe("steps.carekind-training");
	});

	it("rejects skipping a go-live gate item", () => {
		const candidate = {
			...goLiveFloor,
			entries: goLiveFloor.entries.map((entry) =>
				entry.itemNumber === 6 ? { ...entry, isGoLiveGate: false } : entry,
			),
		};
		expect(findLooserSettings(candidate, goLiveFloor)[0]?.field).toBe("entries.6");
	});
});

describe("platform layers", () => {
	it("keeps the careKind defaults at least as strict as the hard floor", () => {
		for (const item of Object.keys(PLATFORM_HARD_FLOOR) as Array<keyof typeof PLATFORM_HARD_FLOOR>) {
			expect({ item, ok: isStricterOrEqual(PLATFORM_DEFAULT_CONFIG[item], PLATFORM_HARD_FLOOR[item]) }).toEqual({
				item,
				ok: true,
			});
		}
	});

	it("produces hard floor and default values that pass the boundary schema", () => {
		for (const config of [...Object.values(PLATFORM_HARD_FLOOR), ...Object.values(PLATFORM_DEFAULT_CONFIG)]) {
			expect(WorkflowConfigSchema.safeParse(config).success).toBe(true);
		}
	});

	it("throws when comparing two different workflow items", () => {
		expect(() => findLooserSettings(companyReviewChain, companyRouting)).toThrow(/Cannot compare/);
	});
});
