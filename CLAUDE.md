# CLAUDE.md — 共享包（carekind-shared）

> 层级：代码仓库 · 本 repo 是 meta repo [`Metatree-AI-Lab/carekind`](https://github.com/Metatree-AI-Lab/carekind) 的 submodule，路径 `06-app-development/shared/`。
> 本文件给 AI 看；给人看的说明在同目录的 `README.md`。

## 这里是什么
`@carekind/shared`：管理端（Super Admin + Provider Portal）和 API 共用的契约层——zod schema 与类型、API 契约、类型化客户端、业务规则、日期格式化、设计系统 CSS。业务规则只在这里定义一次。第一阶段各 repo 用 `"@carekind/shared": "file:../shared"` 直接引用 TS 源码，不构建、不发布（ADR-0006）。

## 目录
`src/schemas/` 实体与枚举 · `src/contracts/` API 端点（清单见其 README）· `src/api-client/` fetch 客户端 · `src/policy/` 只能调严、限额、four-eyes · `src/format/` DD/MM/YYYY · `src/styles/` 设计系统 CSS 副本 · `src/ui/` React 组件库（DS-5，第一阶段 Super Admin 子集）。各目录有自己的 CLAUDE.md。

## 命令
```bash
npm install
npx vitest run src/<dir>/<file>.test.ts   # 本机只允许运行自己新写 / 改动的个别测试文件
# npm test / npm run typecheck / npm run lint 只在 GitHub Actions 云端运行（owner 全局规则）
npx prettier --write <改动的文件>         # Tab 缩进，宽度 4
```

## 本 repo 的规则
- **所有文档都在 meta repo**：PRD、ADR、架构、设计规范、changelog 都不放在这里。这里只放代码、测试、CI 配置和三件套说明文件。
- 写代码前先读 meta repo 的 `AGENTS.md`、`rules/02-code-rules.md`、`docs/PRD.md` §9 护栏，以及两份管理端 PRD（`docs/prds/2026-10-18-super-admin-multi-facility-console.md`、`docs/prds/2026-10-18-provider-portal-facility-admin.md`）。
- 改 schema 或契约会影响 API 和两个前端：改完同步更新 `src/contracts/README.md` 的端点清单，并在回报里说明影响。
- 每个目录都要有 README.md + CLAUDE.md + AGENTS.md（软链接）；目录结构保持浅，测试与源码同目录；不要生成 `dist/`、`coverage/`。
- 只用虚构的 Wattle Grove Care Group 做测试数据；不在日志或错误信息里放住户姓名或健康信息。
- 共用工具（`.editorconfig`、`scripts/check-*.sh`）以 meta repo 为准；`src/styles/` 的 CSS 也以 meta repo 为准，不要手改。
- 改完代码：先在本 repo 提交并推送，再回到 meta repo 提交 submodule 指针（只在 owner 要求提交时做）。

## 不要做
- 不要加入护士端功能（口述、转写、起草、审核、交接、导出）。
- 不要实现 TGA 红灯功能（诊断、风险评分、治疗建议、数值报警）或员工个人绩效统计。

## 相关
- meta repo `06-app-development/engineering/adr/0005-polyrepo-and-mvp-tech-stack.md`（repo 结构与技术栈）
- meta repo `06-app-development/engineering/adr/0006-phase1-admin-implementation-defaults.md`（第一阶段技术默认值）
