import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { AdminShellFrame } from "./admin-shell-frame";
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminShellFrame email={session.email} role={session.role}>{children}</AdminShellFrame>;
}
