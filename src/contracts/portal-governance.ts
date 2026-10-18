import { z } from "zod";
import { AcknowledgementSchema, IdSchema, PageQuerySchema, ReasonTextSchema, pageOf } from "../schemas/common.ts";
import { ConfigVersionSchema, EffectiveModeSchema, EffectiveWorkflowConfigSchema } from "../schemas/config-version.ts";
import { WorkflowConfigSchema, WorkflowItemSchema } from "../schemas/workflow-config.ts";
import { GoLiveChecklistItemStatusSchema } from "../schemas/commercial.ts";
import { StateRulePackSchema } from "../schemas/content.ts";
import { DashboardMetricSchema } from "../schemas/dashboard.ts";
import { AuditEventSchema, AuditQuerySchema } from "../schemas/audit.ts";
import { SupportAccessRequestSchema, SupportAccessStatusSchema } from "../schemas/support-access.ts";
import { defineEndpoint, portalAccess } from "./define.ts";
import { ChecklistItemParams, ConfigVersionParams, FacilityParams, SupportRequestParams } from "./params.ts";

// Provider Portal：流程配置（只能调严）、州规则包只读、上线清单、Owner 看板、审计、支持访问审批、Demo 重置。

const configEditors = ["Owner", "ProviderAdmin", "FacilityManager", "ClinicalLead"] as const;
const supportApprovers = ["Owner", "ProviderAdmin"] as const;

