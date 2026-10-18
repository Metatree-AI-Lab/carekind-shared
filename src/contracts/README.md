# contracts — API 契约

管理端（Super Admin + Provider Portal）全部 API 端点的**数据定义**：method、path、权限要求、request（params / query / body 的 zod schema）、response zod schema、是否写审计。API（`carekind-api`，meta 路径 `06-app-development/app`）据此注册路由和校验；前端用 `src/api-client/` 生成类型化调用。

规格来源：meta repo `docs/prds/2026-10-18-super-admin-multi-facility-console.md`、`docs/prds/2026-10-18-provider-portal-facility-admin.md`（MVP 范围），技术默认值见 `06-app-development/engineering/adr/0006-phase1-admin-implementation-defaults.md`。

## 怎么用
```ts
import { endpoints } from "@carekind/shared/contracts";

const endpoint = endpoints.portal.proposeWorkflowConfig;
endpoint.method;            // "POST"
endpoint.path;              // "/portal/workflow-config/versions"
endpoint.access;            // { app: "portal", isPublic: false, roles: [...], scope: "Provider" }
endpoint.body.parse(input); // 边界校验
```

## 约定（API 实现时必须遵守）
- **权限**：`super-admin` 端点要求用户至少有列出的一个权限（`SUPER_ADMIN_GROUP_PERMISSIONS` 把权限组映射到权限）；`portal` 端点要求用户在请求范围内至少有一个列出的角色。空列表 = 任何已登录用户。范围过滤（只返回有权限的 Facility）始终在 API 执行。
- **租户上下文**：portal 端点的 `providerId` 来自登录会话，**不从请求里取**；Super Admin 端点只连控制面，没有读取住户或记录内容的端点。
- **four-eyes**：返回 `ApprovalRequest` 的端点只创建待批准申请；批准人不能是发起人（`FourEyesRequired`）。
- **只能调严**：`proposeWorkflowConfig`、`draftPlatformConfig`、`rollbackWorkflowConfig` 用 `src/policy/` 的 `findLooserSettings` 校验；更松时返回 `LooserThanBaseline` 并写一条 `outcome: "Rejected"` 的审计。
- **限额**：`createFacility`、`inviteStaff` 用 `checkPlanLimit`；超限返回 `PlanLimitReached`，已有员工不停用。
- **审计**：`isAudited: true` 的端点每次调用写一条只追加的 `AuditEvent`（只记 ID 和代码，不记姓名或健康信息）。`getResident` 是读取审计。
- **错误**：非 2xx 响应体用 `ApiErrorBodySchema`（`src/schemas/errors.ts`）。
- **Demo**：`isDemo` 会话只看到虚构的 Wattle Grove Care Group；邀请邮件等返回 `isSimulated` / `isEmailSimulated: true`。

## 文件
| 文件 | 内容 |
|---|---|
| `define.ts` | `EndpointContract`、`defineEndpoint`、`superAdminAccess`、`portalAccess`、`NoInput` |
| `params.ts` | 常用路径参数 schema |
| `auth.ts` | 登录、刷新、登出、当前用户、接受邀请、进入 Demo（两个 audience） |
| `super-admin-tenancy.ts` | Provider / Region / Facility / Unit、生命周期、首个 Owner、合规状态、泄露登记、套餐、上线清单 |
| `super-admin-platform.ts` | 审批、州规则包、过渡期开关、模板库、平台下限、功能开关、支持访问、审计、指标、内部用户、Demo 重置 |
| `portal-organisation.ts` | 范围、Provider 只读信息、Facility / Unit、员工、临床角色授予 |
| `portal-residents.ts` | 住户、同意、联系人、房间、状态、转院、名单 CSV 导入 |
| `portal-governance.ts` | 流程配置、规则包只读、上线清单、看板、审计、支持访问审批、Demo 重置 |
| `index.ts` | `endpoints` 汇总对象（`auth` / `superAdmin` / `portal`） |
| `contracts.test.ts` | 契约自检（路径唯一、前缀、路径参数一致、写操作审计） |

## MVP 未覆盖（需要时再加端点）
- 终止时的返还包与删除证明（Super Admin PRD §4-D 第 2–5 步）：目前只有 `requestProviderLifecycleChange` 申请 `Terminating` / `Terminated`。
- 员工批量 CSV 邀请、APP 12 请求工作台、CMS 名单同步（Provider Portal PRD §4.11 列为 Phase 2）。
- 流程第 3、5、6 项（TGA 🟡，审查通过后才做）。

