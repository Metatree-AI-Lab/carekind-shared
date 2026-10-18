# schemas

管理端用到的所有数据结构：Provider、Facility、员工、住户、名单导入、流程配置与版本、州规则包、模板、功能开关、套餐、合规状态、支持访问、审计、看板指标、内部权限组、登录。

每个结构用 zod 定义一次，既用来校验（API 收到请求、前端收到响应时），也用来生成 TypeScript 类型：

```ts
import { ResidentSchema, type Resident } from "@carekind/shared/schemas";

const resident: Resident = ResidentSchema.parse(untrustedInput);
```

日期一律存 ISO 字符串；界面显示 DD/MM/YYYY 用 `@carekind/shared/format`。
