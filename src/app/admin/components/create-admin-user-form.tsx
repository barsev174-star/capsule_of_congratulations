"use client";

import { useState } from "react";
import { createAdminUserAction } from "../actions-phase2";
import styles from "../admin.module.css";

export function CreateAdminUserForm() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsPending(true);
    setError("");
    try { await createAdminUserAction(formData); form.reset(); }
    catch { setError("Не удалось добавить пользователя. Проверьте данные и повторите попытку."); }
    finally { setIsPending(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.filters}>
        <input
          type="email"
          aria-label="Email нового администратора"
          name="email"
          placeholder="Email"
          required
          className={styles.searchInput}
        />
        <input
          type="password"
          autoComplete="new-password"
          aria-label="Пароль нового администратора"
          name="password"
          placeholder="Пароль"
          required
          minLength={8}
          className={styles.searchInput}
        />
        <select name="role" aria-label="Роль нового администратора" defaultValue="moderator" className={styles.statusSelect}>
          <option value="admin">Администратор</option>
          <option value="moderator">Модератор</option>
          <option value="support">Поддержка</option>
        </select>
        <button type="submit" className={styles.filterButton} disabled={isPending}>
          {isPending ? "Создание..." : "Создать"}
        </button>
      </div>
      {error && <p role="alert" className={styles.loginError}>{error}</p>}
      <p className={styles.loginInfo}>Скопируйте пароль перед созданием — он не сохраняется в открытом виде.</p>
    </form>
  );
}
