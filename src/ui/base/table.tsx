import type { ReactElement, ReactNode } from "react";
import { Icon } from "./icon.tsx";

// COMPONENTS.md §10 Table + §12A.3 排序。必须有 caption；可排序列的表头是按钮，th 上标 aria-sort；
// 同一时间只按一列排序。方向用图标形状 + aria-sort 表达，不只靠颜色。

export type SortDirection = "ascending" | "descending";

export interface TableSort {
	columnKey: string;
	direction: SortDirection;
}

export interface TableColumn<Row> {
	key: string;
	header: string;
	render: (row: Row) => ReactNode;
	isSortable?: boolean;
	/** 数字列右对齐并用等宽数字（`is-num`）。 */
	isNumeric?: boolean;
}

export interface TableProps<Row> {
	caption: string;
	/** 视觉隐藏 caption（页面已有同名标题时）。 */
	isCaptionHidden?: boolean;
	columns: readonly TableColumn<Row>[];
	rows: readonly Row[];
	getRowKey: (row: Row) => string;
	sort?: TableSort | null;
	onSortChange?: (sort: TableSort) => void;
}

/** 点击同一列切换方向；点击新列从升序开始。 */
export function nextSort(current: TableSort | null | undefined, columnKey: string): TableSort {
	if (current?.columnKey === columnKey) {
		return { columnKey, direction: current.direction === "ascending" ? "descending" : "ascending" };
	}
	return { columnKey, direction: "ascending" };
}

export interface TableHeaderCellProps {
	header: string;
	columnKey: string;
	isSortable: boolean;
	isNumeric: boolean;
	sort: TableSort | null | undefined;
	onSortChange?: (sort: TableSort) => void;
}

/** 表头单元格；DataTable 也复用它，保证排序行为只有一份实现。 */
export function TableHeaderCell({
	header,
	columnKey,
	isSortable,
	isNumeric,
	sort,
	onSortChange,
}: TableHeaderCellProps): ReactElement {
	const className = isNumeric ? "is-num" : undefined;
	if (!isSortable || !onSortChange) {
		return (
			<th scope="col" className={className}>
				{header}
			</th>
		);
	}
	const isActive = sort?.columnKey === columnKey;
	const ariaSort = isActive ? sort.direction : "none";
	return (
		<th scope="col" className={className} aria-sort={ariaSort}>
			<button type="button" onClick={() => onSortChange(nextSort(sort, columnKey))}>
				{header}
				<Icon name={isActive ? "sort" : "sort-both"} size="sm" className="ck-sort-icon" />
			</button>
		</th>
	);
}

export function Table<Row>({
	caption,
	isCaptionHidden = false,
	columns,
	rows,
	getRowKey,
	sort,
	onSortChange,
}: TableProps<Row>): ReactElement {
	return (
		<div className="ck-table-wrap">
			<table className="ck-table">
				<caption className={isCaptionHidden ? "ck-sr-only" : undefined}>{caption}</caption>
				<thead>
					<tr>
						{columns.map((column) => (
							<TableHeaderCell
								key={column.key}
								header={column.header}
								columnKey={column.key}
								isSortable={column.isSortable ?? false}
								isNumeric={column.isNumeric ?? false}
								sort={sort}
								onSortChange={onSortChange}
							/>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={getRowKey(row)}>
							{columns.map((column) => (
								<td key={column.key} className={column.isNumeric ? "is-num" : undefined}>
									{column.render(row)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
