import { useEffect, useRef, type InputHTMLAttributes, type ReactElement, type ReactNode } from "react";

// COMPONENTS.md §7。复选框在提交时生效；开关立即生效，旁边文字写出当前状态。

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "style" | "className"> {
	/** 可见文字；表格行选择等场景可传空字符串并用 `aria-label`。 */
	label: ReactNode;
	/** 半选（部分已选的父项）。 */
	isIndeterminate?: boolean;
}

export function Checkbox({ label, isIndeterminate = false, ...rest }: CheckboxProps): ReactElement {
	const inputRef = useRef<HTMLInputElement>(null);
	// indeterminate 只能通过 DOM 属性设置，不能写成 HTML 属性。
	useEffect(() => {
		if (inputRef.current) inputRef.current.indeterminate = isIndeterminate;
	}, [isIndeterminate]);
	return (
		<label className="ck-check">
			<input {...rest} ref={inputRef} type="checkbox" />
			{label === "" ? null : <span>{label}</span>}
		</label>
	);
}

export interface SwitchProps {
	label: string;
	isOn: boolean;
	onChange: (isOn: boolean) => void;
	isDisabled?: boolean;
	/** 状态文字，默认 "On" / "Off"。 */
	onText?: string;
	offText?: string;
}

/** `button role="switch"`；文字写 "Auto-save drafts: On"，不只靠滑块位置和颜色。 */
export function Switch({
	label,
	isOn,
	onChange,
	isDisabled = false,
	onText = "On",
	offText = "Off",
}: SwitchProps): ReactElement {
	return (
		<button
			type="button"
			role="switch"
			className="ck-switch"
			aria-checked={isOn}
			disabled={isDisabled}
			onClick={() => onChange(!isOn)}
		>
			<span className="ck-switch-track" aria-hidden="true">
				<span className="ck-switch-thumb" />
			</span>
			<span>
				{label}: {isOn ? onText : offText}
			</span>
		</button>
	);
}
