import type { ReactElement, ReactNode } from "react";
import { Icon, type IconName } from "./icon.tsx";

// COMPONENTS.md §10（Tag、Card）、§11.4（Alert）、§12（Spinner、EmptyState）。
// 状态都有文字或图标，颜色不是唯一的信息来源。

export type StatusVariant = "neutral" | "success" | "info" | "warning" | "danger";

export interface TagProps {
	variant?: StatusVariant;
	/** 小圆点必须配文字。 */
	hasDot?: boolean;
	children: ReactNode;
}

/** 状态标签（不可点击）。 */
export function Tag({ variant = "neutral", hasDot = false, children }: TagProps): ReactElement {
	const variantClass = variant === "neutral" ? "" : ` ck-tag--${variant}`;
	return (
		<span className={`ck-tag${variantClass}`}>
			{hasDot ? (
				<span className={variant === "neutral" ? "ck-dot" : `ck-dot ck-dot--${variant}`} aria-hidden="true" />
			) : null}
			{children}
		</span>
	);
}

export interface CardProps {
	title?: string;
	/** 标题层级，默认 h2。 */
	headingLevel?: 2 | 3;
	children: ReactNode;
}

export function Card({ title, headingLevel = 2, children }: CardProps): ReactElement {
	const Heading = headingLevel === 2 ? "h2" : "h3";
	return (
		<section className="ck-card">
			{title ? <Heading className="ck-card-title">{title}</Heading> : null}
			{children}
		</section>
	);
}

const ALERT_ICONS: Record<Exclude<StatusVariant, "neutral">, IconName> = {
	success: "success",
	info: "info",
	warning: "warning",
	danger: "danger",
};

export interface AlertProps {
	variant: Exclude<StatusVariant, "neutral">;
	title: string;
	children?: ReactNode;
	/** 操作后出现的提示要播报：错误 `role="alert"`，其他 `role="status"`。页面加载时就存在的提示不需要。 */
	isAnnounced?: boolean;
}

export function Alert({ variant, title, children, isAnnounced = false }: AlertProps): ReactElement {
	const role = isAnnounced ? (variant === "danger" ? "alert" : "status") : undefined;
	return (
		<div className={`ck-alert ck-alert--${variant}`} role={role}>
			<Icon name={ALERT_ICONS[variant]} />
			<div>
				<strong className="ck-alert-title">{title}</strong>
				{children}
			</div>
		</div>
	);
}

export interface SpinnerProps {
	/** 有 label 时作为 `role="status"` 播报；放在带文字的按钮里时不写。 */
	label?: string;
}

export function Spinner({ label }: SpinnerProps): ReactElement {
	if (!label) return <span className="ck-spinner" aria-hidden="true" />;
	return <span className="ck-spinner" role="status" aria-label={label} />;
}

export interface EmptyStateProps {
	/** 说明现在是什么情况，例如 "No staff yet"；不用 "暂无数据" 这类模糊说法。 */
	title: string;
	/** 一句话说明为什么 / 接下来会怎样。 */
	body?: string;
	/** 最多一个主操作。 */
	action?: ReactNode;
	headingLevel?: 2 | 3;
}

export function EmptyState({ title, body, action, headingLevel = 2 }: EmptyStateProps): ReactElement {
	const Heading = headingLevel === 2 ? "h2" : "h3";
	return (
		<div className="ck-empty">
			<Icon name="empty" />
			<Heading className="ck-empty-title">{title}</Heading>
			{body ? <p className="ck-empty-body">{body}</p> : null}
			{action ?? null}
		</div>
	);
}
