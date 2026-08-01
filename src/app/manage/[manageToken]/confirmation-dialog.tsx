"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./manage-page.module.css";
import { useModalFocus } from "./use-modal-focus";

type ConfirmationAction = {
  label: string;
  onClick: () => void;
  tone?: "primary" | "secondary" | "danger";
  disabled?: boolean;
};

type Props = {
  title: string;
  description: string;
  actions: ConfirmationAction[];
  onDismiss: () => void;
};

export const ConfirmationDialog = ({ title, description, actions, onDismiss }: Props) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(dialogRef, onDismiss);

  return createPortal(
    <div className={styles.confirmationBackdrop}>
      <div
        ref={dialogRef}
        className={styles.confirmationDialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
        tabIndex={-1}
      >
        <div className={styles.confirmationCopy}>
          <h2 id="confirmation-title">{title}</h2>
          <p id="confirmation-description">{description}</p>
        </div>
        <div className={styles.confirmationActions}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={
                action.tone === "danger"
                  ? styles.confirmationDanger
                  : action.tone === "secondary"
                    ? styles.confirmationSecondary
                    : styles.confirmationPrimary
              }
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};
