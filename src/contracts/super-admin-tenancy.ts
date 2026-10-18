import { z } from "zod";
import {
	AddressSchema,
	EmailSchema,
	ExternalRefSchema,
	IdSchema,
	IsoDateSchema,
	IsoDateTimeSchema,
	PageQuerySchema,
	PersonNameSchema,
	ReasonTextSchema,
	pageOf,
} from "../schemas/common.ts";
import {
	AbnSchema,
	FacilitySchema,
	ProviderSchema,
	ProviderStatusSchema,
	RegionSchema,
	UnitSchema,
} from "../schemas/tenancy.ts";
import {
	BillingStatusSchema,
	BreachNotificationRegistrationSchema,
	ComplianceDocumentTypeSchema,
	ComplianceNoteSchema,
	ComplianceStatusSchema,
	ComplianceStatusValueSchema,
	GoLiveChecklistItemStatusSchema,
	PlanLimitSchema,
	PlanSchema,
} from "../schemas/commercial.ts";
import { ApprovalRequestSchema } from "../schemas/super-admin.ts";
import { defineEndpoint, superAdminAccess } from "./define.ts";
import { ChecklistItemParams, FacilityParams, ProviderParams } from "./params.ts";

// Super Admin：Provider / Region / Facility / Unit、生命周期、首个 Owner、合同状态、套餐、上线清单。
// Super Admin 的 API 只连控制面；这里没有任何读取住户或记录内容的端点（Super Admin PRD §4-B）。

const ProviderSummarySchema = ProviderSchema.extend({
	facilityCount: z.number().int().min(0),
	/** 只给计数，不给住户名单（Super Admin 看不到住户）。 */
	residentCount: z.number().int().min(0),
	staffAccountCount: z.number().int().min(0),
});

const CreateProviderBody = z.strictObject({
	legalName: ProviderSchema.shape.legalName,
	tradingName: ProviderSchema.shape.tradingName,
	abn: AbnSchema,
});

const CreateFacilityBody = z.strictObject({
	name: FacilitySchema.shape.name,
	regionId: IdSchema.nullable(),
	address: AddressSchema,
	isStateGovernmentOperated: z.boolean(),
	operationalBeds: FacilitySchema.shape.operationalBeds,
});

const FacilityPreviewSchema = z.object({
	facility: FacilitySchema,
	/** 按地址州自动绑定的规则包；显示"本院将启用的模板 + 州提示"预览。 */
	boundRulePackId: z.string().nullable(),
	enabledTemplateNames: z.array(z.string()),
});

const ComplianceUpsertBody = z.strictObject({
	status: ComplianceStatusValueSchema,
	effectiveOn: IsoDateSchema.nullable(),
	expiresOn: IsoDateSchema.nullable(),
	carekindOwnerId: IdSchema.nullable(),
	providerOwner: z.object({ name: PersonNameSchema, position: z.string().trim().min(1).max(120) }).nullable(),
	externalRef: ExternalRefSchema.nullable(),
	hasNonStandardTerms: z.boolean(),
	nonStandardApprovedOn: IsoDateSchema.nullable(),
	notes: ComplianceNoteSchema.nullable(),
});

const LifecycleTargetSchema = z.enum(["Onboarding", "Active", "Suspended", "Terminating", "Terminated", "Cancelled"]);

