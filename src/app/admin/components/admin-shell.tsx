import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { logoutAdminAction } from "../login/actions";
import { AdminNav } from "./admin-nav";
import styles from "../admin.module.css";

type AdminShellProps = {
  children: React.ReactNode;
};

export async function AdminShell({ children }: AdminShellProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <span className={styles.headerLogo}>Дари слова</span>
          <span className={styles.headerTag}>Админка</span>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.headerEmail}>{session.email}</span>
          <form action={logoutAdminAction}>
            <button type="submit" className={styles.headerLogout}>
              Выйти
            </button>
          </form>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <AdminNav role={session.role} />
        </aside>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
