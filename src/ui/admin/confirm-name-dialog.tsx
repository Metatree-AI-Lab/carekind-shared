import { useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import { Button } from "../base/button.tsx";
import { Dialog } from "../base/dialog.tsx";
import { Field } from "../base/field.tsx";

// COMPONENTS.md §12A.10：后果严重且难以撤销的操作（暂停 / 终止租户、发布州规则包）。
// 名称匹配：去掉首尾空格后区分大小写完全一致；允许粘贴。最终按钮保持可点，不匹配时显示行内错误、不提交。
// 在确认字段里按 Enter 不提交；初始焦点在原因字段；有输入，点遮罩不关闭。

/** 名称匹配规则（只定义一次）。 */
export function isConfirmNameMatch(typed: string, expectedName: string): boolean {
	return typed.trim() === expectedName;
}

export interface ConfirmNameDialogProps {
	isOpen: boolean;
	onClose: () => void;
	/** "Suspend Wattle Grove Care Group?" */
	title: string;
	/** 谁会受影响、多少人、能否恢复、恢复方式。 */
	consequences: readonly ReactNode[];
	/** 需要输入的名称，例如 "Wattle Grove Care Group"。 */
	confirmName: string;
	/** 安全选项，例如 "Keep tenant active"。 */
	cancelLabel: string;
	/** 最终按钮，例如 "Suspend tenant"。 */
	confirmLabel: string;
	/** 提交中文字，例如 "Suspending…"。 */
	pendingLabel: string;
	isSubmitting?: boolean;
	reasonLabel?: string;
	/** 原因写入审计日志；名称匹配且原因非空时才调用。 */
	onConfirm: (input: { reason: string }) => void;
}

export function ConfirmNameDialog(props: ConfirmNameDialogProps): ReactElement {
	const reasonRef = useRef<HTMLTextAreaElement>(null);
	const [reason, setReason] = useState("");
	const [typedName, setTypedName] = useState("");
	const [reasonError, setReasonError] = useState<string | undefined>();
	const [nameError, setNameError] = useState<string | undefined>();

	function resetAndClose(): void {
		setReason("");
		setTypedName("");
		setReasonError(undefined);
		setNameError(undefined);
		props.onClose();
	}

	function handleConfirm(): void {
		const trimmedReason = reason.trim();
		const isNameMatched = isConfirmNameMatch(typedName, props.confirmName);
		setReasonError(trimmedReason ? undefined : "Enter a reason. It is recorded in the audit log.");
		setNameError(isNameMatched ? undefined : `The name doesn't match. Type ${props.confirmName} exactly.`);
		if (!trimmedReason || !isNameMatched) return;
		props.onConfirm({ reason: trimmedReason });
	}

	function blockEnter(event: KeyboardEvent<HTMLInputElement>): void {
		if (event.key === "Enter") event.preventDefault();
	}

	const hasInput = reason !== "" || typedName !== "";
	return (
		<Dialog
			isOpen={props.isOpen}
			onClose={resetAndClose}
			title={props.title}
			titleIcon="warning"
			variantClassName="ck-dialog--confirm-name"
			size="md"
			initialFocusRef={reasonRef}
			isClosedOnBackdrop={!hasInput}
			description={
				<ul className="ck-confirm-consequences">
					{props.consequences.map((consequence, index) => (
						<li key={index}>{consequence}</li>
					))}
				</ul>
			}
			footer={
				<>
					<Button onClick={resetAndClose}>{props.cancelLabel}</Button>
					<Button
						variant="danger-solid"
						isLoading={props.isSubmitting}
						loadingText={props.pendingLabel}
						onClick={handleConfirm}
					>
						{props.confirmLabel}
					</Button>
				</>
			}
		>
			<Field label={props.reasonLabel ?? "Reason (recorded in the audit log)"} error={reasonError}>
				{(control) => (
					<textarea
						{...control}
						ref={reasonRef}
						className="ck-textarea"
						value={reason}
						onChange={(event) => setReason(event.target.value)}
					/>
				)}
			</Field>
			<Field
				label={
					<>
						Type <span className="ck-confirm-phrase">{props.confirmName}</span> to confirm
					</>
				}
				error={nameError}
			>
				{(control) => (
					<input
						{...control}
						className="ck-input"
						autoComplete="off"
						value={typedName}
						onChange={(event) => setTypedName(event.target.value)}
						onKeyDown={blockEnter}
					/>
				)}
			</Field>
		</Dialog>
	);
}
