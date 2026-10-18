# CLAUDE.md — api-client（类型化 API 客户端）

> 层级：功能模块 · 路径：`06-app-development/shared/src/api-client/` · 上级上下文：[`../CLAUDE.md`](../CLAUDE.md)

## 这里是什么
基于 `fetch` 的客户端：输入、输出类型从 `../contracts/` 推导；发送前用契约校验输入，收到后用 response schema 校验响应（服务器响应也是边界输入）。认证靠 httpOnly cookie（`credentials: "include"`），代码碰不到 token。

## 关键函数
| 签名 | 做什么 | 不变量 |
|---|---|---|
| `createApiClient({ baseUrl, fetchImpl? }): ApiClient` | 返回 `call(endpoint, input)` | 输入不合法时不发请求；非 2xx 抛 `ApiRequestError`；响应不符合契约抛 `ApiResponseValidationError` |
| `bindEndpoints(client, endpoints.portal)` | 把一组契约绑定成调用函数 | 函数名 = 契约 key |
| `buildRequestUrl(baseUrl, path, params, query)` | 填路径参数、拼查询串 | 参数值用 `encodeURIComponent` |

## 规则
- 错误必须显式抛出；错误对象只带字段路径，不带字段值（可能含姓名）。
- 不加重试、缓存等功能：前端用 TanStack Query 处理（ADR-0006）。

## 不要做
- 不要引入 axios 等 HTTP 库；不要在这里存 token 或用 localStorage。
