import type { ReactElement } from "react";

// 图标：24 网格、线宽 1.75、圆角端点、颜色继承文字（COMPONENTS.md §1.3）。
// 只放组件库自己用到的图标；新增图标前先确认真的需要（YAGNI）。

const ICON_PATHS = {
	building: ["M4 21V5h10v16", "M14 11h6v10", "M8 9h2M8 13h2M8 17h2M17 15h.01M17 18h.01", "M2 21h20"],
	history: ["M3 11a9 9 0 1 1 2.5 7", "M3 4v7h7", "M12 7v5l3 2"],
	search: ["M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z", "M20 20l-4.8-4.8"],
	close: ["M6 6l12 12", "M18 6L6 18"],
	"chevron-down": ["M6 9l6 6 6-6"],
	"chevron-left": ["M15 6l-6 6 6 6"],
	"chevron-right": ["M9 6l6 6-6 6"],
	check: ["M5 12.5l4.5 4.5L19 7.5"],
	info: ["M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z", "M12 11v5", "M12 7.5h.01"],
	success: ["M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z", "M8 12.5l2.7 2.7L16 9.8"],
	warning: ["M12 3.5l9.5 16.5h-19z", "M12 10v4.5", "M12 17.5h.01"],
	danger: ["M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z", "M12 7.5v5.5", "M12 16.5h.01"],
	sort: ["M12 5v14", "M7 14l5 5 5-5"],
	"sort-both": ["M8 9l4-4 4 4", "M8 15l4 4 4-4"],
	more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
	menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
	empty: ["M4 13l2.5-7h11l2.5 7", "M4 13v6h16v-6", "M4 13h5l1 2h4l1-2h5"],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICON_PATHS;
export type IconSize = "sm" | "md" | "lg";

export interface IconProps {
	name: IconName;
	size?: IconSize;
	/** 额外的 ck- 类，例如排序方向用的 `ck-sort-icon`、下拉的 `ck-chevron`。 */
	className?: string;
}

/** 装饰性图标：永远 `aria-hidden`；需要可访问名称时由外层按钮的 `aria-label` 或文字提供。 */
export function Icon({ name, size = "md", className }: IconProps): ReactElement {
	const classes = ["ck-icon", size === "md" ? "" : `ck-icon--${size}`, className ?? ""].filter(Boolean).join(" ");
	return (
		<svg className={classes} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			{ICON_PATHS[name].map((path) => (
				<path key={path} d={path} />
			))}
		</svg>
	);
}
