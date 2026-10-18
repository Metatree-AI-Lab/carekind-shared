import type { ButtonHTMLAttributes, MouseEvent, ReactElement, ReactNode } from "react";
import { Icon, type IconName } from "./icon.tsx";

// COMPONENTS.md §3。加载时保留文字、加 aria-busy，并阻止重复点击。

export type ButtonVariant = "primary" | "secondary" | "text" | "danger" | "danger-solid";
export type ButtonSize = "default" | "lg" | "sm";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
	variant?: ButtonVariant;
	/** `sm` 只用于桌面端密集表格。 */
	size?: ButtonSize;
	isLoading?: boolean;
	/** 加载时显示的文字，例如 "Saving…"；不写就保留原文字。 */
	loadingText?: string;
	children: ReactNode;
}

function buttonClassName(variant: ButtonVariant, size: ButtonSize, isLoading: boolean, extra?: string): string {
	return [
		"ck-btn",
		variant === "secondary" ? "" : `ck-btn--${variant}`,
		size === "default" ? "" : `ck-btn--${size}`,
		isLoading ? "is-loading" : "",
		extra ?? "",
	]
		.filter(Boolean)
		.join(" ");
}

export function Button({
	variant = "secondary",
	size = "default",
	isLoading = false,
	loadingText,
	type = "button",
	className,
	onClick,
	children,
	...rest
}: ButtonProps): ReactElement {
	function handleClick(event: MouseEvent<HTMLButtonElement>): void {
		if (isLoading) {
			event.preventDefault();
			return;
		}
		onClick?.(event);
	}
	return (
		<button
			{...rest}
			type={type}
			className={buttonClassName(variant, size, isLoading, className)}
			aria-busy={isLoading || undefined}
			onClick={handleClick}
		>
			{isLoading ? <span className="ck-spinner" aria-hidden="true" /> : null}
			{isLoading && loadingText ? loadingText : children}
		</button>
	);
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style" | "children"> {
	/** 可访问名称（必填），例如 "Close"、"Dismiss notification"。 */
	label: string;
	icon: IconName;
	/** 无边框变体 `ck-icon-btn--plain`。 */
	isPlain?: boolean;
}

export function IconButton({
	label,
	icon,
	isPlain = false,
	type = "button",
	className,
	...rest
}: IconButtonProps): ReactElement {
	const classes = ["ck-icon-btn", isPlain ? "ck-icon-btn--plain" : "", className ?? ""].filter(Boolean).join(" ");
	return (
		<button {...rest} type={type} className={classes} aria-label={label}>
			<Icon name={icon} />
		</button>
	);
}
