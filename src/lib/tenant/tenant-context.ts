export type TenantContext = {
  companyId: string;
  userId: string;
  isPlatformAdmin: boolean;
};

export function assertTenantContext(
  context: TenantContext | null | undefined,
): TenantContext {
  if (!context?.companyId || !context?.userId) {
    throw new Error("Tenant context is required.");
  }

  return context;
}

export function canAccessCompany(
  context: TenantContext,
  companyId: string,
): boolean {
  return context.isPlatformAdmin || context.companyId === companyId;
}
