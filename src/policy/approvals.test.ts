import { describe, expect, it } from "vitest";
import {
	canDecideApproval,
	canTransitionProvider,
	isApprovedDurationAllowed,
	supportScopeIncludesHealthInformation,
} from "./approvals.ts";

const requesterId = "1f2e3d4c-5b6a-4789-8a7b-6c5d4e3f2a1b";
const secondApproverId = "2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d";

describe("canDecideApproval", () => {
	it("refuses the requester approving their own request", () => {
		expect(canDecideApproval({ requestedBy: requesterId, status: "Pending" }, requesterId).isAllowed).toBe(false);
	});

	it("allows a second person", () => {
		expect(canDecideApproval({ requestedBy: requesterId, status: "Pending" }, secondApproverId)).toEqual({
			isAllowed: true,
			reason: null,
		});
	});

	it("refuses deciding a request twice", () => {
		expect(canDecideApproval({ requestedBy: requesterId, status: "Approved" }, secondApproverId).isAllowed).toBe(
			false,
		);
	});
});

describe("canTransitionProvider", () => {
	it("follows the lifecycle in the Super Admin PRD", () => {
		expect(canTransitionProvider("Onboarding", "Active")).toBe(true);
		expect(canTransitionProvider("Suspended", "Active")).toBe(true);
		expect(canTransitionProvider("Draft", "Active")).toBe(false);
		expect(canTransitionProvider("Terminated", "Active")).toBe(false);
	});
});

describe("support access rules", () => {
	it("treats only metadata access as free of health information", () => {
		expect(supportScopeIncludesHealthInformation("Metadata")).toBe(false);
		expect(supportScopeIncludesHealthInformation("SingleRecordOrExportJob")).toBe(true);
		expect(supportScopeIncludesHealthInformation("UnitShiftRecordList")).toBe(true);
	});

	it("lets the facility shorten but never extend the requested time", () => {
		expect(isApprovedDurationAllowed(120, 60)).toBe(true);
		expect(isApprovedDurationAllowed(120, 180)).toBe(false);
		expect(isApprovedDurationAllowed(300, 300)).toBe(false);
	});
});
