# carekind-shared

careKind AI — 共享包 `@carekind/shared`：管理端（Super Admin + Provider Portal）共用的**契约层**。

- zod schema 与 TypeScript 类型（`src/schemas/`）
- API 契约：每个端点的 method、path、权限、request / response schema（`src/contracts/`，端点清单见 `src/contracts/README.md`）
- 类型化 API 客户端（`src/api-client/`）
- 业务规则：配置只能调严、生效配置合并、套餐限额、four-eyes（`src/policy/`）
- 日期显示 DD/MM/YYYY（`src/format/`）
- 设计系统 CSS（`src/styles/`，从 meta repo 复制）
- React 组件库（`src/ui/`，设计系统 DS-5；`import { Button } from "@carekind/shared/ui"`）

本 repo 是 [`Metatree-AI-Lab/carekind`](https://github.com/Metatree-AI-Lab/carekind) 的 submodule（`06-app-development/shared/`）。**产品需求、设计、规则和所有文档都在 meta repo**。

## 怎么引用
第一阶段不构建、不发布：兄弟 repo 用本地路径依赖直接引用 TypeScript 源码（ADR-0006）。

```json
"dependencies": { "@carekind/shared": "file:../shared" }
```

```ts
import { ResidentSchema } from "@carekind/shared/schemas";
import { endpoints } from "@carekind/shared/contracts";
import { createApiClient, bindEndpoints } from "@carekind/shared/api-client";
import { findLooserSettings } from "@carekind/shared/policy";
import { formatDateAu } from "@carekind/shared/format";
import "@carekind/shared/styles/tokens.css";
```

源码相对导入带 `.ts` 扩展名、只用可擦除的 TS 语法，所以 Vite 和 Node ≥ 22.18（类型剥离）都能直接运行；用 `tsc` 编译的项目需要开启 `allowImportingTsExtensions`（配合 `noEmit` 或打包器）。

## 命令
```bash
npm install
npx vitest run src/policy/workflow-strictness.test.ts   # 运行单个测试文件
npm test          # 全部测试（只在 GitHub Actions 云端运行，见下）
npm run typecheck # tsc --noEmit
npm run lint      # eslint（no-explicit-any、explicit-module-boundary-types、no-empty）
npm run format    # prettier（Tab 缩进，宽度 4）
```
按 owner 全局规则，本机只运行自己改动的个别测试文件；全量测试、类型检查、lint 放到 GitHub Actions，在明确要求部署时才触发。

## 依赖（最少依赖，rules/02 §11）
| 依赖 | 理由 |
|---|---|
| `zod` | 唯一运行时依赖：schema 同时生成校验和类型（ADR-0006 已定） |
| `typescript`、`vitest`、`eslint` + `typescript-eslint`、`prettier`（dev） | 类型、测试、lint、格式化工具链（ADR-0006） |
| `react`、`react-dom`（peer，可选） | `src/ui/` 的组件库（ADR-0006 前端用 React 19）；做成可选 peer，API 只用契约层时不需要安装 React |
| `react`、`react-dom`、`@types/react`、`@types/react-dom`（dev） | 本 repo 里写组件和跑组件测试 |
| `@testing-library/react` + `@testing-library/dom`、`jsdom`（dev） | 组件行为测试（焦点、键盘、匹配规则）需要 DOM；`@testing-library/dom` 是前者的 peer 依赖。不引入 user-event，用 `fireEvent` 就够 |

`typescript` 锁在 5.9：`typescript-eslint` 目前只支持到 TypeScript 6.0 以下。