export const portalGovernanceEndpoints = {
	getEffectiveWorkflowConfig: defineEndpoint({
		method: "GET",
		path: "/portal/workflow-config",
		summary: "某个范围（公司层或某 Facility）每个流程项的各层版本与合并后的生效值",
		access: portalAccess("Provider", ...configEditors, "CareManager"),
		query: z.strictObject({ facilityId: IdSchema.optional() }),
		response: z.array(EffectiveWorkflowConfigSchema),
	}),
	listWorkflowConfigVersions: defineEndpoint({
		method: "GET",
		path: "/portal/workflow-config/:item/versions",
		summary: "某流程项在公司层或某 Facility 的版本历史（旧值、新值、改动人、原因、批准人）",
		access: portalAccess("Provider", ...configEditors),
		params: z.strictObject({ item: WorkflowItemSchema }),
		query: z.strictObject({ facilityId: IdSchema.optional() }),
		response: z.array(ConfigVersionSchema),
	}),
	proposeWorkflowConfig: defineEndpoint({
		method: "POST",
		path: "/portal/workflow-config/versions",
		summary: "保存新版本；比上一层更松时返回 LooserThanBaseline（并写拒绝审计）；临床项进入待第二人批准",
		access: portalAccess("Provider", ...configEditors),
		body: z.strictObject({
			/** null = 公司层（Provider）；有值 = 单院覆盖。 */
			facilityId: IdSchema.nullable(),
			config: WorkflowConfigSchema,
			reason: ReasonTextSchema,
			effectiveMode: EffectiveModeSchema,
		}),
		response: ConfigVersionSchema,
	}),
	decideWorkflowConfig: defineEndpoint({
		method: "POST",
		path: "/portal/workflow-config/versions/:versionId/decision",
		summary: "第二人批准或拒绝临床流程项的新版本（不能批准自己提交的）",
		access: portalAccess("Provider", "ClinicalLead", "Owner", "ProviderAdmin"),
		params: ConfigVersionParams,
		body: z.strictObject({ isApproved: z.boolean(), note: ReasonTextSchema.nullable() }),
		response: ConfigVersionSchema,
	}),
	rollbackWorkflowConfig: defineEndpoint({
		method: "POST",
		path: "/portal/workflow-config/versions/:versionId/restore",
		summary: "回滚 = 用该旧版本的值生成新版本（同样做只能调严校验）",
		access: portalAccess("Provider", ...configEditors),
		params: ConfigVersionParams,
		body: z.strictObject({ reason: ReasonTextSchema }),
		response: ConfigVersionSchema,
	}),
	getFacilityRulePack: defineEndpoint({
		method: "GET",
		path: "/portal/facilities/:facilityId/rule-pack",
		summary: "该院绑定的州规则包（只读；未核实条目不返回）",
		access: portalAccess("Facility"),
		params: FacilityParams,
		response: StateRulePackSchema,
	}),
	getGoLiveChecklist: defineEndpoint({
		method: "GET",
		path: "/portal/facilities/:facilityId/go-live-checklist",
		summary: "新养老院上线清单（19 项；careKind 侧项只读）",
		access: portalAccess("Facility", "Owner", "ProviderAdmin", "FacilityManager", "ClinicalLead"),
		params: FacilityParams,
		response: z.array(GoLiveChecklistItemStatusSchema),
	}),
	updateGoLiveChecklistItem: defineEndpoint({
		method: "PATCH",
		path: "/portal/facilities/:facilityId/go-live-checklist/:itemNumber",
		summary: "更新机构侧清单项的完成状态",
		access: portalAccess("Facility", "Owner", "ProviderAdmin"),
		params: ChecklistItemParams,
		body: z.strictObject({ isComplete: z.boolean() }),
		response: GoLiveChecklistItemStatusSchema,
	}),
	getDashboard: defineEndpoint({
		method: "GET",
		path: "/portal/dashboard",
		summary: "Business owner 看板（按范围；每张卡带口径；真实租户无护士端数据时为 NoData）",
		access: portalAccess("Provider", "Owner", "ProviderAdmin", "FacilityManager", "ClinicalLead", "CareManager"),
		query: z.strictObject({
			facilityId: IdSchema.optional(),
			regionId: IdSchema.optional(),
			unitId: IdSchema.optional(),
		}),
		response: z.array(DashboardMetricSchema),
	}),
	listAuditEvents: defineEndpoint({
		method: "GET",
		path: "/portal/audit-events",
		summary: "本组织审计（Owner 只看配置和权限类事件；FM / Clinical Lead 只看本院）",
		access: portalAccess("Provider", "Owner", "ProviderAdmin", "FacilityManager", "ClinicalLead"),
		query: PageQuerySchema.extend(AuditQuerySchema.shape),
		response: pageOf(AuditEventSchema),
	}),
	listSupportAccess: defineEndpoint({
		method: "GET",
		path: "/portal/support-access-requests",
		summary: "careKind 支持访问请求（谁、为什么、看什么、多久、是否含健康信息）",
		access: portalAccess("Provider", ...supportApprovers),
		query: PageQuerySchema.extend({ status: SupportAccessStatusSchema.optional() }),
		response: pageOf(SupportAccessRequestSchema),
	}),
	decideSupportAccess: defineEndpoint({
		method: "POST",
		path: "/portal/support-access-requests/:requestId/decision",
		summary: "批准（可缩短时长）或拒绝；需要重新输入密码确认",
		access: portalAccess("Provider", ...supportApprovers),
		params: SupportRequestParams,
		body: z.strictObject({
			isApproved: z.boolean(),
			/** 只能缩短，不能延长。 */
			durationMinutes: z.number().int().min(15).max(240).nullable(),
			note: ReasonTextSchema.nullable(),
			password: z.string().min(1).max(256),
		}),
		response: SupportAccessRequestSchema,
	}),
	revokeSupportAccess: defineEndpoint({
		method: "POST",
		path: "/portal/support-access-requests/:requestId/revoke",
		summary: "随时撤销已批准或进行中的支持访问",
		access: portalAccess("Provider", ...supportApprovers),
		params: SupportRequestParams,
		body: z.strictObject({ reason: ReasonTextSchema }),
		response: SupportAccessRequestSchema,
	}),
	resetDemo: defineEndpoint({
		method: "POST",
		path: "/portal/demo/reset",
		summary: "重置本体验者的 Demo 数据（只在 Demo 会话中可用，不影响其他体验者）",
		access: portalAccess("Provider"),
		response: AcknowledgementSchema,
	}),
} as const;
