import { useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes } from "react";
import { Icon } from "./icon.tsx";

// COMPONENTS.md §4、§5。标签永远可见（搜索框可视觉隐藏但仍有 <label>）；
// 错误用 aria-invalid + aria-describedby 关联，说明怎么改。

export interface FieldControlProps {
	id: string;
	"aria-describedby"?: string;
	"aria-invalid"?: true;
}

export interface FieldProps {
	/** 一般是纯文字；名称确认对话框需要把名称放进 `ck-confirm-phrase`，所以允许节点。 */
	label: ReactNode;
	hint?: string;
	error?: string;
	/** 可选字段在标签后写 "(optional)"；必填字段不加星号。 */
	isOptional?: boolean;
	/** 只用于搜索框等标签可视觉隐藏的场景。 */
	isLabelHidden?: boolean;
	/** 把 id 和 aria 属性交给真正的输入控件。 */
	children: (control: FieldControlProps) => ReactNode;
}

export function Field({
	label,
	hint,
	error,
	isOptional = false,
	isLabelHidden = false,
	children,
}: FieldProps): ReactElement {
	const id = useId();
	const hintId = hint ? `${id}-hint` : undefined;
	const errorId = error ? `${id}-error` : undefined;
	const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
	return (
		<div className="ck-field">
			<label className={isLabelHidden ? "ck-sr-only" : "ck-label"} htmlFor={id}>
				{label}
				{isOptional ? <span className="ck-optional"> (optional)</span> : null}
			</label>
			{children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
			{hint ? (
				<span className="ck-hint" id={hintId}>
					{hint}
				</span>
			) : null}
			{error ? (
				<span className="ck-error" id={errorId}>
					<Icon name="danger" />
					<span>{error}</span>
				</span>
			) : null}
		</div>
	);
}

type FieldTextProps = Pick<FieldProps, "label" | "hint" | "error" | "isOptional" | "isLabelHidden">;

export interface TextInputProps
	extends FieldTextProps, Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "style" | "className"> {
	/** `search` 显示放大镜图标和药丸形输入框（`ck-input--search`）。 */
	type?: "text" | "email" | "password" | "search" | "tel" | "url" | "number";
}

export function TextInput({
	label,
	hint,
	error,
	isOptional,
	isLabelHidden,
	type = "text",
	...rest
}: TextInputProps): ReactElement {
	const isSearch = type === "search";
	return (
		<Field label={label} hint={hint} error={error} isOptional={isOptional} isLabelHidden={isLabelHidden}>
			{(control) => {
				const input = (
					<input
						{...rest}
						{...control}
						type={type}
						className={isSearch ? "ck-input ck-input--search" : "ck-input"}
					/>
				);
				if (!isSearch) return input;
				return (
					<span className="ck-input-wrap">
						<Icon name="search" />
						{input}
					</span>
				);
			}}
		</Field>
	);
}

export interface SelectOption {
	value: string;
	label: string;
	isDisabled?: boolean;
}

export interface SelectProps
	extends FieldTextProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "style" | "className" | "children"> {
	options: readonly SelectOption[];
}

/** 原生 select（默认选它）：`ck-select-wrap` + `ck-select`。 */
export function Select({ label, hint, error, isOptional, isLabelHidden, options, ...rest }: SelectProps): ReactElement {
	return (
		<Field label={label} hint={hint} error={error} isOptional={isOptional} isLabelHidden={isLabelHidden}>
			{(control) => (
				<span className="ck-select-wrap">
					<select {...rest} {...control} className="ck-select">
						{options.map((option) => (
							<option key={option.value} value={option.value} disabled={option.isDisabled}>
								{option.label}
							</option>
						))}
					</select>
				</span>
			)}
		</Field>
	);
}
