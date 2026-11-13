import { listAdminUsers } from "@/lib/admin/repository-phase2";
import { requireAdminRole } from "@/lib/admin/session";
import { formatAdminDate } from "@/lib/admin/format";
import { AdminUserRoleForm } from "../../components/admin-user-role-form";
import { CreateAdminUserForm } from "../../components/create-admin-user-form";
import { AdminDataTable,AdminDetailPanel,AdminPageHeader,AdminStatusBadge } from "../../components/admin-ui";
import { AdminConfirmDialog } from "../../components/admin-confirm-dialog";
import { deleteAdminUserAction, setAdminUserDisabledAction } from "../../actions-phase2";
import styles from "../../admin.module.css";
export default async function AdminUsersPage({searchParams}:{searchParams:Promise<{notice?:string}>}) {
  const notice=(await searchParams).notice;
  const session=await requireAdminRole("admin"), users=await listAdminUsers();
  return <><AdminPageHeader title="Администраторы" description="Роли и доступ к административной панели."/>
    {notice === "linked-account" && <p role="alert" className={styles.loginError}>Учётная запись связана с операциями. Используйте отключение доступа, чтобы сохранить журнал и финансовые связи.</p>}
    <AdminDetailPanel title="Добавить администратора"><CreateAdminUserForm/></AdminDetailPanel>
    <AdminDetailPanel title="Учётные записи"><AdminDataTable label="Администраторы" rows={users} columns={[
      {key:"email",label:"Email",render:(u)=><><span className={styles.emailValue} title={u.email}>{u.email}</span><span className={styles.cellSecondary}><AdminStatusBadge tone={u.disabledAt?"neutral":"success"}>{u.disabledAt?"Доступ отключён":"Доступ активен"}</AdminStatusBadge></span></>},
      {key:"role",label:"Роль",render:(u)=>u.email.toLowerCase()===session.email.toLowerCase()?"Ваша учётная запись":<AdminUserRoleForm userId={u.id} currentRole={u.role}/>},
      {key:"date",label:"Создан",render:(u)=>formatAdminDate(u.createdAt)},
      {key:"action",label:"Действие",render:(u)=>u.email.toLowerCase()===session.email.toLowerCase()?"—":<div className={styles.statusStack}><form action={setAdminUserDisabledAction}><input type="hidden" name="userId" value={u.id}/><input type="hidden" name="disabled" value={String(!u.disabledAt)}/><AdminConfirmDialog danger={!u.disabledAt} message={u.disabledAt?"Восстановить доступ этой учётной записи?":"Отключить доступ и завершить действующие административные сессии этой учётной записи?"}>{u.disabledAt?"Включить доступ":"Отключить доступ"}</AdminConfirmDialog></form>{u.disabledAt && <form action={deleteAdminUserAction}><input type="hidden" name="userId" value={u.id}/><AdminConfirmDialog message="Удалить учётную запись окончательно? Связанные с операциями записи можно только отключить.">Удалить запись</AdminConfirmDialog></form>}</div>}
    ]} empty="Учётных записей нет. Доступна основная учётная запись из настроек сервера."/></AdminDetailPanel></>;
}
