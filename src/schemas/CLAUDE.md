# CLAUDE.md — schemas（实体与枚举）

> 层级：功能模块 · 路径：`06-app-development/shared/src/schemas/` · 上级上下文：[`../CLAUDE.md`](../CLAUDE.md)

## 这里是什么
管理端（Super Admin + Provider Portal）全部实体、枚举的 zod schema，以及用 `z.infer` 推导的类型。API 和前端共用这一份定义（rules/02 §2.2：类型和校验只写一份）。

## 关键文件
| 文件 | 实体 |
|---|---|
| `common.ts` | ID（UUID）、ISO 日期 / 日期时间、州枚举、地址、分页、原因文本、外部引用 |
| `tenancy.ts` | Provider（生命周期）、Region、Facility、Unit |
| `staff.ts` | 角色（护士端 / 管理端）、StaffMember（多院分配、状态）、AuthorSnapshot、停用检查、临床角色授予 |
| `resident.ts` | Resident（同意、联系人只存姓名和关系）、ResidentTransfer |
| `roster-import.ts` | 名单 CSV 行、RosterImportBatch、逐行结果（姓名不作匹配键） |
| `workflow-config.ts` | 流程配置第 1、2、4、7、8 项 |
| `config-version.ts` | ConfigLayer、ConfigVersion、生效配置 |
| `content.ts` | StateRulePack、过渡期开关、DocumentTemplateRef、FeatureFlag（默认关） |
| `commercial.ts` | Plan（限额单位 seat / bed / facility）、ComplianceStatus、泄露登记、上线清单状态 |
| `support-access.ts` | SupportAccessRequest（时长 ≤ 4 小时） |
| `audit.ts` | AuditEvent（只追加、哈希链、不含健康信息） |
| `dashboard.ts` | DashboardMetric（必带口径和 isSample） |
| `super-admin.ts` | 权限组、权限、内部用户、four-eyes 审批 |
| `auth.ts` / `errors.ts` | 登录与当前用户（两个 audience）、API 错误体 |

## 规则
- 每个 schema 旁边导出同名类型（`FooSchema` → `type Foo`）；枚举同时导出 `FOO_VALUES` 常量。
- 导出的 zod schema 常量不另写类型注解：类型由定义推导，这是唯一来源（rules/02 §14 的例外，理由：手写会产生第二份定义）。
- 新增字段先查两份管理端 PRD；PRD 没写的取值标 `⚠️ 需 Lightman 确认`。
- 不加任何临床内容字段（记录正文、草稿、转写）；审计和日志字段只放 ID 和代码。

## 不要做
- 不要在 schema 里写业务判断（放 `../policy/`）。
- 不要用真实姓名做示例。