## 端点清单
> 由 `contracts/index.ts` 生成（18/10/2026）。改了端点要同步更新这张表。

### auth
| key | method | path | 权限 | 说明 |
|---|---|---|---|---|
| `superAdminLogin` | POST | `/auth/super-admin/login` | public | Super Admin 邮箱 + 密码登录，设置 super-admin audience 的 cookie |
| `superAdminRefresh` | POST | `/auth/super-admin/refresh` | public | 用 refresh cookie 轮换 access / refresh token |
| `superAdminLogout` | POST | `/auth/super-admin/logout` | public | 撤销当前 refresh token 并清除 cookie |
| `superAdminMe` | GET | `/auth/super-admin/me` | 任何已登录用户 | 当前 Super Admin 用户、权限组和权限 |
| `superAdminEnterDemo` | POST | `/auth/super-admin/demo-session` | 任何已登录用户 | 进入 Demo console（只含虚构 Provider，24 小时过期，修改只作用于本会话） |
| `portalLogin` | POST | `/auth/portal/login` | public | Provider Portal 邮箱 + 密码登录，设置 portal audience 的 cookie |
| `portalRefresh` | POST | `/auth/portal/refresh` | public | 用 refresh cookie 轮换 access / refresh token |
| `portalLogout` | POST | `/auth/portal/logout` | public | 撤销当前 refresh token 并清除 cookie |
| `portalMe` | GET | `/auth/portal/me` | Provider: 任何管理端角色 | 当前管理端用户、Provider、管理端角色与范围 |
| `portalAcceptInvitation` | POST | `/auth/portal/invitations/accept` | public | 用一次性邀请链接（72 小时过期）设置密码并登录 |
| `portalEnterDemo` | POST | `/auth/portal/demo-session` | public | 以虚构 Demo 身份进入 Wattle Grove Care Group（隔离会话，可重置） |

