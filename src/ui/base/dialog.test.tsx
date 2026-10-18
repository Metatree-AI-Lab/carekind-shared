// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button.tsx";
import { Dialog } from "./dialog.tsx";

afterEach(cleanup);

function Harness({ onClose }: { onClose?: () => void }): ReactElement {
	const [isOpen, setIsOpen] = useState(false);
	const keepRef = useRef<HTMLButtonElement>(null);
	function close(): void {
		onClose?.();
		setIsOpen(false);
	}
	return (
		<>
			<Button onClick={() => setIsOpen(true)}>Suspend Banksia Park Aged Care</Button>
			<Dialog
				isOpen={isOpen}
				onClose={close}
				title="Suspend Banksia Park Aged Care?"
				description="Staff at this fictional facility can still view and export records."
				initialFocusRef={keepRef}
				footer={
					<>
						<button ref={keepRef} type="button" onClick={close}>
							Keep facility active
						</button>
						<button type="button">Suspend facility</button>
					</>
				}
			/>
		</>
	);
}

function openDialog(): HTMLElement {
	const trigger = screen.getByRole("button", { name: "Suspend Banksia Park Aged Care" });
	trigger.focus();
	fireEvent.click(trigger);
	return trigger;
}

describe("Dialog", () => {
	it("focuses the safest option first and labels the dialog by its title", () => {
		render(<Harness />);
		openDialog();
		expect(document.activeElement).toBe(screen.getByText("Keep facility active"));
		const dialog = document.querySelector("dialog");
		const titleId = dialog?.getAttribute("aria-labelledby") ?? "";
		expect(document.getElementById(titleId)?.textContent).toBe("Suspend Banksia Park Aged Care?");
		expect(dialog?.getAttribute("aria-describedby")).toBeTruthy();
	});

	it("keeps Tab focus inside the dialog in both directions", () => {
		render(<Harness />);
		openDialog();
		const keep = screen.getByText("Keep facility active");
		const suspend = screen.getByText("Suspend facility");
		suspend.focus();
		fireEvent.keyDown(suspend, { key: "Tab" });
		expect(document.activeElement).toBe(keep);
		fireEvent.keyDown(keep, { key: "Tab", shiftKey: true });
		expect(document.activeElement).toBe(suspend);
	});

	it("closes on Escape and returns focus to the trigger", () => {
		const onClose = vi.fn();
		render(<Harness onClose={onClose} />);
		const trigger = openDialog();
		fireEvent.keyDown(screen.getByText("Keep facility active"), { key: "Escape" });
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(screen.queryByText("Keep facility active")).toBeNull();
		expect(document.activeElement).toBe(trigger);
	});
});
