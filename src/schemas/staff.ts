import { z } from "zod";
import { EmailSchema, IdSchema, IsoDateTimeSchema, PersonNameSchema } from "./common.ts";

// 员工管理：Provider Portal PRD §4.2、§4.4。只管理需要使用 careKind 的员工账号；
// 不收集出生日期、住址、police certificate、薪资、绩效（rules/00 §3）。

/** 护士端角色：决定能确认哪个 Tier（分级审核 PRD §4.1）。 */
export const NURSE_APP_ROLES = ["PCW", "EN", "RN", "OtherStaff"] as const;
export const NurseAppRoleSchema = z.enum(NURSE_APP_ROLES);
export type NurseAppRole = z.infer<typeof NurseAppRoleSchema>;

/** 管理端（Provider Portal）角色。一线员工不进管理端。 */
export const PORTAL_ROLES = ["Owner", "ProviderAdmin", "FacilityManager", "ClinicalLead", "CareManager"] as const;
export const PortalRoleSchema = z.enum(PORTAL_ROLES);
export type PortalRole = z.infer<typeof PortalRoleSchema>;

/** 所有员工角色（护士端 + 管理端）的合集，用于筛选和显示。 */
export const STAFF_ROLES = [...NURSE_APP_ROLES, ...PORTAL_ROLES] as const;
export const StaffRoleSchema = z.enum(STAFF_ROLES);
export type StaffRole = z.infer<typeof StaffRoleSchema>;

/** 带临床内容访问权的管理端角色（need-to-know）。授予 Owner 这类角色需要第二人批准。 */
export const CLINICAL_PORTAL_ROLES: readonly PortalRole[] = ["ClinicalLead", "CareManager"];

/** 员工状态机（Provider Portal PRD §4.4）。Deactivated 不能删除、不能复用给别人。 */
export const STAFF_STATUSES = ["Invited", "Onboarding", "Active", "Suspended", "Deactivated"] as const;
export const StaffStatusSchema = z.enum(STAFF_STATUSES);
export type StaffStatus = z.infer<typeof StaffStatusSchema>;

/** 角色的范围：整个 Provider / 某个 Region / 指定 Facility 集合。写操作只能在 Provider 或单一 Facility 范围内进行。 */
export const RoleScopeSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("Provider") }),
	z.object({ type: z.literal("Region"), regionId: IdSchema }),
	z.object({ type: z.literal("Facilities"), facilityIds: z.array(IdSchema).min(1) }),
]);
export type RoleScope = z.infer<typeof RoleScopeSchema>;

export const PortalRoleGrantSchema = z.object({
	role: PortalRoleSchema,
	scope: RoleScopeSchema,
	grantedBy: IdSchema,
	/** 临床角色授予 Owner 等人时的第二批准人；非临床角色为 null。 */
	approvedBy: IdSchema.nullable(),
	grantedAt: IsoDateTimeSchema,
});
export type PortalRoleGrant = z.infer<typeof PortalRoleGrantSchema>;

/** 员工被分配到的 Facility（可选到 Unit）。一名员工可以分配到多家院（多院分配）。 */
export const StaffAssignmentSchema = z.object({
	facilityId: IdSchema,
	/** 空数组 = 该院所有 Unit。 */
	unitIds: z.array(IdSchema),
});
export type StaffAssignment = z.infer<typeof StaffAssignmentSchema>;

/** 员工上线步骤完成情况（流程第 7 项）。三项默认步骤 + 机构自加步骤。 */
export const StaffOnboardingStepStatusSchema = z.object({
	stepId: z.string().min(1).max(80),
	completedAt: IsoDateTimeSchema.nullable(),
	completedBy: IdSchema.nullable(),
});
export type StaffOnboardingStepStatus = z.infer<typeof StaffOnboardingStepStatusSchema>;

export const REGISTRATION_TYPES = ["RN", "EN", "None"] as const;
export const RegistrationTypeSchema = z.enum(REGISTRATION_TYPES);
export type RegistrationType = z.infer<typeof RegistrationTypeSchema>;

