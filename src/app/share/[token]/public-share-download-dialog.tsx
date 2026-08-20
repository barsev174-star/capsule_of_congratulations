"use client";

import { useEffect, useRef, useState } from "react";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import styles from "./public-share-download-dialog.module.css";

type Format = "story" | "post" | "print";

const EXPORT_TIMEOUT_MS = 45_000;

const formats: Array<{ id: Format; title: string; description: string; suffix: string }> = [
  { id: "story", title: "Для сторис", description: "Вертикальная история 9:16 для Telegram, VK, Instagram и других сервисов.", suffix: "story.png" },
  { id: "post", title: "Для поста", description: "Пост 4:5 для ленты социальных сетей.", suffix: "post.png" },
  { id: "print", title: "Для печати", description: "Полноцветная открытка на одном листе A4.", suffix: "print.pdf" }
];

const fileStem = (publicName: string | null) => {
  const normalized = publicName?.trim().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  return normalized || "slovesto-card";
};

export function PublicShareDownloadDialog({ token, publicName, onClose, trigger }: { token: string; publicName: string | null; onClose: () => void; trigger: React.RefObject<HTMLButtonElement | null> }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<Format | null>(null);
  const [error, setError] = useState<{ format: Format; message: string } | null>(null);

  useEffect(() => {
    const triggerElement = trigger.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? []);
      if (!focusable.length) return;
      const index = focusable.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) { event.preventDefault(); focusable.at(-1)?.focus(); }
      if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); focusable[0]?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keydown); triggerElement?.focus(); };
  }, [onClose, trigger]);

  const download = async (format: Format, file: string) => {
    setLoading(format); setError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), EXPORT_TIMEOUT_MS);
    try {
      const response = await fetch(`/share/${encodeURIComponent(token)}/image/${format}`, {
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) {
        const message = (await response.text()).trim();
        throw new Error(message || "Не удалось подготовить файл. Попробуйте ещё раз.");
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href; anchor.download = file; anchor.click();
      URL.revokeObjectURL(href);
      sendClientTelemetry(format === "story" ? "PUBLIC_SHARE_STORY_DOWNLOADED" : format === "post" ? "PUBLIC_SHARE_POST_DOWNLOADED" : "PUBLIC_SHARE_PRINT_DOWNLOADED", { route: "share" });
    } catch (caught) {
      const message = controller.signal.aborted
        ? "Подготовка заняла слишком много времени. Попробуйте ещё раз чуть позже."
        : caught instanceof Error && caught.message
          ? caught.message
          : "Не удалось подготовить файл. Попробуйте ещё раз.";
      setError({ format, message });
      sendClientTelemetry("PUBLIC_SHARE_EXPORT_FAILED", { route: "share", format });
    } finally {
      window.clearTimeout(timeout);
      setLoading(null);
    }
  };

  return <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="download-title" tabIndex={-1} ref={dialogRef}>
      <button type="button" className={styles.close} aria-label="Закрыть" onClick={onClose}>×</button>
      <h2 id="download-title">Выберите формат</h2>
      <p className={styles.lead}>Скачайте открытку или поделитесь ей.</p>
      <div className={styles.options}>{formats.map((format) => <article className={styles.option} key={format.id}>
        <div className={`${styles.formatPreview} ${styles[format.id]}`} aria-hidden="true"><span>{format.id === "print" ? "A4" : format.id === "story" ? "9:16" : "4:5"}</span></div>
        <div className={styles.optionContent}><h3>{format.title}</h3><p>{format.description}</p><button type="button" onClick={() => void download(format.id, `${fileStem(publicName)}-${format.suffix}`)} disabled={loading !== null}>{loading === format.id ? "Подготовка файла…" : "Скачать"}</button>{error?.format === format.id ? <span className={styles.error} role="alert">{error.message}</span> : null}</div>
      </article>)}</div>
      <p className={styles.note}>В файлы попадает только то, что получатель разрешил показать публично.</p>
    </div>
  </div>;
}
