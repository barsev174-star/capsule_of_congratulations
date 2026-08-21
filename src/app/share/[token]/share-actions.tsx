"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PublicShareDownloadDialog } from "./public-share-download-dialog";
import styles from "./share-actions.module.css";

const Icon = ({ children }: { children: React.ReactNode }) => <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">{children}</svg>;

export const buildNativeShareData = (publicName: string | null, url: string): ShareData => ({
  title: publicName ? `${publicName} делится открыткой` : "Тёплая открытка от близких",
  url
});

export function ShareActions({ publicName, token }: { publicName: string | null; token: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadTrigger = useRef<HTMLButtonElement>(null);
  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); sendClientTelemetry("PUBLIC_SHARE_LINK_COPIED", { route: "share" }); setCopyState("copied"); window.setTimeout(() => setCopyState("idle"), 1800); }
    catch { setCopyState("failed"); }
  };
  const share = async () => {
    if (!navigator.share) return copy();
    try { await navigator.share(buildNativeShareData(publicName, window.location.href)); sendClientTelemetry("PUBLIC_SHARE_NATIVE_SHARED", { route: "share" }); }
    catch { await copy(); }
  };
  const openDownload = () => { sendClientTelemetry("PUBLIC_SHARE_DOWNLOAD_DIALOG_OPENED", { route: "share" }); setDownloadOpen(true); };
  return <footer className={styles.footer}>
    <div className={styles.actions} aria-label="Действия с открыткой">
      <button type="button" className={styles.primary} onClick={() => void share()}><Icon><path d="M7 12.5 17 7m-10 5.5L17 17m0-10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 15a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5 15a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /></Icon>Поделиться открыткой</button>
      <button type="button" className={styles.secondary} onClick={() => void copy()}><Icon><path d="m9.5 14.5 5-5m-7.8 8.3-1 .9a3.6 3.6 0 1 1-5.1-5.1l4.1-4.1a3.6 3.6 0 0 1 5.1 0m4.5 5.1a3.6 3.6 0 0 1-5.1 0m4.1-9.1 1-.9a3.6 3.6 0 1 1 5.1 5.1l-4.1 4.1a3.6 3.6 0 0 1-5.1 0" /></Icon>{copyState === "copied" ? "Ссылка скопирована" : "Скопировать ссылку"}</button>
      <button ref={downloadTrigger} type="button" className={styles.secondary} onClick={openDownload}><Icon><path d="M12 3v11m0 0 4-4m-4 4-4-4m-4 7h16" /></Icon>Скачать</button>
    </div>
    <span className={styles.srOnly} role="status" aria-live="polite">{copyState === "copied" ? "Ссылка скопирована" : copyState === "failed" ? "Не удалось скопировать ссылку" : ""}</span>
    <div className={styles.brandRow}><div className={styles.brand}><BrandLogo variant="product" className={styles.brandLogo} /><span>Место, где слова становятся подарком</span></div><Link href="/manage/new?source=public_share" className={styles.cta} onClick={() => sendClientTelemetry("PUBLIC_SHARE_CREATE_CARD_CLICKED", { route: "share" })}>Собрать такую открытку</Link></div>
    <div className={styles.utility}><Link href="/privacy">Политика конфиденциальности</Link><span>·</span><Link href="/support">Сообщить о проблеме</Link></div>
    {downloadOpen ? <PublicShareDownloadDialog token={token} publicName={publicName} trigger={downloadTrigger} onClose={() => setDownloadOpen(false)} /> : null}
  </footer>;
}
