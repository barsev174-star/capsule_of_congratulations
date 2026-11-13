"use client";
import { useState } from "react";
import styles from "../admin.module.css";
export function AdminCopyValue({ value, label = "ID", compact = false }: { value: string; label?: string; compact?: boolean }) {
  const [feedback, setFeedback] = useState("");
  return <span className={styles.copyValue}><code title={value}>{compact ? `${value.slice(0,8)}…` : value}</code><button type="button" className={styles.copyButton} aria-label={`Скопировать ${label}`} onClick={async () => { try { await navigator.clipboard.writeText(value); setFeedback("Скопировано"); } catch { setFeedback("Не удалось скопировать"); } }}>Копировать</button><span aria-live="polite" className={styles.cellSecondary}>{feedback}</span></span>;
}
