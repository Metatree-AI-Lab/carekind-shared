# ui/base

通用 React 组件：按钮、表单字段、复选框和开关、标签、卡片、提示、加载、空状态、表格、标签页、Toast、对话框。规格见 meta repo `06-app-development/design/COMPONENTS.md` §3–§12。

Toast 需要在应用根部包一层 `<ToastProvider>`，然后在组件里用 `useToast().showToast({ variant, title })`。

## 后台视觉统一（18/10/2026）

Owner: Lightman · Status: Local revision · Last reviewed: 18/10/2026

Table 在手机上显示带字段名的记录，保留 caption 和排序；后台导航使用共享 building / history 图标。
