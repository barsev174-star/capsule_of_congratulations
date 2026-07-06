"use client";

import { useState } from "react";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import styles from "./manage-page.module.css";

type Props = {
  value: string;
  label?: string;
  copiedLabel?: string;
  cardId?: string;
  telemetrySource?: "participant" | "manage" | "gift";
  className?: string;
};

const copyWithFallback = async (text: string): Promise<boolean> => {
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

  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await (navigator as Navigator).share({ url: text });
      return true;
    } catch {
      // User cancelled or share failed.
    }
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
    const absoluteUrl = new URL(value, window.location.origin).toString();
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
