"use client";

import { useEffect, useState } from "react";
import { deliverCardAction, openCollectionAction } from "./actions";
import { ShareLinkButton } from "./copy-link-button";
import styles from "./manage-page.module.css";

type PrimaryAction =
  | { kind: "link"; href: string; label: string; external?: boolean }
  | { kind: "open-collection"; label: string; disabled?: boolean }
  | { kind: "deliver"; label: string }
  | { kind: "share"; label: string; value: string };

type Props = {
  manageToken: string;
  primaryAction: PrimaryAction;
};

export const DesignStickyActions = ({
  manageToken,
  primaryAction
}: Props) => {
  const [basicsState, setBasicsState] = useState({ isDirty: false, isPending: false });

  useEffect(() => {
    const handleState = (event: Event) => {
      const detail = (event as CustomEvent<{ isDirty: boolean; isPending: boolean }>).detail;
      setBasicsState(detail);
    };
    window.addEventListener("manage:basics-dirty", handleState);
    return () => window.removeEventListener("manage:basics-dirty", handleState);
  }, []);

  const primary = basicsState.isDirty ? (
    <button
      type="submit"
      form="manage-basics-form"
      className={styles.designStickyPrimary}
      disabled={basicsState.isPending}
    >
      {basicsState.isPending ? "Сохраняем…" : "Сохранить изменения"}
    </button>
  ) : primaryAction.kind === "open-collection" ? (
    <form action={openCollectionAction}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <button
        type="submit"
        className={styles.designStickyPrimary}
        disabled={primaryAction.disabled || basicsState.isPending}
      >
        {primaryAction.label}
      </button>
    </form>
  ) : primaryAction.kind === "deliver" ? (
    <form action={deliverCardAction}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <button type="submit" className={styles.designStickyPrimary}>
        {primaryAction.label}
      </button>
    </form>
  ) : primaryAction.kind === "share" ? (
    <ShareLinkButton
      value={primaryAction.value}
      label={primaryAction.label}
      className={styles.designStickyPrimary}
    />
  ) : (
    <a
      href={primaryAction.href}
      target={primaryAction.external ? "_blank" : undefined}
      rel={primaryAction.external ? "noopener noreferrer" : undefined}
      className={styles.designStickyPrimary}
    >
      {primaryAction.label}
    </a>
  );

  return (
    <div className={styles.designStickyActions}>
      <div className={styles.designStickyActionsInner}>
        <div className={styles.designSaveSummary} role="status" aria-live="polite">
          <span aria-hidden="true">{basicsState.isDirty ? "•" : "✓"}</span>
          <span>
            <strong>
              {basicsState.isPending
                ? "Сохраняем…"
                : basicsState.isDirty
                  ? "Есть несохранённые изменения"
                  : "Изменения сохранены"}
            </strong>
            <small>
              {basicsState.isDirty
                ? "Сначала сохраните основу открытки"
                : "Настройки состава сохраняются при изменении"}
            </small>
          </span>
        </div>
        <div className={styles.designStickyButtons}>
          {primary}
        </div>
      </div>
    </div>
  );
};
