import { AdminShell } from "../components/admin-shell";

export const dynamic = "force-dynamic";

export default function AdminDashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
