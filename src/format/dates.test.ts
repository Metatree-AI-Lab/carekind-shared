import { describe, expect, it } from "vitest";
import { formatDateAu, formatDateTimeAu, parseAuDate } from "./dates.ts";

describe("formatDateAu", () => {
	it("formats a date-only value without shifting the day", () => {
		expect(formatDateAu("2026-10-18")).toBe("18/10/2026");
		expect(formatDateAu("1947-01-05")).toBe("05/01/1947");
	});

	it("converts a UTC date-time into Melbourne time before taking the date", () => {
		// 18/10/2026 14:30 UTC = 19/10/2026 01:30 AEDT
		expect(formatDateAu("2026-10-18T14:30:00Z")).toBe("19/10/2026");
	});

	it("accepts another time zone", () => {
		expect(formatDateAu("2026-10-18T14:30:00Z", "Australia/Perth")).toBe("18/10/2026");
	});

	it("throws on a value that is not a date", () => {
		expect(() => formatDateAu("next Tuesday")).toThrow(RangeError);
	});
});

describe("formatDateTimeAu", () => {
	it("uses a 24-hour clock in Melbourne time", () => {
		expect(formatDateTimeAu("2026-10-18T05:05:00Z")).toBe("18/10/2026 16:05");
	});
});

describe("parseAuDate", () => {
	it("turns DD/MM/YYYY into an ISO date", () => {
		expect(parseAuDate("15/10/2026")).toBe("2026-10-15");
		expect(parseAuDate(" 5/1/1947 ")).toBe("1947-01-05");
	});

	it("rejects a date that does not exist", () => {
		expect(() => parseAuDate("31/02/2026")).toThrow("31/02/2026 is not a real date.");
	});

	it("rejects US-style or ISO input", () => {
		expect(() => parseAuDate("2026-10-15")).toThrow("Enter the date as DD/MM/YYYY.");
	});
});
