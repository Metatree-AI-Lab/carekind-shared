import { z } from "zod";
import {
	AddressSchema,
	EmailSchema,
	IdSchema,
	PageQuerySchema,
	PersonNameSchema,
	ReasonTextSchema,
	pageOf,
} from "../schemas/common.ts";
import { FacilitySchema, ProviderSchema, RegionSchema, UnitSchema } from "../schemas/tenancy.ts";
import { ComplianceStatusSchema, PlanSchema } from "../schemas/commercial.ts";
import {
	AhpraNumberSchema,
	ClinicalRoleGrantRequestSchema,
	DeactivationCheckSchema,
	NurseAppRoleSchema,
	PortalRoleSchema,
	RegistrationTypeSchema,
	RoleScopeSchema,
	StaffAssignmentSchema,
	StaffMemberSchema,
	StaffStatusSchema,
} from "../schemas/staff.ts";
import { defineEndpoint, portalAccess } from "./define.ts";
import { FacilityParams, GrantParams, StaffParams } from "./params.ts";

// Provider Portal：范围、Provider 只读信息、Facility / Unit、员工管理（Provider Portal PRD §4.3、§4.4）。
// 所有查询都带 Provider 上下文（来自登录会话，不从请求里取）；范围检查在后端执行。

const ScopeTreeSchema = z.object({
	provider: ProviderSchema.pick({ id: true, legalName: true, tradingName: true, status: true, isDemo: true }),
	regions: z.array(RegionSchema),
	/** 只包含当前账号有权限的 Facility。 */
	facilities: z.array(FacilitySchema.pick({ id: true, name: true, regionId: true, address: true, status: true })),
	canWriteProviderLevel: z.boolean(),
});

const StaffQuery = PageQuerySchema.extend({
	facilityId: IdSchema.optional(),
	status: StaffStatusSchema.optional(),
	/** 按姓名或邮箱搜索（服务端执行，不记录到日志）。 */
	search: z.string().trim().min(1).max(120).optional(),
});

const InviteStaffBody = z.strictObject({
	fullName: PersonNameSchema,
	preferredName: PersonNameSchema.nullable(),
	loginEmail: EmailSchema,
	nurseAppRole: NurseAppRoleSchema,
	registrationType: RegistrationTypeSchema,
	ahpraNumber: AhpraNumberSchema.nullable(),
	assignments: z.array(StaffAssignmentSchema).min(1),
	preferredLanguage: z.string().min(2).max(35).nullable(),
});

const UpdateStaffBody = z.strictObject({
	preferredName: PersonNameSchema.nullable().optional(),
	nurseAppRole: NurseAppRoleSchema.optional(),
	registrationType: RegistrationTypeSchema.optional(),
	ahpraNumber: AhpraNumberSchema.nullable().optional(),
	assignments: z.array(StaffAssignmentSchema).min(1).optional(),
	/** 非临床管理端角色可直接改；临床角色授予非临床人员要走 clinical-role-grants。 */
	portalRoles: z.array(z.object({ role: PortalRoleSchema, scope: RoleScopeSchema })).optional(),
	preferredLanguage: z.string().min(2).max(35).nullable().optional(),
});

const staffManagers = ["Owner", "ProviderAdmin", "FacilityManager"] as const;

