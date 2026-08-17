"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deliverCardAction, openCollectionAction } from "./actions";
import { ShareLinkButton } from "./copy-link-button";
import { useMobileInputActivity } from "./use-mobile-input-activity";
import { useModalFocus } from "./use-modal-focus";
import styles from "./manage-page.module.css";

type PrimaryAction =
  | { kind: "link"; href: string; label: string; external?: boolean }
  | { kind: "open-collection"; label: string; disabled?: boolean }
  | { kind: "deliver"; label: string }
  | { kind: "share"; label: string; value: string };

type Props = {
  manageToken: string;
  primaryAction: PrimaryAction;
  deliveryVersion?: string;
  deliveryWarnings?: string[];
  mobileOnly?: boolean;
};

const initialDeliveryState = { ok: false, message: "" };

const DeliveryConfirmationButton = ({
  manageToken,
  cardVersion,
  label,
  warnings
}: {
  manageToken: string;
  cardVersion: string;
  label: string;
  warnings: string[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [state, formAction, pending] = useActionState(deliverCardAction, initialDeliveryState);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(dialogRef, () => {
    if (!pending) setIsOpen(false);
  }, isOpen);

  return (
    <>
      <button type="button" className={styles.designStickyPrimary} onClick={() => setIsOpen(true)}>
        {label}
      </button>
      {isOpen
        ? createPortal(
            <div className={styles.deliveryDialogBackdrop} role="presentation">
              <div
                ref={dialogRef}
                className={styles.deliveryDialog}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delivery-dialog-title"
                aria-describedby="delivery-dialog-description"
                tabIndex={-1}
              >
                <div className={styles.deliveryDialogCopy}>
                  <span className={styles.deliveryDialogEyebrow}>Последняя проверка</span>
                  <h2 id="delivery-dialog-title">Передать открытку получателю?</h2>
                  <p id="delivery-dialog-description">
                    После передачи поздравления, фотографии и оформление нельзя будет изменить.
                  </p>
                </div>
                <ul className={styles.deliveryChecklist}>
                  <li>Поздравления прочитаны и расположены верно</li>
                  <li>Фотографии и их кадрирование проверены</li>
                  <li>Оформление и предпросмотр выглядят правильно</li>
                </ul>
                {warnings.length > 0 ? (
                  <div className={styles.deliveryWarning} role="status">
                    <strong>Можно передать без обновления</strong>
                    <ul>
                      {warnings.map((warning) => <li key={warning}>{warning}</li>)}
                    </ul>
                  </div>
                ) : null}
                <form action={formAction} className={styles.deliveryDialogForm}>
                  <input type="hidden" name="manageToken" value={manageToken} />
                  <input type="hidden" name="cardVersion" value={cardVersion} />
                  <label className={styles.deliveryAcknowledgement}>
                    <input
                      type="checkbox"
                      name="deliveryConfirmed"
                      checked={checked}
                      onChange={(event) => setChecked(event.target.checked)}
                    />
                    <span>Я проверил(а) финальную версию и понимаю, что после передачи редактирование будет заблокировано.</span>
                  </label>
                  {state.message && !state.ok ? (
                    <p className={styles.deliveryDialogError} role="alert">{state.message}</p>
                  ) : null}
                  <div className={styles.deliveryDialogActions}>
                    <button type="button" className={styles.deliveryCancel} disabled={pending} onClick={() => setIsOpen(false)}>
                      Вернуться к проверке
                    </button>
                    <button type="submit" className={styles.deliveryConfirm} disabled={!checked || pending}>
                      {pending ? "Передаём…" : "Передать получателю"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export const DesignStickyActions = ({
  manageToken,
  primaryAction,
  deliveryVersion,
  deliveryWarnings = [],
  mobileOnly = false
}: Props) => {
  const [basicsState, setBasicsState] = useState({ isDirty: false, isPending: false });
  const isInputActive = useMobileInputActivity();

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
    <DeliveryConfirmationButton
      manageToken={manageToken}
      cardVersion={deliveryVersion ?? ""}
      label={primaryAction.label}
      warnings={deliveryWarnings}
    />
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
    <div
      className={`${styles.designStickyActions} ${mobileOnly ? styles.designStickyActionsMobileOnly : ""} ${
        isInputActive ? styles.mobileStickySuppressed : ""
      }`}
      aria-hidden={isInputActive}
    >
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
