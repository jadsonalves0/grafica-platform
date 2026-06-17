import { assertTenantContext, type TenantContext } from "@/lib/tenant/tenant-context";

export abstract class BaseService {
  protected requireContext(context: TenantContext): TenantContext {
    return assertTenantContext(context);
  }
}