export const portalOrganisationEndpoints = {
	getScopes: defineEndpoint({
		method: "GET",
		path: "/portal/scopes",
		summary: "范围选择器数据：Provider → Region → 有权限的 Facility",
		access: portalAccess("Provider"),
		response: ScopeTreeSchema,
	}),
	getProviderOverview: defineEndpoint({
		method: "GET",
		path: "/portal/provider",
		summary: "本 Provider 的只读信息：套餐、限额、签约状态（由 Super Admin 管理）",
		access: portalAccess("Provider", "Owner", "ProviderAdmin"),
		response: z.object({
			provider: ProviderSchema,
			plan: PlanSchema.nullable(),
			compliance: z.array(ComplianceStatusSchema),
		}),
	}),
	listFacilities: defineEndpoint({
		method: "GET",
		path: "/portal/facilities",
		summary: "有权限的 Facility 列表（规则包版本、是否公营）",
		access: portalAccess("Provider"),
		response: z.array(FacilitySchema),
	}),
	createFacility: defineEndpoint({
		method: "POST",
		path: "/portal/facilities",
		summary: "自助新增 Facility；受套餐 facility 限额约束；必须二次确认州（之后只能经 Super Admin 修改）",
		access: portalAccess("Provider", "Owner", "ProviderAdmin"),
		body: z.strictObject({
			name: FacilitySchema.shape.name,
			regionId: IdSchema.nullable(),
			address: AddressSchema,
			isStateGovernmentOperated: z.boolean(),
			operationalBeds: FacilitySchema.shape.operationalBeds,
			/** "This facility is in NSW. NSW rules will apply." 的确认。 */
			hasConfirmedState: z.literal(true),
		}),
		response: FacilitySchema,
	}),
	getFacility: defineEndpoint({
		method: "GET",
		path: "/portal/facilities/:facilityId",
		summary: "Facility 详情（Rules pack: NSW · v…、Public sector）",
		access: portalAccess("Facility"),
		params: FacilityParams,
		response: FacilitySchema,
	}),
	listUnits: defineEndpoint({
		method: "GET",
		path: "/portal/facilities/:facilityId/units",
		summary: "Facility 的 Unit / wing",
		access: portalAccess("Facility"),
		params: FacilityParams,
		response: z.array(UnitSchema),
	}),
	createUnit: defineEndpoint({
		method: "POST",
		path: "/portal/facilities/:facilityId/units",
		summary: "新增 Unit / wing",
		access: portalAccess("Facility", "Owner", "ProviderAdmin", "FacilityManager"),
		params: FacilityParams,
		body: z.strictObject({ name: UnitSchema.shape.name, description: UnitSchema.shape.description }),
		response: UnitSchema,
	}),
	listStaff: defineEndpoint({
		method: "GET",
		path: "/portal/staff",
		summary: "员工列表（按范围过滤；可按 Facility、状态、姓名搜索）",
		access: portalAccess("Provider", ...staffManagers, "ClinicalLead"),
		query: StaffQuery,
		response: pageOf(StaffMemberSchema),
	}),
	inviteStaff: defineEndpoint({
		method: "POST",
		path: "/portal/staff/invitations",
		summary: "邀请员工（状态 Invited）；超过 seat 限额返回 PlanLimitReached；Demo 中邮件为 Simulated",
		access: portalAccess("Facility", ...staffManagers),
		body: InviteStaffBody,
		response: z.object({ staff: StaffMemberSchema, isEmailSimulated: z.boolean() }),
	}),
	getStaff: defineEndpoint({
		method: "GET",
		path: "/portal/staff/:staffId",
		summary: "员工详情（角色、分配、上线步骤；不含绩效或个人统计）",
		access: portalAccess("Facility", ...staffManagers, "ClinicalLead"),
		params: StaffParams,
		response: StaffMemberSchema,
	}),
	updateStaff: defineEndpoint({
		method: "PATCH",
		path: "/portal/staff/:staffId",
		summary: "修改角色、多院分配、管理端角色",
		access: portalAccess("Facility", ...staffManagers),
		params: StaffParams,
		body: UpdateStaffBody,
		response: StaffMemberSchema,
	}),
	completeOnboardingStep: defineEndpoint({
		method: "POST",
		path: "/portal/staff/:staffId/onboarding-steps/:stepId/complete",
		summary: "标记一个上线步骤完成；全部完成后员工变为 Active",
		access: portalAccess("Facility", ...staffManagers, "ClinicalLead"),
		params: StaffParams.extend({ stepId: z.string().min(2).max(60) }),
		response: StaffMemberSchema,
	}),
	attestRegistration: defineEndpoint({
		method: "POST",
		path: "/portal/staff/:staffId/registration-attestation",
		summary: 'Clinical Lead 证明 RN / EN 资质（"I have checked this person\'s registration"）',
		access: portalAccess("Facility", "ClinicalLead"),
		params: StaffParams,
		body: z.strictObject({ hasCheckedRegistration: z.literal(true) }),
		response: StaffMemberSchema,
	}),
	getDeactivationCheck: defineEndpoint({
		method: "GET",
		path: "/portal/staff/:staffId/deactivation-check",
		summary: "停用前检查：列出阻断项（审核项、升级路由、FollowUp、交接）",
		access: portalAccess("Facility", ...staffManagers),
		params: StaffParams,
		response: DeactivationCheckSchema,
	}),
	deactivateStaff: defineEndpoint({
		method: "POST",
		path: "/portal/staff/:staffId/deactivate",
		summary: "停用员工，立即撤销会话；有阻断项时返回 BlockedByOpenItems，除非选择先停用后处理",
		access: portalAccess("Facility", ...staffManagers),
		params: StaffParams,
		body: z.strictObject({
			reason: ReasonTextSchema,
			/** 紧急情况先停用：阻断项自动转给该院的角色收件人，并通知 Facility Manager。 */
			isUrgentDeactivateFirst: z.boolean(),
		}),
		response: StaffMemberSchema,
	}),
	requestClinicalRoleGrant: defineEndpoint({
		method: "POST",
		path: "/portal/staff/:staffId/clinical-role-grants",
		summary: "申请给非临床人员（例如 Owner）授予临床角色；需要第二人批准",
		access: portalAccess("Provider", "ProviderAdmin", "ClinicalLead"),
		params: StaffParams,
		body: z.strictObject({
			role: z.enum(["ClinicalLead", "CareManager"]),
			scope: RoleScopeSchema,
			reason: ReasonTextSchema,
		}),
		response: ClinicalRoleGrantRequestSchema,
	}),
	listClinicalRoleGrants: defineEndpoint({
		method: "GET",
		path: "/portal/clinical-role-grants",
		summary: "待批准与历史的临床角色授予（季度权限复核用）",
		access: portalAccess("Provider", "ProviderAdmin", "ClinicalLead"),
		response: z.array(ClinicalRoleGrantRequestSchema),
	}),
	decideClinicalRoleGrant: defineEndpoint({
		method: "POST",
		path: "/portal/clinical-role-grants/:grantId/decision",
		summary: "第二人批准或拒绝临床角色授予（不能批准自己发起的）",
		access: portalAccess("Provider", "ProviderAdmin", "ClinicalLead"),
		params: GrantParams,
		body: z.strictObject({ isApproved: z.boolean(), note: ReasonTextSchema.nullable() }),
		response: ClinicalRoleGrantRequestSchema,
	}),
} as const;
