# CLAUDE.md — policy（管理端业务规则）

> 层级：功能模块 · 路径：`06-app-development/shared/src/policy/` · 上级上下文：[`../CLAUDE.md`](../CLAUDE.md)

## 这里是什么
API 和前端共用的纯业务规则（不依赖框架、网络、数据库）。每条规则只在这里实现一次（rules/02 §2.2）。

## 关键函数（大函数登记）
| 签名 | 做什么 | 不变量 |
|---|---|---|
| `findLooserSettings(candidate, baseline): LooserSetting[]` | 列出比上一层更松的设置（审核链、升级路由、生命周期清单、员工上线、新院上线） | 空数组才能保存；不同流程项比较直接抛错 |
| `isStricterOrEqual(candidate, baseline): boolean` | 上面的布尔版 | 相同设置 = true |
| `mergeStricter(upper, lower)` / `resolveEffectiveConfig(platform, provider, facility)` | 逐层取更严值得到生效配置 | 上层下限调严后，下层旧值自动按新下限执行；无松紧之分的字段取下层 |
| `checkPlanLimit(plan, unit, currentCount, additions)` / `planLimitMessage(check)` | 套餐限额判断与提示文字 | 没有套餐 = 拒绝；套餐不限的单位 = 允许；不停用已有员工 |
| `canDecideApproval(request, deciderId)` | four-eyes | 发起人不能批准自己；只能处理 Pending |
| `canTransitionProvider(from, to)` | Provider 生命周期转换 | 与 Super Admin PRD §4-D 状态图一致 |
| `PLATFORM_HARD_FLOOR` | Layer 0 硬底线（代码内） | Tier 3 类别锁定为 3；法定清单项、三项上线步骤、★ 上线门槛不可移除 |
| `PLATFORM_DEFAULT_CONFIG` | Layer 1 第一个版本（API 种子） | 必须 `isStricterOrEqual(默认, 硬底线)`（有测试） |

## 测试与验收
- `workflow-strictness.test.ts`、`workflow-merge.test.ts`、`plan-limits.test.ts`、`approvals.test.ts`；场景来自两份管理端 PRD 的 Demo（falls → Tier 2 被拒、备岗 15 → 10 分钟允许等）。
- 改"更严"方向时，同时改 `workflow-strictness.ts` 和 `workflow-merge.ts`，两边方向必须一致。

## 不要做
- 不要做临床判断（诊断、风险评分、数值报警）；分级只用于审核路由。
- 不要把 PRD 里 `{{TBD}}` 的数字当成已确认值：目前的开发默认（备岗 15 / 上限 30 分钟）在代码注释里标了 ⚠️。
