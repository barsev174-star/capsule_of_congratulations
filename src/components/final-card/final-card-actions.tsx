"use client";

import { useState } from "react";
import styles from "./final-card.module.css";

const HeartIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path
      d="M12 20s-7-4.4-9.2-8.4C1.2 8.7 2.4 5.4 5.5 4.6c1.8-.5 3.7.2 4.8 1.7C11.4 4.8 13.3 4.1 15.1 4.6c3.1.8 4.3 4.1 2.7 7C19 15.6 12 20 12 20z"
      fill="currentColor"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M12 15V3m0 12l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SparkleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path
      d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.7 10.3 11 6 9.3l4.3-1.7L12 3zm6 11l.9 2.3L21 17l-2.1.7L18 20l-.9-2.3L15 17l2.1-.7L18 14z"
      fill="currentColor"
    />
  </svg>
);

export const FinalCardActions = () => {
  const [message, setMessage] = useState("");

  const handleThanks = () => {
    setMessage("Спасибо сохранено. В MVP это пока локальная реакция, дальше подключим передачу организатору.");
  };

  const handleSave = () => {
    window.print();
  };

  return (
    <>
      <div className={styles.actions}>
        <button type="button" className={`${styles.button} ${styles.primaryButton}`} onClick={handleThanks}>
          <HeartIcon />
          Спасибо, очень приятно!
        </button>
        <button type="button" className={`${styles.button} ${styles.secondaryButton}`} onClick={handleSave}>
          <DownloadIcon />
          Сохранить открытку
        </button>
        <a href="/create" className={`${styles.button} ${styles.secondaryButton}`}>
          <SparkleIcon />
          Создать такую же открытку
        </a>
      </div>
      {message ? (
        <p className={styles.actionFeedback} role="status">
          {message}
        </p>
      ) : null}
    </>
  );
};
