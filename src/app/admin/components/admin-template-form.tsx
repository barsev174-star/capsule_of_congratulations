"use client";
import { useState } from "react";
import { upsertTemplateOverrideAction } from "../actions-phase2";
import { AdminConfirmDialog } from "./admin-confirm-dialog";
import styles from "../admin.module.css";
export function AdminTemplateForm(props: { id: string; name: string; description: string; accent: string; recommendedFor: string; isActive: boolean }) {
  const [active, setActive] = useState(props.isActive);
  return <form action={upsertTemplateOverrideAction}>
    <input type="hidden" name="id" value={props.id} />
    <div className={styles.detailGrid}>
      <label className={styles.filterField}>Название<input className={styles.searchInput} name="name" defaultValue={props.name} maxLength={200} /></label>
      <label className={styles.filterField}>Акцент внутри открытки<input className={styles.searchInput} name="accent" defaultValue={props.accent} /></label>
      <label className={styles.filterField}>Описание<textarea className={styles.searchInput} name="description" rows={4} defaultValue={props.description} maxLength={2000} /></label>
      <label className={styles.filterField}>Рекомендуемые сценарии через запятую<input className={styles.searchInput} name="recommendedFor" defaultValue={props.recommendedFor} /></label>
    </div>
    <label className={styles.activeToggle}><input type="checkbox" name="isActive" checked={active} onChange={(event) => setActive(event.currentTarget.checked)} />Шаблон активен</label>
    {props.isActive && !active ? <AdminConfirmDialog message="Отключить шаблон для новых открыток и сохранить настройки?">Сохранить</AdminConfirmDialog> : <button type="submit" className={styles.filterButton}>Сохранить</button>}
  </form>;
}
