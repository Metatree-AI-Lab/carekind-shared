import { z } from "zod";
import { IdSchema } from "../schemas/common.ts";

// 常用路径参数 schema。路径参数都是 UUID，除了规则包 ID、功能开关 key、清单项编号。

export const ProviderParams = z.strictObject({ providerId: IdSchema });
export const FacilityParams = z.strictObject({ facilityId: IdSchema });
export const StaffParams = z.strictObject({ staffId: IdSchema });
export const ResidentParams = z.strictObject({ residentId: IdSchema });
export const TransferParams = z.strictObject({ transferId: IdSchema });
export const BatchParams = z.strictObject({ batchId: IdSchema });
export const ApprovalParams = z.strictObject({ approvalId: IdSchema });
export const SupportRequestParams = z.strictObject({ requestId: IdSchema });
export const UserParams = z.strictObject({ userId: IdSchema });
export const TemplateParams = z.strictObject({ templateId: IdSchema });
export const ConfigVersionParams = z.strictObject({ versionId: IdSchema });
export const GrantParams = z.strictObject({ grantId: IdSchema });
export const RulePackParams = z.strictObject({ rulePackId: z.string().min(1).max(40) });
export const FlagParams = z.strictObject({ flagKey: z.string().min(1).max(64) });
export const ChecklistItemParams = z.strictObject({
	facilityId: IdSchema,
	itemNumber: z.coerce.number().int().min(1).max(19),
});
export const ImportRowParams = z.strictObject({
	batchId: IdSchema,
	rowNumber: z.coerce.number().int().min(2),
});
