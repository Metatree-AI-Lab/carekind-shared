# CLAUDE.md — ui/base（通用组件）

> 层级：功能模块 · 路径：`06-app-development/shared/src/ui/base/` · 上级上下文：[`../CLAUDE.md`](../CLAUDE.md)

## 这里是什么
COMPONENTS.md §3–§12 的通用 React 组件：Button、IconButton、Field、TextInput、Select、Checkbox、Switch、Tag、Card、Alert、Spinner、EmptyState、Table、Tabs、Toast、Dialog。

## 规则
- 一个文件一组相关组件，≤ 500 行；只用 `ck-` 类。
- 优先原生元素；自定义交互按 WAI-ARIA 模式（Tabs 漫游 tabindex，Switch `role="switch"`）。
- 排序逻辑只在 `table.tsx`（`TableHeaderCell`、`nextSort`），DataTable 复用。
- Field 用 render prop 把 `id`、`aria-describedby`、`aria-invalid` 交给控件。

## 关键函数
- `Dialog`（`dialog.tsx`）：原生 `dialog` + `showModal()`；自己处理 Tab 循环与 Esc（不依赖浏览器差异）；打开时聚焦 `initialFocusRef` 或第一个可聚焦元素，关闭后焦点回到打开前的元素；关闭时卸载内容（内部状态自然重置）。不变量：Esc / 遮罩只调用 `onClose`，从不自行关闭。
- `ToastProvider`（`toast.tsx`）：最多 3 个；success / info 且无操作的 8 秒后消失，悬停 / 聚焦暂停并保留剩余时间；错误不自动消失。

## 测试与验收
`dialog.test.tsx`：初始焦点、Tab 限制、Esc 关闭并返回焦点。

## 不要做
- 不要加入 COMPONENTS.md 没有规格的组件或变体；先补规格。
