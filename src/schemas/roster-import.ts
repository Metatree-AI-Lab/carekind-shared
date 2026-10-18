import { z } from "zod";
import { IdSchema, IsoDateSchema, IsoDateTimeSchema, PersonNameSchema, ReasonTextSchema } from "./common.ts";
import { FacilityResidentIdSchema } from "./resident.ts";

// 名单 CSV 分步导入：Provider Portal PRD §4.5。错配是最大的临床危害，所以：
// - 姓名不作匹配键；匹配键 = 机构住户 ID 或 CMS ID + 出生日期；
// - Possible match 必须人工逐行决定；Conflict 必须先修正文件；Missing 只列出，不自动办理离开。

/** CSV 模板的一行（边界输入，上传后先用它校验结构）。列名与 careKind 模板一致。 */
export const RosterCsvRowSchema = z.object({
	facilityResidentId: FacilityResidentIdSchema,
	cmsId: z.string().trim().max(60).optional(),
	legalName: PersonNameSchema,
	preferredName: z.string().trim().max(120).optional(),
	dateOfBirth: IsoDateSchema,
	unitName: z.string().trim().max(120).optional(),
	room: z.string().trim().max(20).optional(),
	startDay: IsoDateSchema.optional(),
});
export type RosterCsvRow = z.infer<typeof RosterCsvRowSchema>;

/** 每行比对结果。只有 New 和 Update 可以批量接受。 */
export const ROSTER_ROW_STATUSES = ["New", "Update", "PossibleMatch", "Conflict", "Missing", "NearName"] as const;
export const RosterRowStatusSchema = z.enum(ROSTER_ROW_STATUSES);
export type RosterRowStatus = z.infer<typeof RosterRowStatusSchema>;

/** 结构校验和比对时发现的问题代码（不含住户姓名，便于记日志）。 */
export const ROSTER_ISSUE_CODES = [
	"MissingRequiredColumn",
	"InvalidDate",
	"DateOfBirthOutOfRange",
	"InvalidRoomFormat",
	"DuplicateRowInFile",
	"DateOfBirthMismatch",
	"MatchKeyMissing",
	"SimilarName",
	"BedOccupiedByAnotherResident",
	"IdentityChangedWithConfirmedRecords",
	"NotInFile",
] as const;
export const RosterIssueCodeSchema = z.enum(ROSTER_ISSUE_CODES);
export type RosterIssueCode = z.infer<typeof RosterIssueCodeSchema>;

export const ROSTER_ROW_DECISIONS = ["Undecided", "Accept", "SamePerson", "DifferentPerson", "Skip"] as const;
export const RosterRowDecisionSchema = z.enum(ROSTER_ROW_DECISIONS);
export type RosterRowDecision = z.infer<typeof RosterRowDecisionSchema>;

export const RosterImportRowSchema = z.object({
	batchId: IdSchema,
	/** CSV 中的行号（从 2 开始，第 1 行是表头）；Missing 行没有 CSV 行，为 null。 */
	rowNumber: z.number().int().min(2).nullable(),
	status: RosterRowStatusSchema,
	/** 结构合法时的解析结果；Missing 行为 null。 */
	parsed: RosterCsvRowSchema.nullable(),
	/** 比对到的现有住户；New 行为 null。 */
	matchedResidentId: IdSchema.nullable(),
	issues: z.array(RosterIssueCodeSchema),
	decision: RosterRowDecisionSchema,
	/** PossibleMatch 必须写原因。 */
	decisionReason: ReasonTextSchema.nullable(),
	decidedBy: IdSchema.nullable(),
	decidedAt: IsoDateTimeSchema.nullable(),
});
export type RosterImportRow = z.infer<typeof RosterImportRowSchema>;

export const ROSTER_BATCH_STATUSES = [
	"AwaitingDecisions",
	"BlockedByConflicts",
	"AwaitingSecondConfirmation",
	"Applied",
	"Reverted",
	"Discarded",
] as const;
export const RosterBatchStatusSchema = z.enum(ROSTER_BATCH_STATUSES);
export type RosterBatchStatus = z.infer<typeof RosterBatchStatusSchema>;

export const RosterImportBatchSchema = z.object({
	id: IdSchema,
	providerId: IdSchema,
	facilityId: IdSchema,
	fileName: z.string().min(1).max(200),
	/** 原文件的 SHA-256（十六进制）。原文件处理完后删除，只保留校验和。 */
	fileChecksum: z.string().regex(/^[a-f0-9]{64}$/),
	status: RosterBatchStatusSchema,
	rowCount: z.number().int().min(0),
	countsByStatus: z.record(RosterRowStatusSchema, z.number().int().min(0)),
	/** 本批含身份字段变化时，需要第二人确认（Clinical Lead 或另一位 FM）。 */
	requiresSecondConfirmation: z.boolean(),
	uploadedBy: IdSchema,
	confirmedBy: IdSchema.nullable(),
	createdAt: IsoDateTimeSchema,
	appliedAt: IsoDateTimeSchema.nullable(),
	revertedAt: IsoDateTimeSchema.nullable(),
});
export type RosterImportBatch = z.infer<typeof RosterImportBatchSchema>;
