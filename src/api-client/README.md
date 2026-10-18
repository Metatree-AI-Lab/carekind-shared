# api-client

前端调用 careKind API 的客户端。

```ts
import { bindEndpoints, createApiClient } from "@carekind/shared/api-client";
import { endpoints } from "@carekind/shared/contracts";

const client = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL });
const portal = bindEndpoints(client, endpoints.portal);

const units = await portal.listUnits({ params: { facilityId } });
```

- 参数和返回值都有类型，来自 API 契约。
- 发送前校验输入；收到后校验响应，不符合契约就抛 `ApiResponseValidationError`。
- 服务器返回错误时抛 `ApiRequestError`，`error.body.code` 是错误代码（例如 `PlanLimitReached`、`LooserThanBaseline`）。
