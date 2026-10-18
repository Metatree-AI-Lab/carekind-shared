# CLAUDE.md — src（共享包源代码）

> 层级：代码目录 · 路径：`06-app-development/shared/src/` · 上级上下文：[`../CLAUDE.md`](../CLAUDE.md)
> 本文件给 AI 看；给人看的说明在同目录的 `README.md`。

## 这里是什么
`@carekind/shared` 的全部源代码。第一阶段不构建：各 repo 用 `"@carekind/shared": "file:../shared"` 直接引用这里的 TypeScript 源码。

## 目录
| 目录 | 内容 |
|---|---|
| `schemas/` | 管理端全部实体与枚举的 zod schema + `z.infer` 类型（唯一来源） |
| `contracts/` | API 端点定义（method、path、权限、request/response schema）与 `endpoints` 汇总 |
| `api-client/` | 基于 fetch 的类型化客户端，响应用 zod 校验 |
| `policy/` | 纯业务规则："只能调严"、生效配置合并、平台硬底线、套餐限额、four-eyes |
| `format/` | 显示格式化（DD/MM/YYYY） |
| `styles/` | 从 meta repo 复制的 `tokens.css`、`components.css`（不要手改） |
| `ui/` | React 19 组件库（DS-5），只用 `ck-` 类；入口 `@carekind/shared/ui`，不从包根导出 |

## 规则
- 依赖方向：`contracts → schemas`，`policy → schemas`，`api-client → contracts + schemas`；`schemas` 不依赖其他目录。
- 相对导入写 `.ts` 扩展名（Node 类型剥离和 Vite 都能直接运行源码）；只用可擦除的 TS 语法（不用 enum、namespace）。
- 测试和源码放在同一目录（`*.test.ts`），不建 `__tests__/` 等新目录；新目录必须立刻补 README.md + CLAUDE.md + AGENTS.md 软链接。
- 测试数据只用虚构的 Wattle Grove Care Group。
- 本机只运行自己新写的个别测试文件：`npx vitest run src/<dir>/<file>.test.ts`。

## 不要做
- 不要写 NestJS 等后端框架代码；React 只放在 `ui/`（其他目录保持框架无关，API 也要能引用）；不要放 Demo 种子数据（属于 API repo）。
- 不要加入护士端功能（口述、转写、起草、审核、交接、导出）。
