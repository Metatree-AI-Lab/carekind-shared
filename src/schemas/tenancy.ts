import { z } from "zod";
import { AddressSchema, AustralianStateSchema, IdSchema, IsoDateTimeSchema, ReasonTextSchema } from "./common.ts";

// 数据层级：Provider（租户 = 隔离边界 = 买单方）→ Region（可选分组）→ Facility → Unit。
// 见 Super Admin PRD §4-B 与 Provider Portal PRD §4.1，两份 PRD 必须一致。

/** Provider 生命周期（Super Admin PRD §4-D）。 */
export const PROVIDER_STATUSES = [
	"Draft",
	"Onboarding",
	"Active",
	"Suspended",
	"Terminating",
	"Terminated",
	"Cancelled",
] as const;
export const ProviderStatusSchema = z.enum(PROVIDER_STATUSES);
export type ProviderStatus = z.infer<typeof ProviderStatusSchema>;

/** ABN：11 位数字，允许输入时带空格，存储前去掉空格。 */
export const AbnSchema = z
	.string()
	.transform((value) => value.replace(/\s+/g, ""))
	.pipe(z.string().regex(/^\d{11}$/, "An ABN has 11 digits."));

export const ProviderSchema = z.object({
	id: IdSchema,
	legalName: z.string().trim().min(1).max(200),
	tradingName: z.string().trim().max(200).nullable(),
	abn: AbnSchema,
	status: ProviderStatusSchema,
	/** Demo Provider（例如虚构的 Wattle Grove Care Group）只存在于 Demo 环境。 */
	isDemo: z.boolean(),
	/** 暂停原因（只在 Suspended 时有值）。账务原因只限制新增，不暂停（Super Admin PRD §11.9 #4）。 */
	suspensionReason: ReasonTextSchema.nullable(),
	createdAt: IsoDateTimeSchema,
	updatedAt: IsoDateTimeSchema,
});
export type Provider = z.infer<typeof ProviderSchema>;

export const RegionSchema = z.object({
	id: IdSchema,
	providerId: IdSchema,
	/** 例："VIC Metro & Regional"。Region 只用于汇总和权限范围，不承载数据、不改变规则。 */
	name: z.string().trim().min(1).max(120),
	createdAt: IsoDateTimeSchema,
});
export type Region = z.infer<typeof RegionSchema>;

export const FACILITY_STATUSES = ["Onboarding", "Active", "Suspended", "Closed"] as const;
export const FacilityStatusSchema = z.enum(FACILITY_STATUSES);
export type FacilityStatus = z.infer<typeof FacilityStatusSchema>;

export const FacilitySchema = z.object({
	id: IdSchema,
	providerId: IdSchema,
	regionId: IdSchema.nullable(),
	name: z.string().trim().min(1).max(200),
	/** 州/领地在 address.state；它决定自动绑定的州规则包。之后修改只能经 Super Admin four-eyes。 */
	address: AddressSchema,
	isStateGovernmentOperated: z.boolean(),
	status: FacilityStatusSchema,
	/** 当前绑定的州规则包版本，例如 "VIC-2026.10-1"；州规则包未发布时为 null。 */
	rulePackId: z.string().nullable(),
	/** 运营床位数，用于按床位计价的限额（Plan.limits）。 */
	operationalBeds: z.number().int().min(0).max(2000),
	createdAt: IsoDateTimeSchema,
	updatedAt: IsoDateTimeSchema,
});
export type Facility = z.infer<typeof FacilitySchema>;

export const UnitSchema = z.object({
	id: IdSchema,
	providerId: IdSchema,
	facilityId: IdSchema,
	/** 例："Wattle wing"。界面始终显示 "Facility · Wing"，避免与同名养老院混淆。 */
	name: z.string().trim().min(1).max(120),
	/** 可选说明，例如 "memory support"。 */
	description: z.string().trim().max(200).nullable(),
	isActive: z.boolean(),
	createdAt: IsoDateTimeSchema,
});
export type Unit = z.infer<typeof UnitSchema>;

/** 修改 Facility 州字段的申请：需要第二人批准，并触发规则包重新绑定预览（HAZ-P-SA-01）。 */
export const FacilityStateChangeSchema = z.object({
	facilityId: IdSchema,
	fromState: AustralianStateSchema,
	toState: AustralianStateSchema,
	reason: ReasonTextSchema,
});
export type FacilityStateChange = z.infer<typeof FacilityStateChangeSchema>;
