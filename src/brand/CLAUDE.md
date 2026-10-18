# CLAUDE.md — brand（careKind 标准 Logo 副本）

> 层级：共享包子目录 · 路径：`src/brand/` · 上级上下文：[`../CLAUDE.md`](../CLAUDE.md)
> 本文件给 AI 看；给人看的说明在同目录的 `README.md`。

## 这里是什么
careKind 标准 Logo（ADR-0003，04A 星芒字标 v1）的黑、白两版 SVG，供各前端通过 `@carekind/shared/brand/*.svg` 引用。

## 规则
- **母版在 meta repo 的 `06-app-development/design/logo/`**；这里是原样副本，不要手改。母版更新后重新复制。
- 最小显示宽度 160px，比例 4.5:1，四周净空至少半个显示高度。
- 不裁切成单独的 K 或星芒，不改字距，不加 AI 后缀，不换颜色（只有黑、白两版）。
- 白底用黑版，深色底用白版。`alt` 写 "careKind"。

## 关键文件
- carekind-logo-black.svg
- carekind-logo-white.svg
- decoration-mini-smile-v1.png：设计系统 Decoration 库的"轻轻一笑"小配图（原样副本，母版在 meta repo `06-app-development/design/design-system/`）；只用于品牌层（登录、引导、Demo），工作页面不用（DESIGN.md §2）

## 不要做
- 不要用文字或系统字体代替 Logo
- 不要生成其他颜色或 App 图标（ADR-0003 未批准）

## 图片与动效（18/10/2026）
Owner: Lightman · Status: Local revision · Last reviewed: 18/10/2026

新增 decoration-hands-and-heart-v1.png、decoration-nurse-review-v1.png、decoration-companionship-v1.png：从 meta repo design/design-system/ 原样复制。Owner 本次明确要求后台图片，允许作为 PageHeader 辅助品牌插画；纯装饰、不承载数据。assets.d.ts 声明 PNG URL。
