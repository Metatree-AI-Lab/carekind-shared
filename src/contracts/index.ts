import { authEndpoints } from "./auth.ts";
import { portalGovernanceEndpoints } from "./portal-governance.ts";
import { portalOrganisationEndpoints } from "./portal-organisation.ts";
import { portalResidentEndpoints } from "./portal-residents.ts";
import { superAdminPlatformEndpoints } from "./super-admin-platform.ts";
import { superAdminTenancyEndpoints } from "./super-admin-tenancy.ts";

export * from "./define.ts";
export * from "./params.ts";
export { authEndpoints } from "./auth.ts";
export { superAdminTenancyEndpoints } from "./super-admin-tenancy.ts";
export { superAdminPlatformEndpoints } from "./super-admin-platform.ts";
export { portalOrganisationEndpoints } from "./portal-organisation.ts";
export { portalResidentEndpoints } from "./portal-residents.ts";
export { portalGovernanceEndpoints } from "./portal-governance.ts";

/** Super Admin app 使用的端点（`/super-admin/...`）。 */
export const superAdminEndpoints = { ...superAdminTenancyEndpoints, ...superAdminPlatformEndpoints } as const;

/** Provider Portal app 使用的端点（`/portal/...`）。 */
export const portalEndpoints = {
	...portalOrganisationEndpoints,
	...portalResidentEndpoints,
	...portalGovernanceEndpoints,
} as const;

/** 全部端点，按 app 分组。API 遍历它注册路由；前端用 createApiClient 绑定。 */
export const endpoints = {
	auth: authEndpoints,
	superAdmin: superAdminEndpoints,
	portal: portalEndpoints,
} as const;
