import { listAdminUsers } from "@/lib/admin/repository-phase2";
import { requireAdminRole } from "@/lib/admin/session";
import { AdminUserRoleForm } from "../../components/admin-user-role-form";
import { CreateAdminUserForm } from "../../components/create-admin-user-form";
import { deleteAdminUserAction } from "../../actions-phase2";
import styles from "../../admin.module.css";

export default async function AdminUsersPage() {
  await requireAdminRole("admin");
  const users = await listAdminUsers();

  return (
    <>
      <h1 className={styles.pageTitle}>Администраторы</h1>
      <p className={styles.pageSubtitle}>Управление доступом в админку</p>

      <section className={styles.panel} style={{ marginBottom: 24 }}>
        <h2 className={styles.panelTitle}>Создать пользователя</h2>
        <CreateAdminUserForm />
      </section>

      <section className={styles.panel}>
        {users.length === 0 ? (
          <p className={styles.emptyState}>Пользователей нет. Вход возможен через env-переменные.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Создан</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>
                      <AdminUserRoleForm userId={user.id} currentRole={user.role} />
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString("ru-RU")}</td>
                    <td>
                      <form action={deleteAdminUserAction} className={styles.actionForm}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button type="submit" className={`${styles.actionButton} ${styles.actionButtonDanger}`}>
                          Удалить
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
