// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { formatMetricValue, StatCard } from "./stat-card.tsx";

afterEach(cleanup);

const MEASURE = "Fictional providers with an active plan on 18/10/2026. Source: careKind records.";

describe("StatCard", () => {
	it("shows the value, the measure and the pre-generated sample tag", () => {
		render(
			<ul>
				<StatCard label="Active providers" value="1" measure={MEASURE} isSample />
			</ul>,
		);
		expect(screen.getByText("1")).toBeTruthy();
		expect(screen.getByText(MEASURE)).toBeTruthy();
		expect(screen.getByText("Pre-generated sample")).toBeTruthy();
	});

	it("never renders trends, arrows, charts or status colours", () => {
		const { container } = render(
			<ul>
				<StatCard label="Active providers" value="1" measure={MEASURE} isSample />
			</ul>,
		);
		const card = container.querySelector(".ck-stat");
		expect(card?.querySelector("svg, canvas, [class*='trend'], [class*='spark']")).toBeNull();
		expect(card?.textContent ?? "").not.toMatch(/[↑↓▲▼]|improv|saved|risk|score/i);
		expect(card?.querySelector("[class*='--success'], [class*='--warning'], [class*='--danger']")).toBeNull();
	});

	it("shows 'No data yet' with a reason instead of a zero", () => {
		render(
			<ul>
				<StatCard
					label="Drafts this week"
					value={null}
					noDataReason="Grevillea House has not gone live yet."
					measure={MEASURE}
					isSample={false}
					updatedAt="2026-10-17T22:00:00Z"
				/>
			</ul>,
		);
		expect(screen.getByText("No data yet")).toBeTruthy();
		expect(screen.queryByText("0")).toBeNull();
		expect(screen.getByText("Updated 18/10/2026 09:00")).toBeTruthy();
	});
});

describe("formatMetricValue", () => {
	it("formats without inventing numbers", () => {
		expect(formatMetricValue({ kind: "Count", value: 1240 })).toEqual({ value: "1,240" });
		expect(formatMetricValue({ kind: "Suppressed", minimumGroupSize: 5 })).toEqual({ value: "Fewer than 5" });
		expect(formatMetricValue({ kind: "NoData" })).toEqual({ value: null });
	});
});
