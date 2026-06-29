"use client";

import { useState } from "react";
import { updateAdminUserRoleAction } from "../actions-phase2";
import styles from "../admin.module.css";

type Props = {
  userId: string;
  currentRole: string;
};

const roleLabels: Record<string, string> = {
  admin: "Администратор",
  moderator: "Модератор",
  support: "Поддержка"
};

export function AdminUserRoleForm({ userId, currentRole }: Props) {
  const [isPending, setIsPending] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const form = event.currentTarget.form;

    if (!form) {
      return;
    }

    setIsPending(true);
    await updateAdminUserRoleAction(new FormData(form));
    setIsPending(false);
  };

  return (
    <form action={updateAdminUserRoleAction} className={styles.actionForm}>
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        className={styles.statusSelect}
        style={{ minWidth: "auto", opacity: isPending ? 0.6 : 1 }}
        onChange={handleChange}
        disabled={isPending}
      >
        {Object.entries(roleLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </form>
  );
}
