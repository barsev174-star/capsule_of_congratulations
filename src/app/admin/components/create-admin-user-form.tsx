"use client";

import { useState } from "react";
import { createAdminUserAction } from "../actions-phase2";
import styles from "../admin.module.css";

export function CreateAdminUserForm() {
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsPending(true);
    await createAdminUserAction(formData);
    setIsPending(false);
    event.currentTarget.reset();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.filters}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          className={styles.searchInput}
        />
        <input
          type="text"
          name="password"
          placeholder="Пароль"
          required
          minLength={8}
          className={styles.searchInput}
        />
        <select name="role" defaultValue="moderator" className={styles.statusSelect}>
          <option value="admin">Администратор</option>
          <option value="moderator">Модератор</option>
          <option value="support">Поддержка</option>
        </select>
        <button type="submit" className={styles.filterButton} disabled={isPending}>
          {isPending ? "Создание..." : "Создать"}
        </button>
      </div>
      <p className={styles.loginInfo}>Скопируйте пароль перед созданием — он не сохраняется в открытом виде.</p>
    </form>
  );
}