### superAdmin
| key | method | path | 权限 | 说明 |
|---|---|---|---|---|
| `listProviders` | GET | `/super-admin/providers` | providers.read | 列出 Provider（可按生命周期状态筛选）；Demo console 中只有虚构 Provider |
| `createProvider` | POST | `/super-admin/providers` | providers.write | 新建 Provider（状态 Draft）；校验 ABN 格式、名称唯一 |
| `getProvider` | GET | `/super-admin/providers/:providerId` | providers.read | Provider 详情与计数（不含住户信息） |
| `updateProvider` | PATCH | `/super-admin/providers/:providerId` | providers.write | 修改 Provider 名称或商号 |
| `requestProviderLifecycleChange` | POST | `/super-admin/providers/:providerId/lifecycle-requests` | providers.lifecycle.request | 申请生命周期变更（激活 / 暂停 / 恢复 / 终止）；生成 four-eyes 审批，转 Active 需清单 100% |
| `listRegions` | GET | `/super-admin/providers/:providerId/regions` | providers.read | 列出 Provider 的 Region |
| `createRegion` | POST | `/super-admin/providers/:providerId/regions` | facilities.write | 新建 Region（只用于汇总和权限范围） |
| `listFacilities` | GET | `/super-admin/providers/:providerId/facilities` | providers.read | 列出 Provider 的 Facility（状态、规则包版本、上线清单完成度） |
| `createFacility` | POST | `/super-admin/providers/:providerId/facilities` | facilities.write | 代建 Facility；按地址州自动绑定当前规则包并返回预览；受套餐 facility 限额约束 |
| `updateFacility` | PATCH | `/super-admin/facilities/:facilityId` | facilities.write | 修改 Facility 名称、Region、床位数、是否州政府运营（州字段不能在这里改） |
| `requestFacilityStateChange` | POST | `/super-admin/facilities/:facilityId/state-change-requests` | facilities.write | 申请修改 Facility 地址 / 州；four-eyes，并返回规则包重新绑定预览 |
| `listUnits` | GET | `/super-admin/facilities/:facilityId/units` | providers.read | 列出 Facility 的 Unit / wing |
| `createUnit` | POST | `/super-admin/facilities/:facilityId/units` | facilities.write | 代建 Unit / wing |
| `inviteOwner` | POST | `/super-admin/providers/:providerId/owner-invitations` | providers.write | 邀请首个 Owner（一次性链接，72 小时过期；Demo 中显示 Simulated） |
| `listCompliance` | GET | `/super-admin/providers/:providerId/compliance` | providers.read | 签约与合规状态（合同、DPA、PIA、保险等；只有状态、日期、负责人、外部引用） |
| `upsertCompliance` | PUT | `/super-admin/providers/:providerId/compliance/:documentType` | compliance.write | 录入或更新一项合规状态；非标准条款必须有 Lightman 批准日期 |
| `getBreachRegistration` | GET | `/super-admin/providers/:providerId/breach-notification` | providers.read | 泄露通报登记（联系人、适用制度、careKind 承诺时限）；未登记时为 null |
| `upsertBreachRegistration` | PUT | `/super-admin/providers/:providerId/breach-notification` | compliance.write | 登记或更新泄露通报联系人和时限（上线清单 ★11） |
| `getPlan` | GET | `/super-admin/providers/:providerId/plan` | providers.read | 套餐、限额与账单状态（只记录）；未设置时为 null |
| `upsertPlan` | PUT | `/super-admin/providers/:providerId/plan` | plans.write | 设置套餐名称、限额（seat / bed / facility）、合同起止、账单状态 |
| `getGoLiveChecklist` | GET | `/super-admin/facilities/:facilityId/go-live-checklist` | providers.read | Facility 上线清单 19 项的完成情况（★ 为转 Active 硬门槛） |
| `updateGoLiveChecklistItem` | PATCH | `/super-admin/facilities/:facilityId/go-live-checklist/:itemNumber` | compliance.write | 更新 careKind 侧清单项（Provider 侧项只能在 Provider Portal 更新） |
| `listApprovals` | GET | `/super-admin/approvals` | approvals.decide, audit.read | four-eyes 审批队列（默认只看 Pending） |
| `approve` | POST | `/super-admin/approvals/:approvalId/approve` | approvals.decide | 第二人批准；批准人与发起人相同时返回 FourEyesRequired |
| `reject` | POST | `/super-admin/approvals/:approvalId/reject` | approvals.decide | 拒绝审批（必须写原因） |
| `listRulePacks` | GET | `/super-admin/rule-packs` | providers.read | 州规则包版本列表（可按州筛选） |
| `getRulePack` | GET | `/super-admin/rule-packs/:rulePackId` | providers.read | 规则包某个版本的条目与来源 |
| `draftRulePack` | POST | `/super-admin/rule-packs` | content.draft | 起草规则包新版本（版本号由 API 按 <STATE>-<YYYY.MM>-<n> 生成） |
| `requestRulePackPublish` | POST | `/super-admin/rule-packs/:rulePackId/publish-requests` | content.publish.request | 申请发布规则包（four-eyes；起草人不能批准）；先推 Demo Provider |
| `getRpConsentTransition` | GET | `/super-admin/settings/rp-consent-transition` | providers.read | 约束性措施同意过渡期开关（全局 + 按州覆盖） |
| `setRpConsentTransition` | PUT | `/super-admin/settings/rp-consent-transition` | content.draft | 人工切换过渡期开关（不会按日期自动切换；写审计） |
| `listTemplates` | GET | `/super-admin/document-templates` | providers.read | 全局文书模板库（引用 meta repo 模板名和版本） |
| `draftTemplateVersion` | POST | `/super-admin/document-templates` | content.draft | 登记模板新版本（Draft）；校验 🧑 人工字段不能标为 AI 可起草 |
| `requestTemplatePublish` | POST | `/super-admin/document-templates/:templateId/publish-requests` | content.publish.request | 申请发布模板版本（four-eyes） |
| `listPlatformConfig` | GET | `/super-admin/platform-config` | providers.read | Layer 1 平台默认与下限：每个流程项的当前版本 |
| `listPlatformConfigHistory` | GET | `/super-admin/platform-config/:item/versions` | providers.read | 某个流程项的平台下限版本历史 |
| `draftPlatformConfig` | POST | `/super-admin/platform-config/versions` | content.draft | 起草平台下限新版本（不能低于代码内硬底线）；生成 four-eyes 审批，可选推送范围 |
| `listFeatureFlags` | GET | `/super-admin/feature-flags` | providers.read | 功能开关（默认关；风险开关显示是否已登记律师意见） |
| `setFeatureFlagOverride` | PUT | `/super-admin/feature-flags/:flagKey/overrides` | flags.write | 设置某范围的开关值；全局打开需 four-eyes；风险开关无律师意见时拒绝 |
| `listSupportAccess` | GET | `/super-admin/support-access-requests` | support.request, audit.read | 支持访问申请列表（可按 Provider、状态筛选） |
| `createSupportAccess` | POST | `/super-admin/support-access-requests` | support.request | 发起支持访问申请（工单号、原因、范围、时长 ≤ 4 小时，默认 2 小时）；等待机构批准 |
| `startSupportSession` | POST | `/super-admin/support-access-requests/:requestId/start` | support.request | 已批准后开始只读会话（需重新输入密码确认）；签发短期只读 grant |
| `endSupportSession` | POST | `/super-admin/support-access-requests/:requestId/end` | support.request | 提前结束会话；生成访问摘要（只含对象类型和计数） |
| `listAuditEvents` | GET | `/super-admin/audit-events` | audit.read | Super Admin 自身与平台级审计（只读，只追加） |
| `listMetrics` | GET | `/super-admin/metrics` | metrics.read | 运营指标（聚合，带口径；小样本显示 Fewer than 5；Demo 标 isSample） |
| `listUsers` | GET | `/super-admin/users` | users.manage, audit.read | careKind 内部用户与权限组 |
| `setUserGroups` | PUT | `/super-admin/users/:userId/groups` | users.manage | 分配权限组（不能给自己加权限组） |
| `resetDemo` | POST | `/super-admin/demo/reset` | 任何已登录用户 | 重置本人的 Demo console 会话数据（只在 Demo 会话中可用） |

