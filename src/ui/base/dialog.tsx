import {
	useEffect,
	useId,
	useRef,
	type KeyboardEvent,
	type MouseEvent,
	type ReactElement,
	type ReactNode,
	type RefObject,
} from "react";
import { Icon, type IconName } from "./icon.tsx";

// COMPONENTS.md §11.3。原生 dialog + showModal()（背景不可操作）；另外自己把 Tab 限制在对话框内，
// 并处理 Esc，这样行为不依赖各浏览器对 dialog 的实现差异。关闭后焦点回到打开前的元素。
// 受控组件：Esc / 遮罩 / 关闭按钮只调用 onClose，由调用方决定是否真的关闭（例如有未保存输入时先确认）。

const FOCUSABLE_SELECTOR = [
	"a[href]",
	"button:not([disabled])",
	"input:not([disabled]):not([type='hidden'])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	"[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

function openNativeDialog(dialog: HTMLDialogElement): void {
	if (dialog.open) return;
	// jsdom 等环境没有 showModal：退回到 open 属性，焦点限制仍由下面的 Tab 处理保证。
	if (typeof dialog.showModal === "function") dialog.showModal();
	else dialog.setAttribute("open", "");
}

function closeNativeDialog(dialog: HTMLDialogElement): void {
	if (typeof dialog.close === "function") dialog.close();
	else dialog.removeAttribute("open");
}

export interface DialogProps {
	isOpen: boolean;
	/** Esc、点遮罩、关闭按钮都会调用它。 */
	onClose: () => void;
	/** 问题形式："Discard this draft?" */
	title: string;
	titleIcon?: IconName;
	/** 说明后果，关联到 aria-describedby。 */
	description?: ReactNode;
	children?: ReactNode;
	/** 底部按钮：安全选项在左，主操作在右。 */
	footer: ReactNode;
	size?: "sm" | "md";
	/** 确认类对话框聚焦最安全的选项；表单对话框聚焦第一个输入框。不写时聚焦第一个可聚焦元素。 */
	initialFocusRef?: RefObject<HTMLElement | null>;
	/** 有输入时设为 false，避免点遮罩丢失内容。 */
	isClosedOnBackdrop?: boolean;
	/** 额外的 ck- 变体类，例如 `ck-dialog--confirm-name`。 */
	variantClassName?: string;
}

export function Dialog({
	isOpen,
	onClose,
	title,
	titleIcon,
	description,
	children,
	footer,
	size = "sm",
	initialFocusRef,
	isClosedOnBackdrop = true,
	variantClassName,
}: DialogProps): ReactElement {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const pressStartedOnBackdrop = useRef(false);
	const titleId = useId();
	const descriptionId = useId();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog || !isOpen) return undefined;
		const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		openNativeDialog(dialog);
		const initial = initialFocusRef?.current ?? focusableElements(dialog)[0] ?? dialog;
		initial.focus();
		return () => {
			closeNativeDialog(dialog);
			previouslyFocused?.focus();
		};
	}, [isOpen, initialFocusRef]);

	function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>): void {
		if (event.key === "Escape") {
			event.preventDefault();
			onClose();
			return;
		}
		if (event.key !== "Tab" || !dialogRef.current) return;
		const elements = focusableElements(dialogRef.current);
		const first = elements[0];
		const last = elements[elements.length - 1];
		if (!first || !last) return;
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	// 只有按下和松开都在遮罩上才算点遮罩，避免在输入框里拖选文字时误关。
	function handleMouseDown(event: MouseEvent<HTMLDialogElement>): void {
		pressStartedOnBackdrop.current = event.target === event.currentTarget;
	}
	function handleClick(event: MouseEvent<HTMLDialogElement>): void {
		if (isClosedOnBackdrop && pressStartedOnBackdrop.current && event.target === event.currentTarget) onClose();
	}

	const classes = ["ck-dialog", size === "md" ? "ck-dialog--md" : "", variantClassName ?? ""]
		.filter(Boolean)
		.join(" ");
	return (
		<dialog
			ref={dialogRef}
			className={classes}
			aria-labelledby={titleId}
			aria-describedby={description ? descriptionId : undefined}
			onKeyDown={handleKeyDown}
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
			onMouseDown={handleMouseDown}
			onClick={handleClick}
		>
			{isOpen ? (
				<>
					<div className="ck-dialog-header">
						<h2 className="ck-dialog-title" id={titleId}>
							{titleIcon ? <Icon name={titleIcon} /> : null}
							{title}
						</h2>
					</div>
					<div className="ck-dialog-body">
						{description ? <div id={descriptionId}>{description}</div> : null}
						{children}
					</div>
					<div className="ck-dialog-footer">{footer}</div>
				</>
			) : null}
		</dialog>
	);
}
