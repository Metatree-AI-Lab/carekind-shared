import { z } from "zod";
import { IdSchema, IsoDateTimeSchema, ReasonTextSchema } from "./common.ts";
import { WorkflowConfigSchema, WorkflowItemSchema } from "./workflow-config.ts";

// 配置分层（Super Admin PRD §4-G、Provider Portal PRD §4.6.0）：
//   Layer 0 careKind 硬底线（代码内，src/policy/platform-hard-floor.ts，不是数据）
//   Platform（Layer 1，Super Admin 发布）→ Provider（Layer 2）→ Facility（Layer 3）
// 每层只能比上一层更严；生效值 = 逐层取更严者。

export const CONFIG_LAYERS = ["Platform", "Provider", "Facility"] as const;
export const ConfigLayerSchema = z.enum(CONFIG_LAYERS);
export type ConfigLayer = z.infer<typeof ConfigLayerSchema>;

/** 某一层的位置。Platform 层不属于任何租户。 */
export const ConfigScopeSchema = z.discriminatedUnion("layer", [
	z.object({ layer: z.literal("Platform") }),
	z.object({ layer: z.literal("Provider"), providerId: IdSchema }),
	z.object({ layer: z.literal("Facility"), providerId: IdSchema, facilityId: IdSchema }),
]);
export type ConfigScope = z.infer<typeof ConfigScopeSchema>;

export const CONFIG_VERSION_STATUSES = ["PendingApproval", "Scheduled", "Effective", "Superseded", "Rejected"] as const;
export const ConfigVersionStatusSchema = z.enum(CONFIG_VERSION_STATUSES);
export type ConfigVersionStatus = z.infer<typeof ConfigVersionStatusSchema>;

/** 默认下一个班次开始时生效；紧急调严可选立即生效（必须写原因）。 */
export const EffectiveModeSchema = z.enum(["NextShift", "Immediate"]);
export type EffectiveMode = z.infer<typeof EffectiveModeSchema>;

/**
 * 一个已保存的配置版本。已发布版本不可修改；回滚 = 用旧值生成新版本。
 * 每条草稿、每次路由、每个提醒都记录它按哪个版本执行。
 */
export const ConfigVersionSchema = z.object({
	id: IdSchema,
	scope: ConfigScopeSchema,
	item: WorkflowItemSchema,
	/** 同一 scope + item 内从 1 递增。 */
	versionNumber: z.number().int().min(1),
	config: WorkflowConfigSchema,
	status: ConfigVersionStatusSchema,
	changedBy: IdSchema,
	reason: ReasonTextSchema,
	/** 临床项和 Platform 层必须有第二人批准；批准人不能是 changedBy。 */
	approvedBy: IdSchema.nullable(),
	approvedAt: IsoDateTimeSchema.nullable(),
	effectiveMode: EffectiveModeSchema,
	effectiveFrom: IsoDateTimeSchema.nullable(),
	/** 回滚生成的版本指向被恢复的旧版本。 */
	restoredFromVersionId: IdSchema.nullable(),
	createdAt: IsoDateTimeSchema,
});
export type ConfigVersion = z.infer<typeof ConfigVersionSchema>;

/** 查询某个 Facility 的生效配置时返回的结构：每层当前版本 + 合并后的生效值。 */
export const EffectiveWorkflowConfigSchema = z.object({
	item: WorkflowItemSchema,
	effective: WorkflowConfigSchema,
	platformVersion: ConfigVersionSchema,
	providerVersion: ConfigVersionSchema.nullable(),
	facilityVersion: ConfigVersionSchema.nullable(),
});
export type EffectiveWorkflowConfig = z.infer<typeof EffectiveWorkflowConfigSchema>;
