import type { ReactElement, ReactNode } from "react";
import { Button } from "../base/button.tsx";
import { Alert, EmptyState } from "../base/display.tsx";
import { TableHeaderCell, type TableColumn, type TableSort } from "../base/table.tsx";

// COMPONENTS.md §12A.3（第一阶段子集）：筛选栏 + 排序 + 加载 / 空 / 筛选无结果 / 失败四种状态。
// 行选择、批量操作、已选筛选 chips、分页留到后续（见 src/ui/CLAUDE.md）。
// Super Admin 列表不出现住户姓名和临床内容；不做排名列（PRD §4.7 / §9）。

export type DataTableStatus = "loading" | "error" | "ready";

const SKELETON_ROW_COUNT = 5;

export interface DataTableProps<Row> {
	caption: string;
	columns: readonly TableColumn<Row>[];
	rows: readonly Row[];
	getRowKey: (row: Row) => string;
	/** 复数名词，用于状态文字："Loading providers"、"No providers match these filters"。 */
	noun: string;
	status: DataTableStatus;
	sort?: TableSort | null;
	onSortChange?: (sort: TableSort) => void;
	/** 筛选栏内容：TextInput type="search"（isLabelHidden）+ 1–3 个 Select。 */
	filters?: ReactNode;
	hasActiveFilters?: boolean;
	onClearFilters?: () => void;
	/** 结果数，`role="status"` 播报，例如 "12 providers match your filters"。 */
	resultCountText?: string;
	/** 还没有任何数据时的空状态（说明为什么 + 一个主操作）。 */
	emptyState: ReactNode;
	onRetry?: () => void;
	/** 失败时的说明，不要包含内部细节。 */
	errorMessage?: string;
}

function StateRow({ columnCount, children }: { columnCount: number; children: ReactNode }): ReactElement {
	return (
		<tr className="ck-table-state">
			<td colSpan={columnCount}>{children}</td>
		</tr>
	);
}

function SkeletonRows({ columnCount }: { columnCount: number }): ReactElement {
	const rowIndexes = Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => index);
	const cellIndexes = Array.from({ length: columnCount }, (_, index) => index);
	return (
		<>
			{rowIndexes.map((rowIndex) => (
				<tr key={rowIndex} aria-hidden="true">
					{cellIndexes.map((cellIndex) => (
						<td key={cellIndex}>
							<span className="ck-skeleton ck-table-skeleton-cell" />
						</td>
					))}
				</tr>
			))}
		</>
	);
}

function DataRows<Row>({
	columns,
	rows,
	getRowKey,
}: Pick<DataTableProps<Row>, "columns" | "rows" | "getRowKey">): ReactElement {
	return (
		<>
			{rows.map((row) => (
				<tr key={getRowKey(row)}>
					{columns.map((column) => (
						<td key={column.key} className={column.isNumeric ? "is-num" : undefined}>
							{column.render(row)}
						</td>
					))}
				</tr>
			))}
		</>
	);
}

function TableBodyContent<Row>(props: DataTableProps<Row>): ReactElement {
	const columnCount = props.columns.length;
	if (props.status === "loading") return <SkeletonRows columnCount={columnCount} />;
	if (props.status === "error") {
		return (
			<StateRow columnCount={columnCount}>
				<div role="alert">
					<Alert variant="danger" title={`Couldn't load ${props.noun}`}>
						<p>{props.errorMessage ?? "Check your connection, then try again."}</p>
						{props.onRetry ? <Button onClick={props.onRetry}>Try again</Button> : null}
					</Alert>
				</div>
			</StateRow>
		);
	}
	if (props.rows.length > 0)
		return <DataRows columns={props.columns} rows={props.rows} getRowKey={props.getRowKey} />;
	if (props.hasActiveFilters) {
		return (
			<StateRow columnCount={columnCount}>
				<EmptyState
					title={`No ${props.noun} match these filters`}
					body="Change or clear the filters to see more results."
					headingLevel={3}
					action={
						props.onClearFilters ? <Button onClick={props.onClearFilters}>Clear filters</Button> : undefined
					}
				/>
			</StateRow>
		);
	}
	return <StateRow columnCount={columnCount}>{props.emptyState}</StateRow>;
}

export function DataTable<Row>(props: DataTableProps<Row>): ReactElement {
	const isLoading = props.status === "loading";
	return (
		<div>
			{props.filters ? (
				<div className="ck-table-toolbar">
					{props.filters}
					<div className="ck-table-toolbar-end">
						{props.hasActiveFilters && props.onClearFilters ? (
							<Button variant="text" onClick={props.onClearFilters}>
								Clear filters
							</Button>
						) : null}
						<span className="ck-table-count" role="status">
							{props.resultCountText ?? ""}
						</span>
					</div>
				</div>
			) : null}
			{isLoading ? (
				<span className="ck-sr-only" role="status">
					Loading {props.noun}
				</span>
			) : null}
			<div className="ck-table-wrap" aria-busy={isLoading || undefined}>
				<table className="ck-table">
					<caption>{props.caption}</caption>
					<thead>
						<tr>
							{props.columns.map((column) => (
								<TableHeaderCell
									key={column.key}
									header={column.header}
									columnKey={column.key}
									isSortable={column.isSortable ?? false}
									isNumeric={column.isNumeric ?? false}
									sort={props.sort}
									onSortChange={props.onSortChange}
								/>
							))}
						</tr>
					</thead>
					<tbody>
						<TableBodyContent {...props} />
					</tbody>
				</table>
			</div>
		</div>
	);
}
