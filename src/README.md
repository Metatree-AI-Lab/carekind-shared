# src

`@carekind/shared` 的源代码，按职责分成七个目录：

- `schemas/` — 数据结构（zod schema 和 TypeScript 类型）
- `contracts/` — API 端点定义，端点清单见 `contracts/README.md`
- `api-client/` — 前端调用 API 的类型化客户端
- `policy/` — 业务规则（配置只能调严、限额、four-eyes 等）
- `format/` — 日期显示格式（DD/MM/YYYY）
- `styles/` — 设计系统 CSS（从 meta repo 复制）
- `ui/` — React 组件库（设计系统 DS-5），用 `@carekind/shared/ui` 引用，不包含在根入口里

入口 `index.ts` 汇总导出全部内容；也可以按子路径引用，例如 `@carekind/shared/schemas`。
