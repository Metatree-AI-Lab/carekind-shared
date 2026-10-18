import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./common.ts";

// 看板指标（Provider Portal PRD §4.7、Super Admin PRD §4-O）。
// 每项必须带测量口径；Demo 数据必须带 isSample。不做员工个人排名、风险评分、"节省时间"类数字（护栏 G10）。

export const PORTAL_METRIC_KEYS = [
	"ActiveStaff",
	"DictationVolume",
	"ConfirmationTimeliness",
	"Tier3ConfirmationTime",
	"GoLiveChecklistCompletion",
] as const;

export const SUPER_ADMIN_METRIC_KEYS = [
	"TenantCount",
	"ActiveUsers",
	"DraftVolume",
	"ConfirmationRate",
	"ExportSuccessRate",
	"ErrorRate",
] as const;

export const DashboardMetricKeySchema = z.enum([...PORTAL_METRIC_KEYS, ...SUPER_ADMIN_METRIC_KEYS]);
export type DashboardMetricKey = z.infer<typeof DashboardMetricKeySchema>;

/**
 * 指标值。没有数据时用 NoData（界面显示 "No data yet"），不能用 0 或假数据填充；
 * 少于最小人数时用 Suppressed（界面显示 "Fewer than 5"），防止推断到个人。
 */
export const MetricValueSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("Count"), value: z.number().int().min(0) }),
	z.object({
		kind: z.literal("Ratio"),
		numerator: z.number().int().min(0),
		denominator: z.number().int().min(1),
	}),
	z.object({
		kind: z.literal("Duration"),
		medianMinutes: z.number().min(0),
		p90Minutes: z.number().min(0),
		meanMinutes: z.number().min(0).nullable(),
	}),
	z.object({ kind: z.literal("Suppressed"), minimumGroupSize: z.number().int().min(2) }),
	z.object({ kind: z.literal("NoData") }),
]);
export type MetricValue = z.infer<typeof MetricValueSchema>;

/** 指标粒度：最小到 Unit / Facility，从不到个人。 */
export const MetricScopeSchema = z.discriminatedUnion("level", [
	z.object({ level: z.literal("Platform") }),
	z.object({ level: z.literal("Provider"), providerId: IdSchema }),
	z.object({ level: z.literal("Region"), providerId: IdSchema, regionId: IdSchema }),
	z.object({ level: z.literal("Facility"), providerId: IdSchema, facilityId: IdSchema }),
	z.object({ level: z.literal("Unit"), providerId: IdSchema, facilityId: IdSchema, unitId: IdSchema }),
]);
export type MetricScope = z.infer<typeof MetricScopeSchema>;

export const DashboardMetricSchema = z.object({
	key: DashboardMetricKeySchema,
	label: z.string().min(1).max(120),
	scope: MetricScopeSchema,
	periodStart: IsoDateTimeSchema,
	periodEnd: IsoDateTimeSchema,
	value: MetricValueSchema,
	/** "How this is measured" 显示的口径说明，必填。 */
	measurementMethod: z.string().trim().min(10).max(600),
	/** true = 预生成的 Demo 示例（界面标 "Pre-generated sample"），不是真实使用数据。 */
	isSample: z.boolean(),
	updatedAt: IsoDateTimeSchema,
	/** 分项（例如按 Tier 分开的确认时长）；分项同样遵守最小人数规则。 */
	breakdown: z.array(z.object({ label: z.string().min(1).max(80), value: MetricValueSchema })),
});
export type DashboardMetric = z.infer<typeof DashboardMetricSchema>;