export const superAdminTenancyEndpoints = {
	listProviders: defineEndpoint({
		method: "GET",
		path: "/super-admin/providers",
		summary: "列出 Provider（可按生命周期状态筛选）；Demo console 中只有虚构 Provider",
		access: superAdminAccess("providers.read"),
		query: PageQuerySchema.extend({ status: ProviderStatusSchema.optional() }),
		response: pageOf(ProviderSummarySchema),
	}),
	createProvider: defineEndpoint({
		method: "POST",
		path: "/super-admin/providers",
		summary: "新建 Provider（状态 Draft）；校验 ABN 格式、名称唯一",
		access: superAdminAccess("providers.write"),
		body: CreateProviderBody,
		response: ProviderSchema,
	}),
	getProvider: defineEndpoint({
		method: "GET",
		path: "/super-admin/providers/:providerId",
		summary: "Provider 详情与计数（不含住户信息）",
		access: superAdminAccess("providers.read"),
		params: ProviderParams,
		response: ProviderSummarySchema,
	}),
	updateProvider: defineEndpoint({
		method: "PATCH",
		path: "/super-admin/providers/:providerId",
		summary: "修改 Provider 名称或商号",
		access: superAdminAccess("providers.write"),
		params: ProviderParams,
		body: CreateProviderBody.partial(),
		response: ProviderSchema,
	}),
	requestProviderLifecycleChange: defineEndpoint({
		method: "POST",
		path: "/super-admin/providers/:providerId/lifecycle-requests",
		summary: "申请生命周期变更（激活 / 暂停 / 恢复 / 终止）；生成 four-eyes 审批，转 Active 需清单 100%",
		access: superAdminAccess("providers.lifecycle.request"),
		params: ProviderParams,
		body: z.strictObject({ toStatus: LifecycleTargetSchema, reason: ReasonTextSchema }),
		response: ApprovalRequestSchema,
	}),
	listRegions: defineEndpoint({
		method: "GET",
		path: "/super-admin/providers/:providerId/regions",
		summary: "列出 Provider 的 Region",
		access: superAdminAccess("providers.read"),
		params: ProviderParams,
		response: z.array(RegionSchema),
	}),
	createRegion: defineEndpoint({
		method: "POST",
		path: "/super-admin/providers/:providerId/regions",
		summary: "新建 Region（只用于汇总和权限范围）",
		access: superAdminAccess("facilities.write"),
		params: ProviderParams,
		body: z.strictObject({ name: RegionSchema.shape.name }),
		response: RegionSchema,
	}),
	listFacilities: defineEndpoint({
		method: "GET",
		path: "/super-admin/providers/:providerId/facilities",
		summary: "列出 Provider 的 Facility（状态、规则包版本、上线清单完成度）",
		access: superAdminAccess("providers.read"),
		params: ProviderParams,
		response: z.array(
			FacilitySchema.extend({
				goLiveCompleted: z.number().int().min(0),
				goLiveTotal: z.number().int().min(0),
			}),
		),
	}),
	createFacility: defineEndpoint({
		method: "POST",
		path: "/super-admin/providers/:providerId/facilities",
		summary: "代建 Facility；按地址州自动绑定当前规则包并返回预览；受套餐 facility 限额约束",
		access: superAdminAccess("facilities.write"),
		params: ProviderParams,
		body: CreateFacilityBody,
		response: FacilityPreviewSchema,
	}),
	updateFacility: defineEndpoint({
		method: "PATCH",
		path: "/super-admin/facilities/:facilityId",
		summary: "修改 Facility 名称、Region、床位数、是否州政府运营（州字段不能在这里改）",
		access: superAdminAccess("facilities.write"),
		params: FacilityParams,
		body: CreateFacilityBody.omit({ address: true }).partial(),
		response: FacilitySchema,
	}),
	requestFacilityStateChange: defineEndpoint({
		method: "POST",
		path: "/super-admin/facilities/:facilityId/state-change-requests",
		summary: "申请修改 Facility 地址 / 州；four-eyes，并返回规则包重新绑定预览",
		access: superAdminAccess("facilities.write"),
		params: FacilityParams,
		body: z.strictObject({ address: AddressSchema, reason: ReasonTextSchema }),
		response: ApprovalRequestSchema,
	}),
	listUnits: defineEndpoint({
		method: "GET",
		path: "/super-admin/facilities/:facilityId/units",
		summary: "列出 Facility 的 Unit / wing",
		access: superAdminAccess("providers.read"),
		params: FacilityParams,
		response: z.array(UnitSchema),
	}),
	createUnit: defineEndpoint({
		method: "POST",
		path: "/super-admin/facilities/:facilityId/units",
		summary: "代建 Unit / wing",
		access: superAdminAccess("facilities.write"),
		params: FacilityParams,
		body: z.strictObject({ name: UnitSchema.shape.name, description: UnitSchema.shape.description }),
		response: UnitSchema,
	}),
	inviteOwner: defineEndpoint({
		method: "POST",
		path: "/super-admin/providers/:providerId/owner-invitations",
		summary: "邀请首个 Owner（一次性链接，72 小时过期；Demo 中显示 Simulated）",
		access: superAdminAccess("providers.write"),
		params: ProviderParams,
		body: z.strictObject({ fullName: PersonNameSchema, email: EmailSchema }),
		response: z.object({ staffId: IdSchema, expiresAt: IsoDateTimeSchema, isSimulated: z.boolean() }),
	}),
	listCompliance: defineEndpoint({
		method: "GET",
		path: "/super-admin/providers/:providerId/compliance",
		summary: "签约与合规状态（合同、DPA、PIA、保险等；只有状态、日期、负责人、外部引用）",
		access: superAdminAccess("providers.read"),
		params: ProviderParams,
		response: z.array(ComplianceStatusSchema),
	}),
	upsertCompliance: defineEndpoint({
		method: "PUT",
		path: "/super-admin/providers/:providerId/compliance/:documentType",
		summary: "录入或更新一项合规状态；非标准条款必须有 Lightman 批准日期",
		access: superAdminAccess("compliance.write"),
		params: ProviderParams.extend({ documentType: ComplianceDocumentTypeSchema }),
		body: ComplianceUpsertBody,
		response: ComplianceStatusSchema,
	}),
	getBreachRegistration: defineEndpoint({
		method: "GET",
		path: "/super-admin/providers/:providerId/breach-notification",
		summary: "泄露通报登记（联系人、适用制度、careKind 承诺时限）；未登记时为 null",
		access: superAdminAccess("providers.read"),
		params: ProviderParams,
		response: BreachNotificationRegistrationSchema.nullable(),
	}),
	upsertBreachRegistration: defineEndpoint({
		method: "PUT",
		path: "/super-admin/providers/:providerId/breach-notification",
		summary: "登记或更新泄露通报联系人和时限（上线清单 ★11）",
		access: superAdminAccess("compliance.write"),
		params: ProviderParams,
		body: BreachNotificationRegistrationSchema.pick({
			contactName: true,
			contactPosition: true,
			regime: true,
			carekindCommitmentHours: true,
		}).strict(),
		response: BreachNotificationRegistrationSchema,
	}),
	getPlan: defineEndpoint({
		method: "GET",
		path: "/super-admin/providers/:providerId/plan",
		summary: "套餐、限额与账单状态（只记录）；未设置时为 null",
		access: superAdminAccess("providers.read"),
		params: ProviderParams,
		response: PlanSchema.nullable(),
	}),
	upsertPlan: defineEndpoint({
		method: "PUT",
		path: "/super-admin/providers/:providerId/plan",
		summary: "设置套餐名称、限额（seat / bed / facility）、合同起止、账单状态",
		access: superAdminAccess("plans.write"),
		params: ProviderParams,
		body: z.strictObject({
			name: PlanSchema.shape.name,
			limits: z.array(PlanLimitSchema),
			contractStart: IsoDateSchema.nullable(),
			contractEnd: IsoDateSchema.nullable(),
			billingStatus: BillingStatusSchema,
			accountingRef: ExternalRefSchema.nullable(),
		}),
		response: PlanSchema,
	}),
	getGoLiveChecklist: defineEndpoint({
		method: "GET",
		path: "/super-admin/facilities/:facilityId/go-live-checklist",
		summary: "Facility 上线清单 19 项的完成情况（★ 为转 Active 硬门槛）",
		access: superAdminAccess("providers.read"),
		params: FacilityParams,
		response: z.array(GoLiveChecklistItemStatusSchema),
	}),
	updateGoLiveChecklistItem: defineEndpoint({
		method: "PATCH",
		path: "/super-admin/facilities/:facilityId/go-live-checklist/:itemNumber",
		summary: "更新 careKind 侧清单项（Provider 侧项只能在 Provider Portal 更新）",
		access: superAdminAccess("compliance.write"),
		params: ChecklistItemParams,
		body: z.strictObject({ isComplete: z.boolean() }),
		response: GoLiveChecklistItemStatusSchema,
	}),
} as const;
