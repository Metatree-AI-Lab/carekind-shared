# policy

管理端的业务规则，API 和前端都调用同一份：

- **只能调严**：`findLooserSettings` / `isStricterOrEqual` 判断机构的新设置有没有比上一层（careKind 平台下限或公司层政策）更松；更松就拒绝保存，并给出原因（例如 "Fall can't be set below Tier 3."）。
- **生效配置**：`resolveEffectiveConfig` 把平台、公司、单院三层合并，逐项取更严的值。
- **硬底线与默认值**：`PLATFORM_HARD_FLOOR`（任何人都不能放松）和 `PLATFORM_DEFAULT_CONFIG`（careKind 默认值）。
- **套餐限额**：`checkPlanLimit` 和提示文字 `planLimitMessage`。
- **four-eyes 与生命周期**：`canDecideApproval`、`canTransitionProvider`、支持访问时长与范围规则。
