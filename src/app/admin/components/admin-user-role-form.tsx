import { updateAdminUserRoleAction } from "../actions-phase2";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import styles from "../admin.module.css";
export function AdminUserRoleForm({userId,currentRole}:{userId:string;currentRole:string}) {
  return <form action={updateAdminUserRoleAction} className={styles.roleForm}><input type="hidden" name="userId" value={userId}/><select name="role" aria-label="Роль администратора" defaultValue={currentRole} className={styles.statusSelect}><option value="admin">Администратор</option><option value="moderator">Модератор</option><option value="support">Поддержка</option></select><AdminConfirmDialog danger={false} message="Изменить права этого пользователя? Новая роль будет применяться при следующих запросах.">Сохранить роль</AdminConfirmDialog></form>;
}
