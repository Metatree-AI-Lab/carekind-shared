# CLAUDE.md — format（显示格式化）

> 层级：功能模块 · 路径：`06-app-development/shared/src/format/` · 上级上下文：[`../CLAUDE.md`](../CLAUDE.md)

## 这里是什么
把 ISO 字符串转换成界面显示格式。界面日期一律 DD/MM/YYYY（AGENTS.md 写作规则）。

## 关键函数
| 签名 | 做什么 | 不变量 |
|---|---|---|
| `formatDateAu(value, timeZone?)` | `YYYY-MM-DD` 直接换位；ISO 日期时间先换算到时区（默认 Australia/Melbourne） | 只有日期的值不做时区换算（出生日期不会差一天） |
| `formatDateTimeAu(isoDateTime, timeZone?)` | `DD/MM/YYYY HH:mm`，24 小时制 | 非法输入抛 `RangeError` |
| `parseAuDate(input)` | 用户输入的 DD/MM/YYYY → `YYYY-MM-DD` | 不存在的日期（31/02）抛 `RangeError` |

## 规则
- 只用标准库 `Intl`，不引入日期库。
- 测试：`dates.test.ts`。

## 不要做
- 不要在页面里自己拼日期字符串。
