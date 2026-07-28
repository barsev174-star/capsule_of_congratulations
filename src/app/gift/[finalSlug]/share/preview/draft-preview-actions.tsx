"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import styles from "@/app/share/[token]/share-actions.module.css";

const Icon = ({ children }: { children: React.ReactNode }) => <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">{children}</svg>;

export function DraftPreviewActions() {
  const [message, setMessage] = useState("");
  const unavailable = () => setMessage("Это предпросмотр. Действие станет доступно после публикации.");

  return <footer className={styles.footer}>
    <div className={styles.actions} aria-label="Действия с открыткой">
      <button type="button" className={styles.primary} onClick={unavailable}><Icon><path d="M7 12.5 17 7m-10 5.5L17 17m0-10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 15a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5 15a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /></Icon>Поделиться открыткой</button>
      <button type="button" className={styles.secondary} onClick={unavailable}><Icon><path d="m9.5 14.5 5-5m-7.8 8.3-1 .9a3.6 3.6 0 1 1-5.1-5.1l4.1-4.1a3.6 3.6 0 0 1 5.1 0m4.5 5.1a3.6 3.6 0 0 1-5.1 0m4.1-9.1 1-.9a3.6 3.6 0 1 1 5.1 5.1l-4.1 4.1a3.6 3.6 0 0 1-5.1 0" /></Icon>Скопировать ссылку</button>
      <button type="button" className={styles.secondary} onClick={unavailable}><Icon><path d="M12 3v11m0 0 4-4m-4 4-4-4m-4 7h16" /></Icon>Скачать</button>
    </div>
    <p className={styles.srOnly} role="status" aria-live="polite">{message}</p>
    <div className={styles.brandRow}><div className={styles.brand}><BrandLogo variant="product" className={styles.brandLogo} /><span>Место, где слова становятся подарком</span></div><button type="button" className={styles.cta} onClick={unavailable}>Собрать такую открытку</button></div>
    <div className={styles.utility}><span>Предпросмотр доступен только владельцу открытки</span></div>
  </footer>;
}
