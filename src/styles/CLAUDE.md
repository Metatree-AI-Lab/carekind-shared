# CLAUDE.md — styles（设计系统 CSS 副本）

> 层级：功能模块 · 路径：`06-app-development/shared/src/styles/` · 上级上下文：[`../CLAUDE.md`](../CLAUDE.md)

## 这里是什么
meta repo `06-app-development/design/design-system/` 里 `tokens.css` 和 `components.css` 的副本，供各前端通过 `@carekind/shared/styles/tokens.css`、`@carekind/shared/styles/components.css` 引入。

## 规则
- **不要手改**。以 meta repo 为准：改数值走 `tokens.json` + `scripts/build-design-system.sh`，改组件先改 `COMPONENTS.md`；meta repo 更新后重新复制，并更新文件头注释里的来源提交号。
- 先引入 `tokens.css` 再引入 `components.css`；页面只用 token 和 `ck-` 类，不写死颜色和像素。

## 不要做
- 不要在这里新增 CSS 文件或覆盖样式。
