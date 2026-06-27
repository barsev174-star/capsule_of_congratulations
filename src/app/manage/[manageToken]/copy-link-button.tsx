"use client";

import { useState } from "react";
import styles from "./manage-page.module.css";

type Props = {
  value: string;
  label?: string;
};

export const CopyLinkButton = ({ value, label = "Копировать ссылку" }: Props) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const absoluteUrl = new URL(value, window.location.origin).toString();
    await navigator.clipboard.writeText(absoluteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button type="button" className={styles.copyLinkButton} onClick={handleCopy}>
      {copied ? "Скопировано" : label}
    </button>
  );
};
