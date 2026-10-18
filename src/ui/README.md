# ui

careKind 设计系统的 React 组件（DS-5）。规格以 meta repo 的 `06-app-development/design/COMPONENTS.md` 为准，样式来自 `../styles/`。

```tsx
import "@carekind/shared/styles/tokens.css";
import "@carekind/shared/styles/components.css";
import { AppShell, Button, DataTable, ToastProvider } from "@carekind/shared/ui";
```

- `base/`：通用组件（按钮、表单、标签、卡片、表格、标签页、提示、Toast、对话框）
- `admin/`：管理端组件（应用框架、页面头部、数据表、名称确认对话框、数字卡片）

第一阶段只做 Super Admin 需要的组件；清单和"后续"见 `CLAUDE.md`。
