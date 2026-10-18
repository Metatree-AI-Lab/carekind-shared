import { z } from "zod";

// 所有实体 ID 都是 UUID 字符串（ADR-0006）；不用自增数字，避免跨租户猜测 ID。
export const IdSchema = z.uuid();
export type Id = z.infer<typeof IdSchema>;

// 时间点一律用带时区偏移的 ISO 8601 字符串存储和传输；界面显示 DD/MM/YYYY 用 src/format/。
export const IsoDateTimeSchema = z.iso.datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

// 只有日期、没有时间的字段（出生日期、合同生效日、start day）用 YYYY-MM-DD。
export const IsoDateSchema = z.iso.date();
export type IsoDate = z.infer<typeof IsoDateSchema>;

export const AUSTRALIAN_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
export const AustralianStateSchema = z.enum(AUSTRALIAN_STATES);
export type AustralianState = z.infer<typeof AustralianStateSchema>;

export const EmailSchema = z.email().max(254);
export type Email = z.infer<typeof EmailSchema>;

/** 显示用的人名（员工、联系人）。不是匹配键：住户匹配永远不能只靠姓名（Provider Portal PRD §4.5）。 */
export const PersonNameSchema = z.string().trim().min(1).max(120);
export type PersonName = z.infer<typeof PersonNameSchema>;

/**
 * 管理员填写的"原因"类文本（改配置、停用、转院等）。
 * 输入框下方必须提示 "Do not enter resident or health information"（Super Admin PRD §4-F）。
 */
export const ReasonTextSchema = z.string().trim().min(3).max(500);
export type ReasonText = z.infer<typeof ReasonTextSchema>;

/** 外部系统引用：只写系统名和编号（例如 "Contract register #C-0012"），不存文件、不存带令牌的链接。 */
export const ExternalRefSchema = z
	.string()
	.trim()
	.min(1)
	.max(200)
	.refine((value) => !/https?:\/\/\S*[?&](token|sig|signature|key)=/i.test(value), {
		message: "External references must not contain access tokens.",
	});
export type ExternalRef = z.infer<typeof ExternalRefSchema>;

export const PostcodeSchema = z.string().regex(/^\d{4}$/, "Australian postcodes have 4 digits.");

export const AddressSchema = z.object({
	line1: z.string().trim().min(1).max(200),
	line2: z.string().trim().max(200).nullable(),
	suburb: z.string().trim().min(1).max(100),
	state: AustralianStateSchema,
	postcode: PostcodeSchema,
});
export type Address = z.infer<typeof AddressSchema>;

/** 列表接口的分页参数：游标分页，避免大表 offset 扫描（API p95 ≤ 500 ms 目标）。 */
export const PageQuerySchema = z.object({
	cursor: z.string().min(1).max(200).optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type PageQuery = z.infer<typeof PageQuerySchema>;

/** 生成某个实体的分页列表 schema。 */
export function pageOf<ItemSchema extends z.ZodType>(
	itemSchema: ItemSchema,
): z.ZodObject<{ items: z.ZodArray<ItemSchema>; nextCursor: z.ZodNullable<z.ZodString> }> {
	return z.object({
		items: z.array(itemSchema),
		nextCursor: z.string().nullable(),
	});
}

/** 统一的"只回一个确认"响应（登出、撤销等）。 */
export const AcknowledgementSchema = z.object({ ok: z.literal(true) });
export type Acknowledgement = z.infer<typeof AcknowledgementSchema>;
