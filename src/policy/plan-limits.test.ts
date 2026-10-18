import { describe, expect, it } from "vitest";
import type { Plan } from "../schemas/commercial.ts";
import { checkPlanLimit, planLimitMessage } from "./plan-limits.ts";

// 虚构的 Wattle Grove Care Group Pilot 套餐：60 个席位、3 家 Facility（Super Admin PRD §11.2）。
const pilotPlan: Plan = {
	id: "6f1d1c52-6a0e-4c56-9a43-2b7d5c1e8a01",
	providerId: "0b6f3a1e-2c4d-4e5f-8a9b-1c2d3e4f5a6b",
	name: "Pilot",
	limits: [
		{ unit: "seat", maxValue: 60 },
		{ unit: "facility", maxValue: 3 },
	],
	contractStart: "2026-10-06",
	contractEnd: null,
	billingStatus: "NotInvoiced",
	accountingRef: null,
	updatedBy: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
	updatedAt: "2026-10-06T09:00:00+11:00",
};

describe("checkPlanLimit", () => {
	it("allows inviting staff while under the seat limit", () => {
		expect(checkPlanLimit(pilotPlan, "seat", 59)).toMatchObject({ isAllowed: true, remaining: 1 });
	});

	it("blocks a new facility once all three are in use", () => {
		const check = checkPlanLimit(pilotPlan, "facility", 3);
		expect(check).toMatchObject({ isAllowed: false, maxValue: 3, remaining: 0 });
		expect(planLimitMessage(check)).toBe("Your plan allows 3 facilities. Contact careKind to change your plan.");
	});

	it("checks several additions at once", () => {
		expect(checkPlanLimit(pilotPlan, "seat", 55, 6).isAllowed).toBe(false);
		expect(checkPlanLimit(pilotPlan, "seat", 55, 5).isAllowed).toBe(true);
	});

	it("does not limit a unit the plan does not price by", () => {
		expect(checkPlanLimit(pilotPlan, "bed", 500)).toMatchObject({
			isAllowed: true,
			maxValue: null,
			remaining: null,
		});
	});

	it("denies by default when no plan has been set up", () => {
		const check = checkPlanLimit(null, "seat", 0);
		expect(check.isAllowed).toBe(false);
		expect(planLimitMessage(check)).toBe(
			"Your organisation doesn't have a plan yet. Contact careKind to set one up.",
		);
	});

	it("uses the staff wording from the PRD for seats", () => {
		const fortySeatPlan: Plan = { ...pilotPlan, limits: [{ unit: "seat", maxValue: 40 }] };
		expect(planLimitMessage(checkPlanLimit(fortySeatPlan, "seat", 40))).toBe(
			"Your plan allows 40 staff accounts. Contact careKind to change your plan.",
		);
	});
});
