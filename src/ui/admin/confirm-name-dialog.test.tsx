// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmNameDialog, isConfirmNameMatch } from "./confirm-name-dialog.tsx";

afterEach(cleanup);

const TENANT_NAME = "Wattle Grove Care Group"; // 虚构 Provider

function renderDialog(onConfirm = vi.fn()): ReturnType<typeof vi.fn> {
	render(
		<ConfirmNameDialog
			isOpen
			onClose={vi.fn()}
			title={`Suspend ${TENANT_NAME}?`}
			consequences={["Staff at 3 fictional facilities can only view and export records."]}
			confirmName={TENANT_NAME}
			cancelLabel="Keep tenant active"
			confirmLabel="Suspend tenant"
			pendingLabel="Suspending…"
			onConfirm={onConfirm}
		/>,
	);
	return onConfirm;
}

function nameInput(): HTMLElement {
	return screen.getByRole("textbox", { name: `Type ${TENANT_NAME} to confirm` });
}

describe("isConfirmNameMatch", () => {
	it("ignores surrounding spaces but is case-sensitive", () => {
		expect(isConfirmNameMatch(`  ${TENANT_NAME} `, TENANT_NAME)).toBe(true);
		expect(isConfirmNameMatch("wattle grove care group", TENANT_NAME)).toBe(false);
		expect(isConfirmNameMatch("Wattle Grove", TENANT_NAME)).toBe(false);
	});
});

describe("ConfirmNameDialog", () => {
	it("starts with focus on the reason field", () => {
		renderDialog();
		expect(document.activeElement).toBe(screen.getByRole("textbox", { name: /Reason/ }));
	});

	it("does not submit when the name does not match and explains how to fix it", () => {
		const onConfirm = renderDialog();
		fireEvent.change(screen.getByRole("textbox", { name: /Reason/ }), {
			target: { value: "Contract ended (fictional)" },
		});
		fireEvent.change(nameInput(), { target: { value: "wattle grove care group" } });
		fireEvent.click(screen.getByRole("button", { name: "Suspend tenant" }));
		expect(onConfirm).not.toHaveBeenCalled();
		expect(screen.getByText(`The name doesn't match. Type ${TENANT_NAME} exactly.`)).toBeTruthy();
		expect(nameInput().getAttribute("aria-invalid")).toBe("true");
	});

	it("requires a reason even when the name matches", () => {
		const onConfirm = renderDialog();
		fireEvent.change(nameInput(), { target: { value: TENANT_NAME } });
		fireEvent.click(screen.getByRole("button", { name: "Suspend tenant" }));
		expect(onConfirm).not.toHaveBeenCalled();
		expect(screen.getByText("Enter a reason. It is recorded in the audit log.")).toBeTruthy();
	});

	it("submits the trimmed reason when the name matches exactly", () => {
		const onConfirm = renderDialog();
		fireEvent.change(screen.getByRole("textbox", { name: /Reason/ }), {
			target: { value: "  Contract ended (fictional) " },
		});
		fireEvent.change(nameInput(), { target: { value: ` ${TENANT_NAME}` } });
		fireEvent.click(screen.getByRole("button", { name: "Suspend tenant" }));
		expect(onConfirm).toHaveBeenCalledWith({ reason: "Contract ended (fictional)" });
	});
});
