"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import { versionInvitationUrl } from "@/lib/routes/card-links";
import styles from "./manage-page.module.css";

export const INVITATION_SHARE_TITLE = "Приглашение в общую открытку";
export const INVITATION_SHARE_TEXT =
  "Собираем общую открытку 🎉\n\n" +
  "Добавьте несколько тёплых слов. Всё соберётся в один общий подарок.";

export const buildInvitationCopyText = (joinUrl: string) =>
  `${INVITATION_SHARE_TEXT}\n\n${joinUrl}`;

type Props = {
  value: string;
  label?: string;
  copiedLabel?: string;
  cardId?: string;
  telemetrySource?: "participant" | "manage" | "gift";
  className?: string;
};

export const copyWithFallback = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy methods.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  const activeElement = document.activeElement as HTMLElement | null;
  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(0, text.length);

  let success = false;
  try {
    success = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
    activeElement?.focus({ preventScroll: true });
  }

  if (success) {
    return true;
  }

  return false;
};

export const CopyLinkButton = ({
  value,
  label = "Копировать ссылку",
  copiedLabel = "Скопировано",
  cardId,
  telemetrySource,
  className
}: Props) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const absoluteUrl = versionInvitationUrl(new URL(value, window.location.origin).toString());
    const ok = await copyWithFallback(absoluteUrl);

    if (!ok) {
      window.alert("Не удалось скопировать ссылку. Попробуйте скопировать адрес из адресной строки.");
      return;
    }

    if (cardId && telemetrySource === "participant") {
      sendClientTelemetry("funnel.participant_link_copied", { cardId, source: "manager" });
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      className={className ?? styles.copyLinkButton}
      onClick={handleCopy}
      aria-live="polite"
    >
      {copied ? copiedLabel : label}
    </button>
  );
};

export const ShareLinkButton = ({
  value,
  label = "Поделиться ссылкой",
  className
}: Pick<Props, "value" | "label" | "className">) => {
  const [isFallbackOpen, setIsFallbackOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const closeFallback = useCallback(() => {
    setIsFallbackOpen(false);
    setCopyStatus("");
  }, []);

  useEffect(() => {
    if (!isFallbackOpen) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFallback();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus({ preventScroll: true });
    };
  }, [closeFallback, isFallbackOpen]);

  const handleShare = async () => {
    const absoluteUrl = versionInvitationUrl(new URL(value, window.location.origin).toString());
    if ("share" in navigator) {
      try {
        await navigator.share({
          title: INVITATION_SHARE_TITLE,
          text: INVITATION_SHARE_TEXT,
          url: absoluteUrl
        });
        return;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          return;
        }
      }
    }

    setIsFallbackOpen(true);
  };

  const copyInvitation = async () => {
    const absoluteUrl = versionInvitationUrl(new URL(value, window.location.origin).toString());
    const copied = await copyWithFallback(buildInvitationCopyText(absoluteUrl));
    setCopyStatus(copied ? "Приглашение скопировано" : "Скопируйте приглашение вручную");
  };

  const copyOnlyLink = async () => {
    const absoluteUrl = versionInvitationUrl(new URL(value, window.location.origin).toString());
    const copied = await copyWithFallback(absoluteUrl);
    setCopyStatus(copied ? "Ссылка скопирована" : "Скопируйте ссылку вручную");
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={className ?? styles.copyLinkButton}
        onClick={handleShare}
      >
        {label}
      </button>
      {isFallbackOpen ? (
        <div
          className={styles.invitationFallbackBackdrop}
          role="presentation"
          onMouseDown={closeFallback}
        >
          <section
            ref={dialogRef}
            className={styles.invitationFallbackSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invitation-fallback-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.invitationFallbackHeader}>
              <div>
                <span>Приглашение участников</span>
                <h2 id="invitation-fallback-title">Отправьте приглашение</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={closeFallback}
                aria-label="Закрыть приглашение"
              >
                ×
              </button>
            </div>
            <p className={styles.invitationFallbackPreview}>{INVITATION_SHARE_TEXT}</p>
            <div className={styles.invitationFallbackActions}>
              <button type="button" onClick={copyInvitation}>
                Скопировать приглашение
              </button>
              <button type="button" onClick={copyOnlyLink}>
                Скопировать только ссылку
              </button>
            </div>
            <p className={styles.invitationFallbackStatus} role="status" aria-live="polite">
              {copyStatus}
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
};
