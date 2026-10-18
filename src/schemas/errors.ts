import { z } from "zod";

// API 错误响应。对外错误信息不能泄露内部细节或健康信息（rules/02 §5）。

export const API_ERROR_CODES = [
	"Unauthenticated",
	"Forbidden",
	"NotFound",
	"ValidationFailed",
	"Conflict",
	/** 配置比上一层更松（"This setting can only be made stricter than ..."）。 */
	"LooserThanBaseline",
	/** 超过套餐限额（"Your plan allows 40 staff accounts. ..."）。 */
	"PlanLimitReached",
	/** 需要第二人批准，或批准人与发起人相同。 */
	"FourEyesRequired",
	/** 存在阻断项（停用前检查、转院阻断、导入 Conflict）。 */
	"BlockedByOpenItems",
	/** Provider 生命周期状态不允许此操作（例如 Suspended 时新建）。 */
	"TenantStateDisallows",
	"RateLimited",
	"Internal",
] as const;
export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorBodySchema = z.object({
	code: ApiErrorCodeSchema,
	/** 给用户看的澳式英语说明。 */
	message: z.string().min(1).max(500),
	/** 字段级问题（只含字段路径和问题代码）。 */
	fieldIssues: z.array(z.object({ path: z.string().max(200), issue: z.string().max(200) })).optional(),
	/** 方便支持排查的请求 ID。 */
	requestId: z.string().max(100).optional(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
