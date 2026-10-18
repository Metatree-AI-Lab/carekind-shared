# CLAUDE.md — ui/admin（管理端组件）

> 层级：功能模块 · 路径：`06-app-development/shared/src/ui/admin/` · 上级上下文：[`../CLAUDE.md`](../CLAUDE.md)

## 这里是什么
COMPONENTS.md §12A 的管理端组件（第一阶段 Super Admin 子集）：AppShell、PageHeader、DataTable、ConfirmNameDialog、StatCard。

## 规则
- 只依赖 `../base/`、`../../format/`、`../../schemas/`（类型）。
- AppShell 的 Demo / 支持访问标识条不能关闭；顶栏永远写当前租户全称。
- DataTable 不做整行点击、不做排名列；Super Admin 列表只显示数量与 ID。
- StatCard 不提供趋势、评分、风险色、排名；没有数据显示 "No data yet"。

## 关键函数
- `isConfirmNameMatch(typed, expectedName): boolean`：去掉首尾空格后区分大小写完全一致（§12A.10）。
- `ConfirmNameDialog`：原因必填 + 名称匹配才调用 `onConfirm({ reason })`；最终按钮保持可点，不匹配时显示行内错误；确认字段里 Enter 不提交；初始焦点在原因字段；有输入时点遮罩不关闭。
- `formatMetricValue(metric: MetricValue): StatDisplayValue`：只格式化共享 schema 的指标值，不推算；Suppressed → "Fewer than N"，NoData → null。

## 测试与验收
`confirm-name-dialog.test.tsx`（匹配规则、不提交、原因必填、初始焦点）、`stat-card.test.tsx`（口径与样例标记、无趋势 / 颜色、No data yet）。

## 不要做
- 不要在这里做 Combobox、Drawer、Stepper、DiffView、AuditList、DateInput（后续，见 `../CLAUDE.md`）。
