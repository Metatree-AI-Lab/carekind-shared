import { z } from "zod";
import {
	IdSchema,
	IsoDateSchema,
	IsoDateTimeSchema,
	PageQuerySchema,
	PersonNameSchema,
	ReasonTextSchema,
	pageOf,
} from "../schemas/common.ts";
import {
	ConsentSourceSchema,
	AiDocumentationConsentSchema,
	FacilityResidentIdSchema,
	ResidentContactSchema,
	ResidentSchema,
	ResidentStatusSchema,
	ResidentTransferSchema,
	RoomChangeReasonSchema,
	TransferReasonCategorySchema,
	TransferStatusSchema,
} from "../schemas/resident.ts";
import {
	RosterImportBatchSchema,
	RosterImportRowSchema,
	RosterRowDecisionSchema,
	RosterRowStatusSchema,
} from "../schemas/roster-import.ts";
import { defineEndpoint, portalAccess } from "./define.ts";
import { BatchParams, FacilityParams, ImportRowParams, ResidentParams, TransferParams } from "./params.ts";

// Provider Portal：住户管理、同公司转院、名单 CSV 分步导入（Provider Portal PRD §4.5）。
// 这里只有身份、位置、同意、联系人；没有任何临床内容端点。Owner 默认不能打开住户（§4.2）。

const residentEditors = ["FacilityManager", "ProviderAdmin"] as const;
const residentReaders = ["FacilityManager", "ClinicalLead", "CareManager", "ProviderAdmin"] as const;

const CreateResidentBody = z.strictObject({
	legalName: PersonNameSchema,
	preferredName: PersonNameSchema.nullable(),
	dateOfBirth: IsoDateSchema,
	facilityResidentId: FacilityResidentIdSchema,
	cmsId: z.string().trim().min(1).max(60).nullable(),
	unitId: IdSchema.nullable(),
	room: z.string().trim().min(1).max(20).nullable(),
	startDay: IsoDateSchema.nullable(),
});

const ContactInput = ResidentContactSchema.omit({ id: true }).strict();

