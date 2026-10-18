import type { ReactElement, ReactNode } from "react";
import { formatDateTimeAu } from "../../format/index.ts";
import type { MetricValue } from "../../schemas/index.ts";
import { Tag } from "../base/display.tsx";

// COMPONENTS.md §12A.11：计数类数字 + 必填测量口径 + 数据标记（预生成样例或更新时间）。
// 护栏（DESIGN.md §7.3、PRD §9 G3 / G10）：**没有**趋势箭头、涨跌颜色、走势图、评分、等级、
// "改善 x%" / "节省 x 小时"、风险色、员工排名。这些故意不提供 props，不能通过配置打开。
// 没有数据时写 "No data yet" 并说明原因，不用 0 冒充；也不由界面推算或补全数字。

/** 数据标记必填其一：Demo / 预生成样例，或真实数据的更新时间。 */
export type StatDataMark = { isSample: true } | { isSample: false; updatedAt: string };

export type StatCardProps = StatDataMark & {
	/** 名词："Active providers"。 */
	label: string;
	/** 已格式化的数字文字（例如 "48"、"92%"、"Fewer than 5"）；null = 没有数据。 */
	value: string | null;
	unit?: string;
	/** 统计范围、时间段、数据来源。 */
	measure: string;
	/** value 为 null 时说明原因，例如 "Grevillea House has not gone live yet." */
	noDataReason?: string;
};

export interface StatDisplayValue {
	value: string | null;
	unit?: string;
}

const NUMBER_FORMAT = new Intl.NumberFormat("en-AU");

/** 把共享 schema 的 MetricValue 转成卡片显示文字（只做格式化，不推算）。 */
export function formatMetricValue(metric: MetricValue): StatDisplayValue {
	switch (metric.kind) {
		case "Count":
			return { value: NUMBER_FORMAT.format(metric.value) };
		case "Ratio":
			return { value: `${Math.round((metric.numerator / metric.denominator) * 100)}%` };
		case "Duration":
			return { value: NUMBER_FORMAT.format(Math.round(metric.medianMinutes)), unit: "min (median)" };
		case "Suppressed":
			return { value: `Fewer than ${metric.minimumGroupSize}` };
		case "NoData":
			return { value: null };
	}
}

function DataMark(props: StatDataMark): ReactElement {
	if (props.isSample) return <Tag>Pre-generated sample</Tag>;
	return <Tag>Updated {formatDateTimeAu(props.updatedAt)}</Tag>;
}

export function StatCard(props: StatCardProps): ReactElement {
	const mark: StatDataMark = props.isSample ? { isSample: true } : { isSample: false, updatedAt: props.updatedAt };
	return (
		<li className="ck-stat">
			<p className="ck-stat-label">{props.label}</p>
			{props.value === null ? (
				<p className="ck-stat-value">No data yet</p>
			) : (
				<p className="ck-stat-value">
					{props.value}
					{props.unit ? <span className="ck-stat-unit">{props.unit}</span> : null}
				</p>
			)}
			{props.value === null && props.noDataReason ? (
				<p className="ck-stat-measure">{props.noDataReason}</p>
			) : null}
			<p className="ck-stat-measure">{props.measure}</p>
			<div className="ck-stat-footer">
				<DataMark {...mark} />
			</div>
		</li>
	);
}

export function StatGrid({ label, children }: { label: string; children: ReactNode }): ReactElement {
	return (
		<ul className="ck-stat-grid" aria-label={label}>
			{children}
		</ul>
	);
}
