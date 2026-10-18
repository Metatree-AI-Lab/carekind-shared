# CLAUDE.md — ui（React 组件库，设计系统 DS-5）

> 层级：功能模块 · 路径：`06-app-development/shared/src/ui/` · 上级上下文：[`../CLAUDE.md`](../CLAUDE.md)
> 本文件给 AI 看；给人看的说明在同目录的 `README.md`。

## 这里是什么
React 19 + TypeScript 组件，按 meta repo `06-app-development/design/COMPONENTS.md` 实现。引用：`import { Button } from "@carekind/shared/ui"`，页面还要先引入 `@carekind/shared/styles/tokens.css` 再引入 `components.css`。第一阶段只覆盖 **Super Admin 主路径**（Lightman 18/10/2026）。

## 组件清单
| 组件 | 文件 | COMPONENTS.md |
|---|---|---|
| Icon（内部用）、Button、IconButton | `base/icon.tsx`、`base/button.tsx` | §1.3、§3 |
| Field、TextInput（含 `type="search"`）、Select（原生） | `base/field.tsx` | §4、§5 |
| Checkbox、Switch | `base/choice.tsx` | §7 |
| Tag、Card、Alert、Spinner、EmptyState | `base/display.tsx` | §10、§11.4、§12 |
| Table、TableHeaderCell、nextSort | `base/table.tsx` | §10、§12A.3 排序 |
| Tabs | `base/tabs.tsx` | §9 |
| ToastProvider、useToast | `base/toast.tsx` | §11.2 |
| Dialog | `base/dialog.tsx` | §11.3 |
| AppShell（含 SideNav、租户名、Demo / 支持访问标识条） | `admin/app-shell.tsx` | §12A.1 |
| PageHeader | `admin/page-header.tsx` | §12A.2 |
| DataTable（筛选栏 + 排序 + 4 种状态） | `admin/data-table.tsx` | §12A.3 子集 |
| ConfirmNameDialog、isConfirmNameMatch | `admin/confirm-name-dialog.tsx` | §12A.10 |
| StatCard、StatGrid、formatMetricValue | `admin/stat-card.tsx` | §12A.11 |

**后续（第一阶段不做）**：Link、Textarea 独立组件、Radio、Badge、Pagination、Breadcrumb、Skeleton、Menu、自定义 Dropdown、Combobox、DateInput、Drawer、Stepper、DiffView、AuditList（先用 Table）、DataTable 的行选择 / 批量操作 / 已选筛选 chips / 分页。规格已在 COMPONENTS.md。

## 使用规则
- 样式只用 `ck-` 类和 tokens 变量；组件不接受 `style`，不写内联颜色 / 像素；不引入 UI 库。
- 受控组件：Dialog / ConfirmNameDialog 的 Esc、遮罩、关闭按钮只调用 `onClose`，由页面决定是否关闭（有未保存输入时先确认）。
- StatCard **没有**趋势、评分、风险色、排名的 props，也不要在外面拼上去（PRD §9 G3 / G10）。没有数据传 `value={null}`，不用 0。
- AppShell 的标识条不能关闭；没有权限的导航项直接不传。
- Super Admin 表格不出现住户姓名和临床内容，只显示数量与 ID。
- 界面文字澳式英语；日期用 `src/format`（DD/MM/YYYY）。

## 测试
`npx vitest run src/ui/base/dialog.test.tsx src/ui/admin/confirm-name-dialog.test.tsx src/ui/admin/stat-card.test.tsx`（文件头 `// @vitest-environment jsdom`）。

## 不要做
- 不要从包根 `src/index.ts` 导出 ui（API 不依赖 React）。
- 不要做住户归属选择、同名提示等 DS-4 组件；不要加护士端组件。
