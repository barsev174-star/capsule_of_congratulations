"use client";

import { useState } from "react";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import styles from "./manage-page.module.css";

type Props = {
  value: string;
  label?: string;
  cardId?: string;
  telemetrySource?: "participant" | "manage" | "gift";
};

export const CopyLinkButton = ({ value, label = "Копировать ссылку", cardId, telemetrySource }: Props) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const absoluteUrl = new URL(value, window.location.origin).toString();
    await navigator.clipboard.writeText(absoluteUrl);
    if (cardId && telemetrySource === "participant") {
      sendClientTelemetry("funnel.participant_link_copied", { cardId, source: "manager" });
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button type="button" className={styles.copyLinkButton} onClick={handleCopy}>
      {copied ? "Скопировано" : label}
    </button>
  );
};