export const portalResidentEndpoints = {
	listResidents: defineEndpoint({
		method: "GET",
		path: "/portal/facilities/:facilityId/residents",
		summary: "住户名单（按状态、Unit 筛选）；只对有住户权限的角色开放",
		access: portalAccess("Facility", ...residentReaders),
		params: FacilityParams,
		query: PageQuerySchema.extend({
			status: ResidentStatusSchema.optional(),
			unitId: IdSchema.optional(),
			search: z.string().trim().min(1).max(120).optional(),
		}),
		response: pageOf(ResidentSchema),
	}),
	createResident: defineEndpoint({
		method: "POST",
		path: "/portal/facilities/:facilityId/residents",
		summary: "新建住户（状态 PreAdmission）；匹配键重复时返回 Conflict",
		access: portalAccess("Facility", ...residentEditors),
		params: FacilityParams,
		body: CreateResidentBody,
		response: ResidentSchema,
	}),
	getResident: defineEndpoint({
		method: "GET",
		path: "/portal/residents/:residentId",
		summary: "住户详情（身份、位置、同意、联系人；不含临床内容）；写读取审计",
		access: portalAccess("Facility", ...residentReaders),
		params: ResidentParams,
		response: ResidentSchema,
		isAudited: true,
	}),
	updateResident: defineEndpoint({
		method: "PATCH",
		path: "/portal/residents/:residentId",
		summary: "修改偏好称呼、Unit、start day；身份字段变化走身份更正（需 Clinical Lead 批准）",
		access: portalAccess("Facility", ...residentEditors),
		params: ResidentParams,
		body: z.strictObject({
			preferredName: PersonNameSchema.nullable().optional(),
			unitId: IdSchema.nullable().optional(),
			startDay: IsoDateSchema.nullable().optional(),
			cmsId: z.string().trim().min(1).max(60).nullable().optional(),
		}),
		response: ResidentSchema,
	}),
	changeRoom: defineEndpoint({
		method: "POST",
		path: "/portal/residents/:residentId/room-changes",
		summary: "同院房间调换，记录原因类别（Rules 149-70）；护士端名单显示 Room changed",
		access: portalAccess("Facility", ...residentEditors),
		params: ResidentParams,
		body: z.strictObject({
			unitId: IdSchema.nullable(),
			room: z.string().trim().min(1).max(20),
			reason: RoomChangeReasonSchema,
			effectiveAt: IsoDateTimeSchema,
		}),
		response: ResidentSchema,
	}),
	changeStatus: defineEndpoint({
		method: "POST",
		path: "/portal/residents/:residentId/status",
		summary: "入住 / 外出 / 住院 / 离开 / 去世；未关闭待办必须先关闭（Departed / Deceased）",
		access: portalAccess("Facility", ...residentEditors),
		params: ResidentParams,
		body: z.strictObject({
			status: ResidentStatusSchema,
			effectiveOn: IsoDateSchema,
			reason: ReasonTextSchema.nullable(),
		}),
		response: ResidentSchema,
	}),
	setConsent: defineEndpoint({
		method: "PUT",
		path: "/portal/residents/:residentId/consent",
		summary: "登记 AI 文书同意 / 退出与录音退出；退出即时生效并推送护士端",
		access: portalAccess("Facility", "FacilityManager", "ClinicalLead"),
		params: ResidentParams,
		body: z.strictObject({
			aiDocumentation: AiDocumentationConsentSchema,
			isRecordingOptedOut: z.boolean(),
			source: ConsentSourceSchema,
			recordedOn: IsoDateSchema,
		}),
		response: ResidentSchema,
	}),
	setContacts: defineEndpoint({
		method: "PUT",
		path: "/portal/residents/:residentId/contacts",
		summary: "替换联系人列表（只存姓名、关系、角色类型；不推导 person responsible）",
		access: portalAccess("Facility", "FacilityManager", "ClinicalLead"),
		params: ResidentParams,
		body: z.strictObject({ contacts: z.array(ContactInput).max(20) }),
		response: ResidentSchema,
	}),
	listTransfers: defineEndpoint({
		method: "GET",
		path: "/portal/resident-transfers",
		summary: "转院记录（发起院或目标院）",
		access: portalAccess("Facility", ...residentReaders),
		query: PageQuerySchema.extend({ facilityId: IdSchema, status: TransferStatusSchema.optional() }),
		response: pageOf(ResidentTransferSchema),
	}),
	initiateTransfer: defineEndpoint({
		method: "POST",
		path: "/portal/resident-transfers",
		summary: "发起同公司转院；返回阻断项（未确认草稿等），没有阻断时进入 AwaitingAcceptance",
		access: portalAccess("Facility", "FacilityManager"),
		body: z.strictObject({
			residentId: IdSchema,
			toFacilityId: IdSchema,
			toUnitId: IdSchema.nullable(),
			toRoom: z.string().trim().min(1).max(20).nullable(),
			effectiveAt: IsoDateTimeSchema,
			reasonCategory: TransferReasonCategorySchema,
		}),
		response: ResidentTransferSchema,
	}),
	acceptTransfer: defineEndpoint({
		method: "POST",
		path: "/portal/resident-transfers/:transferId/accept",
		summary: "目标院 FM 或 Clinical Lead 核对 ≥ 3 项识别信息后接收",
		access: portalAccess("Facility", "FacilityManager", "ClinicalLead"),
		params: TransferParams,
		body: z.strictObject({ hasVerifiedIdentity: z.literal(true) }),
		response: ResidentTransferSchema,
	}),
	cancelTransfer: defineEndpoint({
		method: "POST",
		path: "/portal/resident-transfers/:transferId/cancel",
		summary: "取消尚未生效的转院",
		access: portalAccess("Facility", "FacilityManager"),
		params: TransferParams,
		body: z.strictObject({ reason: ReasonTextSchema }),
		response: ResidentTransferSchema,
	}),
	uploadRoster: defineEndpoint({
		method: "POST",
		path: "/portal/facilities/:facilityId/roster-imports",
		summary: "上传名单 CSV（careKind 模板），执行结构校验和比对，返回批次与各状态计数",
		access: portalAccess("Facility", "FacilityManager", "ProviderAdmin"),
		params: FacilityParams,
		body: z.strictObject({
			fileName: z
				.string()
				.min(1)
				.max(200)
				.regex(/\.csv$/i),
			/** CSV 正文。500 行以内；原文件处理完后删除，只留校验和。 */
			csvText: z.string().min(1).max(2_000_000),
		}),
		response: RosterImportBatchSchema,
	}),
	getRosterImport: defineEndpoint({
		method: "GET",
		path: "/portal/roster-imports/:batchId",
		summary: "导入批次与差异预览（按状态分组、分页）",
		access: portalAccess("Facility", "FacilityManager", "ClinicalLead", "ProviderAdmin"),
		params: BatchParams,
		query: PageQuerySchema.extend({ status: RosterRowStatusSchema.optional() }),
		response: z.object({ batch: RosterImportBatchSchema, rows: pageOf(RosterImportRowSchema) }),
	}),
	decideRosterRow: defineEndpoint({
		method: "POST",
		path: "/portal/roster-imports/:batchId/rows/:rowNumber/decision",
		summary: "逐行决定 Possible match（同一个人 / 不同的人，必须写原因）",
		access: portalAccess("Facility", "FacilityManager", "ProviderAdmin"),
		params: ImportRowParams,
		body: z.strictObject({ decision: RosterRowDecisionSchema, reason: ReasonTextSchema.nullable() }),
		response: RosterImportRowSchema,
	}),
	acceptAllNewAndUpdates: defineEndpoint({
		method: "POST",
		path: "/portal/roster-imports/:batchId/accept-new-and-updates",
		summary: "批量接受 New 和 Update 行（其他状态不能批量接受）",
		access: portalAccess("Facility", "FacilityManager", "ProviderAdmin"),
		params: BatchParams,
		response: RosterImportBatchSchema,
	}),
	applyRosterImport: defineEndpoint({
		method: "POST",
		path: "/portal/roster-imports/:batchId/apply",
		summary: "生效；有 Conflict 或未决定行时拒绝；含身份字段变化时转为等待第二人确认",
		access: portalAccess("Facility", "FacilityManager", "ProviderAdmin"),
		params: BatchParams,
		response: RosterImportBatchSchema,
	}),
	confirmRosterImport: defineEndpoint({
		method: "POST",
		path: "/portal/roster-imports/:batchId/confirm",
		summary: "第二人确认（Clinical Lead 或另一位 FM；不能是上传人）",
		access: portalAccess("Facility", "FacilityManager", "ClinicalLead"),
		params: BatchParams,
		response: RosterImportBatchSchema,
	}),
	revertRosterImport: defineEndpoint({
		method: "POST",
		path: "/portal/roster-imports/:batchId/revert",
		summary: "整批撤销（只限本批新建且尚未产生任何记录的住户）",
		access: portalAccess("Facility", "FacilityManager", "ProviderAdmin"),
		params: BatchParams,
		body: z.strictObject({ reason: ReasonTextSchema }),
		response: RosterImportBatchSchema,
	}),
} as const;
