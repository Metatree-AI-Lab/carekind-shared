import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactElement,
	type ReactNode,
} from "react";
import { Icon, type IconName } from "./icon.tsx";

// COMPONENTS.md §11.2。成功 / 信息至少显示 8 秒后自动消失，悬停或聚焦时暂停；
// 错误、提醒和带操作的 Toast 不自动消失。最多同时 3 个，新的在下方。

export type ToastVariant = "success" | "info" | "warning" | "danger";

export interface ToastInput {
	variant: ToastVariant;
	title: string;
	description?: string;
	/** 最多一个操作，例如 Undo。 */
	action?: { label: string; onAction: () => void };
}

interface ToastItem extends ToastInput {
	id: number;
}

export interface ToastApi {
	/** 显示一个 Toast，返回 id。 */
	showToast: (toast: ToastInput) => number;
	dismissToast: (id: number) => void;
}

export const TOAST_MIN_VISIBLE_MS: number = 8000;
const MAX_VISIBLE_TOASTS = 3;

const TOAST_ICONS: Record<ToastVariant, IconName> = {
	success: "success",
	info: "info",
	warning: "warning",
	danger: "danger",
};

const ToastContext = createContext<ToastApi | null>(null);

function isAutoDismissed(toast: ToastInput): boolean {
	return (toast.variant === "success" || toast.variant === "info") && !toast.action;
}

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }): ReactElement {
	const remainingMs = useRef(TOAST_MIN_VISIBLE_MS);
	const startedAt = useRef(0);
	const [isPaused, setIsPaused] = useState(false);
	const autoDismiss = isAutoDismissed(toast);

	// 暂停时记下剩余时间，恢复后只等剩余部分（"离开后继续剩余时间"）。
	useEffect(() => {
		if (!autoDismiss || isPaused) return undefined;
		startedAt.current = Date.now();
		const timer = window.setTimeout(() => onDismiss(toast.id), remainingMs.current);
		return () => {
			window.clearTimeout(timer);
			remainingMs.current -= Date.now() - startedAt.current;
		};
	}, [autoDismiss, isPaused, onDismiss, toast.id]);

	return (
		<div
			className={`ck-toast ck-toast--${toast.variant}`}
			role={toast.variant === "danger" ? "alert" : "status"}
			onMouseEnter={() => setIsPaused(true)}
			onMouseLeave={() => setIsPaused(false)}
			onFocus={() => setIsPaused(true)}
			onBlur={() => setIsPaused(false)}
		>
			<Icon name={TOAST_ICONS[toast.variant]} />
			<div className="ck-toast-body">
				<strong className="ck-toast-title">{toast.title}</strong>
				{toast.description ? <span>{toast.description}</span> : null}
			</div>
			{toast.action ? (
				<button
					type="button"
					className="ck-toast-action"
					onClick={() => {
						toast.action?.onAction();
						onDismiss(toast.id);
					}}
				>
					{toast.action.label}
				</button>
			) : null}
			<button type="button" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>
				<Icon name="close" size="sm" />
			</button>
		</div>
	);
}

export function ToastProvider({ children }: { children: ReactNode }): ReactElement {
	const [toasts, setToasts] = useState<ToastItem[]>([]);
	const nextId = useRef(1);

	const dismissToast = useCallback((id: number): void => {
		setToasts((current) => current.filter((toast) => toast.id !== id));
	}, []);

	const showToast = useCallback((toast: ToastInput): number => {
		const id = nextId.current;
		nextId.current += 1;
		setToasts((current) => [...current, { ...toast, id }].slice(-MAX_VISIBLE_TOASTS));
		return id;
	}, []);

	const api = useMemo<ToastApi>(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

	return (
		<ToastContext.Provider value={api}>
			{children}
			<div className="ck-toast-region">
				{toasts.map((toast) => (
					<ToastView key={toast.id} toast={toast} onDismiss={dismissToast} />
				))}
			</div>
		</ToastContext.Provider>
	);
}

/** 在 ToastProvider 内使用。 */
export function useToast(): ToastApi {
	const api = useContext(ToastContext);
	if (!api) throw new Error("useToast must be used inside <ToastProvider>.");
	return api;
}