/** AHPRA 注册号格式：3 个字母 + 10 位数字（例如 NMW0001234567，⚠️ 需核实格式）。careKind 不核验 AHPRA。 */
export const AhpraNumberSchema = z.string().regex(/^[A-Z]{3}\d{10}$/, "AHPRA numbers look like NMW0001234567.");

export const StaffMemberSchema = z.object({
	id: IdSchema,
	providerId: IdSchema,
	fullName: PersonNameSchema,
	preferredName: PersonNameSchema.nullable(),
	/** 登录标识。同一邮箱在两家 Provider = 两个独立账号。 */
	loginEmail: EmailSchema,
	nurseAppRole: NurseAppRoleSchema,
	registrationType: RegistrationTypeSchema,
	ahpraNumber: AhpraNumberSchema.nullable(),
	/** RN / EN 资质由 Clinical Lead attest（"I have checked this person's registration"）。 */
	registrationAttestedBy: IdSchema.nullable(),
	registrationAttestedAt: IsoDateTimeSchema.nullable(),
	assignments: z.array(StaffAssignmentSchema),
	portalRoles: z.array(PortalRoleGrantSchema),
	status: StaffStatusSchema,
	onboardingSteps: z.array(StaffOnboardingStepStatusSchema),
	/** BCP 47 语言标签，供多语言 PRD 使用。 */
	preferredLanguage: z.string().min(2).max(35).nullable(),
	invitedAt: IsoDateTimeSchema,
	activatedAt: IsoDateTimeSchema.nullable(),
	deactivatedAt: IsoDateTimeSchema.nullable(),
	updatedAt: IsoDateTimeSchema,
});
export type StaffMember = z.infer<typeof StaffMemberSchema>;

/**
 * 作者快照：记录上的作者、审核人保存的是确认当时的快照，不是对账号的实时引用。
 * 员工停用后显示 "Daniel Reyes RN (former staff)"；审计链不变（护栏 G7）。
 */
export const AuthorSnapshotSchema = z.object({
	staffId: IdSchema,
	displayName: PersonNameSchema,
	nurseAppRole: NurseAppRoleSchema,
	registrationType: RegistrationTypeSchema,
	capturedAt: IsoDateTimeSchema,
});
export type AuthorSnapshot = z.infer<typeof AuthorSnapshotSchema>;

/** 停用前检查的阻断项（Provider Portal PRD §4.4）。第一阶段没有护士端，①③④ 的数量来自 API 的空实现。 */
export const DEACTIVATION_BLOCKER_KINDS = [
	"OpenReviewItems",
	"EscalationRouteMember",
	"OpenFollowUps",
	"UnacceptedHandovers",
] as const;
export const DeactivationBlockerSchema = z.object({
	kind: z.enum(DEACTIVATION_BLOCKER_KINDS),
	facilityId: IdSchema,
	count: z.number().int().min(1),
	/** 给管理员看的说明，例如 "He is the backup contact for Tier 3 notes at Banksia Park."。 */
	description: z.string().max(300),
});
export type DeactivationBlocker = z.infer<typeof DeactivationBlockerSchema>;

export const DeactivationCheckSchema = z.object({
	staffId: IdSchema,
	canDeactivate: z.boolean(),
	blockers: z.array(DeactivationBlockerSchema),
});
export type DeactivationCheck = z.infer<typeof DeactivationCheckSchema>;

/**
 * 给 Owner 等非临床人员授予临床角色的申请（Provider Portal PRD §4.2 规则 1、§12.9 #1）：
 * 需要第二人批准（Privacy officer 授予时由 Clinical Lead 批准，反之亦然），写审计。
 */
export const ClinicalRoleGrantRequestSchema = z.object({
	id: IdSchema,
	providerId: IdSchema,
	staffId: IdSchema,
	role: PortalRoleSchema,
	scope: RoleScopeSchema,
	reason: z.string().trim().min(3).max(500),
	status: z.enum(["Pending", "Approved", "Rejected"]),
	requestedBy: IdSchema,
	requestedAt: IsoDateTimeSchema,
	decidedBy: IdSchema.nullable(),
	decidedAt: IsoDateTimeSchema.nullable(),
});
export type ClinicalRoleGrantRequest = z.infer<typeof ClinicalRoleGrantRequestSchema>;
