import { useId, useRef, type KeyboardEvent, type ReactElement, type ReactNode } from "react";

// COMPONENTS.md §9 标签页：role tablist / tab / tabpanel；←→ 移动并切换，Home / End；
// 漫游 tabindex（只有选中的 tab 可 Tab 到）。受控组件。

export interface TabItem {
	id: string;
	label: string;
	panel: ReactNode;
}

export interface TabsProps {
	/** tablist 的可访问名称，例如 "Provider details"。 */
	label: string;
	tabs: readonly TabItem[];
	selectedId: string;
	onSelect: (id: string) => void;
}

function targetIndex(key: string, current: number, count: number): number | null {
	if (key === "ArrowRight") return (current + 1) % count;
	if (key === "ArrowLeft") return (current - 1 + count) % count;
	if (key === "Home") return 0;
	if (key === "End") return count - 1;
	return null;
}

export function Tabs({ label, tabs, selectedId, onSelect }: TabsProps): ReactElement {
	const baseId = useId();
	const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const selectedIndex = Math.max(
		0,
		tabs.findIndex((tab) => tab.id === selectedId),
	);

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
		const next = targetIndex(event.key, selectedIndex, tabs.length);
		const nextTab = next === null ? undefined : tabs[next];
		if (next === null || !nextTab) return;
		event.preventDefault();
		onSelect(nextTab.id);
		tabRefs.current[next]?.focus();
	}

	const selectedTab = tabs[selectedIndex];
	return (
		<div>
			<div className="ck-tablist" role="tablist" aria-label={label} onKeyDown={handleKeyDown}>
				{tabs.map((tab, index) => {
					const isSelected = index === selectedIndex;
					return (
						<button
							key={tab.id}
							ref={(element) => {
								tabRefs.current[index] = element;
							}}
							type="button"
							role="tab"
							id={`${baseId}-tab-${tab.id}`}
							className="ck-tab"
							aria-selected={isSelected}
							aria-controls={`${baseId}-panel`}
							tabIndex={isSelected ? 0 : -1}
							onClick={() => onSelect(tab.id)}
						>
							{tab.label}
						</button>
					);
				})}
			</div>
			{selectedTab ? (
				<div
					className="ck-tabpanel"
					role="tabpanel"
					id={`${baseId}-panel`}
					aria-labelledby={`${baseId}-tab-${selectedTab.id}`}
					tabIndex={0}
				>
					{selectedTab.panel}
				</div>
			) : null}
		</div>
	);
}
