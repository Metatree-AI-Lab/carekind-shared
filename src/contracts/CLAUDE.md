# CLAUDE.md — contracts（API 契约）

> 层级：功能模块 · 路径：`06-app-development/shared/src/contracts/` · 上级上下文：[`../CLAUDE.md`](../CLAUDE.md)

## 这里是什么
把 API 定义成数据结构：每个端点的 method、path、权限要求（app + 权限 / 角色 + 范围）、params / query / body / response 的 zod schema、是否写审计。API repo（meta 路径 `06-app-development/app`）据此实现路由；前端用 `../api-client/` 调用。端点清单和实现约定见同目录 `README.md`。

## 关键函数
| 签名 | 做什么 | 不变量 |
|---|---|---|
| `defineEndpoint(definition): EndpointContract` | 补齐缺省的 params / query / body（`NoInput`）和 `isAudited` | 非 GET 默认写审计 |
| `superAdminAccess(...permissions)` / `portalAccess(scope, ...roles)` | 权限要求的快捷写法 | 空列表 = 任何已登录用户，不等于公开 |

## 规则
- 新端点默认需要登录（只有 `auth.ts` 里的登录 / 刷新 / 登出 / 邀请 / 进入 Demo 是 public）。
- Super Admin 端点不能读取住户或记录内容（`contracts.test.ts` 检查）。
- portal 端点不接收 `providerId` 参数：租户来自会话。
- 改了端点（增删、改路径或权限）必须同步更新 `README.md` 的端点清单，并运行 `npx vitest run src/contracts/contracts.test.ts`。
- 单文件超过约 400 行就按页面域拆分新文件，并在 `index.ts` 汇总。

## 不要做
- 不要引入 NestJS / React 等框架代码；不要在这里写业务判断（放 `../policy/`）。
- 不要加护士端端点（口述、转写、起草、审核、交接、导出）。
