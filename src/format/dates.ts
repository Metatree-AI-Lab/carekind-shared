// 界面日期一律显示 DD/MM/YYYY（AGENTS.md 写作规则：对外内容用澳式格式）。
// 存储和传输用 ISO 字符串（src/schemas/common.ts）；只在显示时转换。

/** 默认显示时区。Wattle Grove 的三家院（Melbourne、Geelong、Albury）都在这个时区。 */
export const DEFAULT_TIME_ZONE: string = "Australia/Melbourne";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const AU_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function partsInZone(value: Date, timeZone: string): Record<string, string> {
	const formatter = new Intl.DateTimeFormat("en-AU", {
		timeZone,
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	});
	const parts: Record<string, string> = {};
	for (const part of formatter.formatToParts(value)) parts[part.type] = part.value;
	return parts;
}

function parseInstant(isoDateTime: string): Date {
	const instant = new Date(isoDateTime);
	if (Number.isNaN(instant.getTime())) throw new RangeError(`Not a valid ISO date-time: ${isoDateTime}`);
	return instant;
}

/**
 * 显示日期 DD/MM/YYYY。
 * - "YYYY-MM-DD"（只有日期，例如出生日期）：直接换位，不做时区换算，避免差一天。
 * - ISO 日期时间：先换算到 timeZone 再取日期。
 */
export function formatDateAu(value: string, timeZone: string = DEFAULT_TIME_ZONE): string {
	const dateOnly = ISO_DATE_PATTERN.exec(value);
	if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
	const parts = partsInZone(parseInstant(value), timeZone);
	return `${parts.day}/${parts.month}/${parts.year}`;
}

/** 显示日期时间 "DD/MM/YYYY HH:mm"（24 小时制，换算到 timeZone）。 */
export function formatDateTimeAu(isoDateTime: string, timeZone: string = DEFAULT_TIME_ZONE): string {
	const parts = partsInZone(parseInstant(isoDateTime), timeZone);
	return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

/** 把用户输入的 DD/MM/YYYY 转成 YYYY-MM-DD；不是真实存在的日期（例如 31/02/2026）时抛出 RangeError。 */
export function parseAuDate(input: string): string {
	const match = AU_DATE_PATTERN.exec(input.trim());
	if (!match) throw new RangeError("Enter the date as DD/MM/YYYY.");
	const [, dayText = "", monthText = "", yearText = ""] = match;
	const day = Number(dayText);
	const month = Number(monthText);
	const year = Number(yearText);
	// 用 UTC 构造再读回，检查日期是否真实存在（例如 2 月 30 日会被滚到 3 月）。
	const candidate = new Date(Date.UTC(year, month - 1, day));
	if (
		candidate.getUTCFullYear() !== year ||
		candidate.getUTCMonth() !== month - 1 ||
		candidate.getUTCDate() !== day
	) {
		throw new RangeError(`${input} is not a real date.`);
	}
	return `${yearText}-${monthText.padStart(2, "0")}-${dayText.padStart(2, "0")}`;
}
