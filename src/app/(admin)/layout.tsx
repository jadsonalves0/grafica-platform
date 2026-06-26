import { AdminShell } from "@/components/admin/app-shell";
import { resolveRequestContext } from "@/lib/auth/request-context";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await resolveRequestContext();

  return (
    <AdminShell
      viewer={{
        companyTradeName: context.companyTradeName,
        userName: context.userName,
        permissions: context.permissions,
        isPlatformAdmin: context.isPlatformAdmin,
      }}
    >
      {children}
    </AdminShell>
  );
}
