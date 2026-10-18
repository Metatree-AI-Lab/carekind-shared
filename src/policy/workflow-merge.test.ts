import { describe, expect, it } from "vitest";
import type { EscalationRoutingConfig, ReviewChainConfig, StaffOnboardingConfig } from "../schemas/workflow-config.ts";
import { PLATFORM_DEFAULT_CONFIG } from "./platform-defaults.ts";
import { resolveEffectiveConfig } from "./workflow-merge.ts";
import { isStricterOrEqual } from "./workflow-strictness.ts";

const platformReviewChain = PLATFORM_DEFAULT_CONFIG.ReviewChain as ReviewChainConfig;
const platformRouting = PLATFORM_DEFAULT_CONFIG.EscalationRouting as EscalationRoutingConfig;

describe("resolveEffectiveConfig", () => {
	it("uses the platform value when the provider and facility have no override", () => {
		expect(resolveEffectiveConfig(platformRouting, null, null)).toEqual(platformRouting);
	});

	it("follows a raised platform minimum even when an older provider setting is looser", () => {
		// careKind 把 Skin 下限调到 Tier 3；Provider 的旧版本仍是 Tier 2 → 自动按新下限执行。
		const raisedPlatform: ReviewChainConfig = {
			...platformReviewChain,
			categoryTiers: { ...platformReviewChain.categoryTiers, Skin: 3 },
		};
		const effective = resolveEffectiveConfig(raisedPlatform, platformReviewChain, null) as ReviewChainConfig;
		expect(effective.categoryTiers.Skin).toBe(3);
		expect(isStricterOrEqual(effective, raisedPlatform)).toBe(true);
	});

	it("takes the shortest backup time and the most specific recipients", () => {
		const provider: EscalationRoutingConfig = { ...platformRouting, backupTimeoutMinutes: 12 };
		const facility: EscalationRoutingConfig = {
			...platformRouting,
			backupTimeoutMinutes: 10,
			backupRecipient: { type: "Role", role: "ClinicalLead" },
		};
		const effective = resolveEffectiveConfig(platformRouting, provider, facility) as EscalationRoutingConfig;
		expect(effective.backupTimeoutMinutes).toBe(10);
		expect(effective.backupRecipient).toEqual({ type: "Role", role: "ClinicalLead" });
	});

	it("keeps mandatory onboarding steps that a lower layer left out", () => {
		const platformOnboarding = PLATFORM_DEFAULT_CONFIG.StaffOnboarding as StaffOnboardingConfig;
		const facility: StaffOnboardingConfig = {
			item: "StaffOnboarding",
			steps: [{ id: "facility-policy-read", label: "Facility policy read and acknowledged", isMandatory: true }],
		};
		const effective = resolveEffectiveConfig(platformOnboarding, null, facility) as StaffOnboardingConfig;
		expect(effective.steps.map((step) => step.id)).toEqual([
			"facility-policy-read",
			"recording-ai-notice",
			"carekind-training",
			"registration-attestation",
		]);
	});
});