### portal
| key | method | path | 权限 | 说明 |
|---|---|---|---|---|
| `getScopes` | GET | `/portal/scopes` | Provider: 任何管理端角色 | 范围选择器数据：Provider → Region → 有权限的 Facility |
| `getProviderOverview` | GET | `/portal/provider` | Provider: Owner, ProviderAdmin | 本 Provider 的只读信息：套餐、限额、签约状态（由 Super Admin 管理） |
| `listFacilities` | GET | `/portal/facilities` | Provider: 任何管理端角色 | 有权限的 Facility 列表（规则包版本、是否公营） |
| `createFacility` | POST | `/portal/facilities` | Provider: Owner, ProviderAdmin | 自助新增 Facility；受套餐 facility 限额约束；必须二次确认州（之后只能经 Super Admin 修改） |
| `getFacility` | GET | `/portal/facilities/:facilityId` | Facility: 任何管理端角色 | Facility 详情（Rules pack: NSW · v…、Public sector） |
| `listUnits` | GET | `/portal/facilities/:facilityId/units` | Facility: 任何管理端角色 | Facility 的 Unit / wing |
| `createUnit` | POST | `/portal/facilities/:facilityId/units` | Facility: Owner, ProviderAdmin, FacilityManager | 新增 Unit / wing |
| `listStaff` | GET | `/portal/staff` | Provider: Owner, ProviderAdmin, FacilityManager, ClinicalLead | 员工列表（按范围过滤；可按 Facility、状态、姓名搜索） |
| `inviteStaff` | POST | `/portal/staff/invitations` | Facility: Owner, ProviderAdmin, FacilityManager | 邀请员工（状态 Invited）；超过 seat 限额返回 PlanLimitReached；Demo 中邮件为 Simulated |
| `getStaff` | GET | `/portal/staff/:staffId` | Facility: Owner, ProviderAdmin, FacilityManager, ClinicalLead | 员工详情（角色、分配、上线步骤；不含绩效或个人统计） |
| `updateStaff` | PATCH | `/portal/staff/:staffId` | Facility: Owner, ProviderAdmin, FacilityManager | 修改角色、多院分配、管理端角色 |
| `completeOnboardingStep` | POST | `/portal/staff/:staffId/onboarding-steps/:stepId/complete` | Facility: Owner, ProviderAdmin, FacilityManager, ClinicalLead | 标记一个上线步骤完成；全部完成后员工变为 Active |
| `attestRegistration` | POST | `/portal/staff/:staffId/registration-attestation` | Facility: ClinicalLead | Clinical Lead 证明 RN / EN 资质（"I have checked this person's registration"） |
| `getDeactivationCheck` | GET | `/portal/staff/:staffId/deactivation-check` | Facility: Owner, ProviderAdmin, FacilityManager | 停用前检查：列出阻断项（审核项、升级路由、FollowUp、交接） |
| `deactivateStaff` | POST | `/portal/staff/:staffId/deactivate` | Facility: Owner, ProviderAdmin, FacilityManager | 停用员工，立即撤销会话；有阻断项时返回 BlockedByOpenItems，除非选择先停用后处理 |
| `requestClinicalRoleGrant` | POST | `/portal/staff/:staffId/clinical-role-grants` | Provider: ProviderAdmin, ClinicalLead | 申请给非临床人员（例如 Owner）授予临床角色；需要第二人批准 |
| `listClinicalRoleGrants` | GET | `/portal/clinical-role-grants` | Provider: ProviderAdmin, ClinicalLead | 待批准与历史的临床角色授予（季度权限复核用） |
| `decideClinicalRoleGrant` | POST | `/portal/clinical-role-grants/:grantId/decision` | Provider: ProviderAdmin, ClinicalLead | 第二人批准或拒绝临床角色授予（不能批准自己发起的） |
| `listResidents` | GET | `/portal/facilities/:facilityId/residents` | Facility: FacilityManager, ClinicalLead, CareManager, ProviderAdmin | 住户名单（按状态、Unit 筛选）；只对有住户权限的角色开放 |
| `createResident` | POST | `/portal/facilities/:facilityId/residents` | Facility: FacilityManager, ProviderAdmin | 新建住户（状态 PreAdmission）；匹配键重复时返回 Conflict |
| `getResident` | GET | `/portal/residents/:residentId` | Facility: FacilityManager, ClinicalLead, CareManager, ProviderAdmin | 住户详情（身份、位置、同意、联系人；不含临床内容）；写读取审计 |
| `updateResident` | PATCH | `/portal/residents/:residentId` | Facility: FacilityManager, ProviderAdmin | 修改偏好称呼、Unit、start day；身份字段变化走身份更正（需 Clinical Lead 批准） |
| `changeRoom` | POST | `/portal/residents/:residentId/room-changes` | Facility: FacilityManager, ProviderAdmin | 同院房间调换，记录原因类别（Rules 149-70）；护士端名单显示 Room changed |
| `changeStatus` | POST | `/portal/residents/:residentId/status` | Facility: FacilityManager, ProviderAdmin | 入住 / 外出 / 住院 / 离开 / 去世；未关闭待办必须先关闭（Departed / Deceased） |
| `setConsent` | PUT | `/portal/residents/:residentId/consent` | Facility: FacilityManager, ClinicalLead | 登记 AI 文书同意 / 退出与录音退出；退出即时生效并推送护士端 |
| `setContacts` | PUT | `/portal/residents/:residentId/contacts` | Facility: FacilityManager, ClinicalLead | 替换联系人列表（只存姓名、关系、角色类型；不推导 person responsible） |
| `listTransfers` | GET | `/portal/resident-transfers` | Facility: FacilityManager, ClinicalLead, CareManager, ProviderAdmin | 转院记录（发起院或目标院） |
| `initiateTransfer` | POST | `/portal/resident-transfers` | Facility: FacilityManager | 发起同公司转院；返回阻断项（未确认草稿等），没有阻断时进入 AwaitingAcceptance |
| `acceptTransfer` | POST | `/portal/resident-transfers/:transferId/accept` | Facility: FacilityManager, ClinicalLead | 目标院 FM 或 Clinical Lead 核对 ≥ 3 项识别信息后接收 |
| `cancelTransfer` | POST | `/portal/resident-transfers/:transferId/cancel` | Facility: FacilityManager | 取消尚未生效的转院 |
| `uploadRoster` | POST | `/portal/facilities/:facilityId/roster-imports` | Facility: FacilityManager, ProviderAdmin | 上传名单 CSV（careKind 模板），执行结构校验和比对，返回批次与各状态计数 |
| `getRosterImport` | GET | `/portal/roster-imports/:batchId` | Facility: FacilityManager, ClinicalLead, ProviderAdmin | 导入批次与差异预览（按状态分组、分页） |
| `decideRosterRow` | POST | `/portal/roster-imports/:batchId/rows/:rowNumber/decision` | Facility: FacilityManager, ProviderAdmin | 逐行决定 Possible match（同一个人 / 不同的人，必须写原因） |
| `acceptAllNewAndUpdates` | POST | `/portal/roster-imports/:batchId/accept-new-and-updates` | Facility: FacilityManager, ProviderAdmin | 批量接受 New 和 Update 行（其他状态不能批量接受） |
| `applyRosterImport` | POST | `/portal/roster-imports/:batchId/apply` | Facility: FacilityManager, ProviderAdmin | 生效；有 Conflict 或未决定行时拒绝；含身份字段变化时转为等待第二人确认 |
| `confirmRosterImport` | POST | `/portal/roster-imports/:batchId/confirm` | Facility: FacilityManager, ClinicalLead | 第二人确认（Clinical Lead 或另一位 FM；不能是上传人） |
| `revertRosterImport` | POST | `/portal/roster-imports/:batchId/revert` | Facility: FacilityManager, ProviderAdmin | 整批撤销（只限本批新建且尚未产生任何记录的住户） |
| `getEffectiveWorkflowConfig` | GET | `/portal/workflow-config` | Provider: Owner, ProviderAdmin, FacilityManager, ClinicalLead, CareManager | 某个范围（公司层或某 Facility）每个流程项的各层版本与合并后的生效值 |
| `listWorkflowConfigVersions` | GET | `/portal/workflow-config/:item/versions` | Provider: Owner, ProviderAdmin, FacilityManager, ClinicalLead | 某流程项在公司层或某 Facility 的版本历史（旧值、新值、改动人、原因、批准人） |
| `proposeWorkflowConfig` | POST | `/portal/workflow-config/versions` | Provider: Owner, ProviderAdmin, FacilityManager, ClinicalLead | 保存新版本；比上一层更松时返回 LooserThanBaseline（并写拒绝审计）；临床项进入待第二人批准 |
| `decideWorkflowConfig` | POST | `/portal/workflow-config/versions/:versionId/decision` | Provider: ClinicalLead, Owner, ProviderAdmin | 第二人批准或拒绝临床流程项的新版本（不能批准自己提交的） |
| `rollbackWorkflowConfig` | POST | `/portal/workflow-config/versions/:versionId/restore` | Provider: Owner, ProviderAdmin, FacilityManager, ClinicalLead | 回滚 = 用该旧版本的值生成新版本（同样做只能调严校验） |
| `getFacilityRulePack` | GET | `/portal/facilities/:facilityId/rule-pack` | Facility: 任何管理端角色 | 该院绑定的州规则包（只读；未核实条目不返回） |
| `getGoLiveChecklist` | GET | `/portal/facilities/:facilityId/go-live-checklist` | Facility: Owner, ProviderAdmin, FacilityManager, ClinicalLead | 新养老院上线清单（19 项；careKind 侧项只读） |
| `updateGoLiveChecklistItem` | PATCH | `/portal/facilities/:facilityId/go-live-checklist/:itemNumber` | Facility: Owner, ProviderAdmin | 更新机构侧清单项的完成状态 |
| `getDashboard` | GET | `/portal/dashboard` | Provider: Owner, ProviderAdmin, FacilityManager, ClinicalLead, CareManager | Business owner 看板（按范围；每张卡带口径；真实租户无护士端数据时为 NoData） |
| `listAuditEvents` | GET | `/portal/audit-events` | Provider: Owner, ProviderAdmin, FacilityManager, ClinicalLead | 本组织审计（Owner 只看配置和权限类事件；FM / Clinical Lead 只看本院） |
| `listSupportAccess` | GET | `/portal/support-access-requests` | Provider: Owner, ProviderAdmin | careKind 支持访问请求（谁、为什么、看什么、多久、是否含健康信息） |
| `decideSupportAccess` | POST | `/portal/support-access-requests/:requestId/decision` | Provider: Owner, ProviderAdmin | 批准（可缩短时长）或拒绝；需要重新输入密码确认 |
| `revokeSupportAccess` | POST | `/portal/support-access-requests/:requestId/revoke` | Provider: Owner, ProviderAdmin | 随时撤销已批准或进行中的支持访问 |
| `resetDemo` | POST | `/portal/demo/reset` | Provider: 任何管理端角色 | 重置本体验者的 Demo 数据（只在 Demo 会话中可用，不影响其他体验者） |
