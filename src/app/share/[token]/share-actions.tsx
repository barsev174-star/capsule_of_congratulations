"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import { BrandLogo } from "@/components/brand/brand-logo";
import styles from "./share-actions.module.css";

function ShareIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M7 12.5 17 7m-10 5.5L17 17m0-10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 15a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5 15a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /></svg>;
}

function LinkIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m9.5 14.5 5-5m-7.8 8.3-1 .9a3.6 3.6 0 1 1-5.1-5.1l4.1-4.1a3.6 3.6 0 0 1 5.1 0m4.5 5.1a3.6 3.6 0 0 1-5.1 0m4.1-9.1 1-.9a3.6 3.6 0 1 1 5.1 5.1l-4.1 4.1a3.6 3.6 0 0 1-5.1 0" /></svg>;
}

function DownloadIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 3v11m0 0 4-4m-4 4-4-4m-4 7h16" /></svg>;
}

function ChevronUpIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m7 14 5-5 5 5" /></svg>;
}

function ChevronDownIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m7 10 5 5 5-5" /></svg>;
}

const SHARE_TEXT = "Близкие люди собрали здесь много тёплых слов и приятных воспоминаний.";

export function ShareActions({ publicName, token }: { publicName: string | null; token: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(window.location.href);
      sendClientTelemetry("PUBLIC_SHARE_LINK_COPIED", { route: "share" });
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: publicName ? `${publicName} делится открыткой` : "Тёплая открытка от близких",
          text: SHARE_TEXT,
          url: window.location.href
        });
        sendClientTelemetry("PUBLIC_SHARE_NATIVE_SHARED", { route: "share" });
        return;
      } catch {
        await copy();
        return;
      }
    }
    await copy();
  };

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const toggleDownloadMenu = () => {
    setMenuOpen((wasOpen) => {
      if (!wasOpen) sendClientTelemetry("PUBLIC_SHARE_DOWNLOAD_MENU_OPENED", { route: "share" });
      return !wasOpen;
    });
  };

  const navigateMenu = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a, button'));
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    event.preventDefault();
    items[nextIndex]?.focus();
  };

  return <footer className={styles.footer}>
    <div className={styles.actions} aria-label="Действия с открыткой">
      <button type="button" className={styles.primary} onClick={() => void share()}><ShareIcon />Поделиться открыткой</button>
      <button type="button" className={styles.secondary} onClick={() => void copy()}><LinkIcon />{copyState === "copied" ? "Ссылка скопирована" : "Скопировать ссылку"}</button>
      <div className={styles.download} ref={menuRef}>
        <button type="button" className={styles.secondary} aria-haspopup="menu" aria-expanded={menuOpen} onClick={toggleDownloadMenu}><DownloadIcon />Скачать <span className={styles.chevron}>{menuOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}</span></button>
        {menuOpen ? <div className={styles.menu} role="menu" onKeyDown={navigateMenu}>
          <a role="menuitem" href={`/share/${encodeURIComponent(token)}/image/post`} download="slovesto-post.png" onClick={() => { sendClientTelemetry("PUBLIC_SHARE_POST_DOWNLOADED", { route: "share" }); setMenuOpen(false); }}>Для поста</a>
          <a role="menuitem" href={`/share/${encodeURIComponent(token)}/image/story`} download="slovesto-story.png" onClick={() => { sendClientTelemetry("PUBLIC_SHARE_STORY_DOWNLOADED", { route: "share" }); setMenuOpen(false); }}>Для сторис</a>
          <button type="button" role="menuitem" onClick={() => { sendClientTelemetry("PUBLIC_SHARE_PRINT_DOWNLOADED", { route: "share" }); setMenuOpen(false); window.print(); }}>Версия для печати</button>
        </div> : null}
      </div>
    </div>
    <span className={styles.srOnly} role="status" aria-live="polite">{copyState === "copied" ? "Ссылка скопирована" : copyState === "failed" ? "Не удалось скопировать ссылку" : ""}</span>
    <div className={styles.brandRow}>
      <div className={styles.brand}><BrandLogo variant="product" className={styles.brandLogo} /><span>Место, где слова становятся подарком</span></div>
      <Link href="/manage/new?source=public_share" className={styles.cta} onClick={() => sendClientTelemetry("PUBLIC_SHARE_CREATE_CARD_CLICKED", { route: "share" })}>Собрать такую открытку</Link>
    </div>
    <div className={styles.utility}><Link href="/privacy">Политика конфиденциальности</Link><span>·</span><Link href="/support">Сообщить о проблеме</Link></div>
  </footer>;
}
