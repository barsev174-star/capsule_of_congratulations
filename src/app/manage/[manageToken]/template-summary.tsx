"use client";

import { useEffect, useRef, useState } from "react";
import type { CardTemplate } from "@/lib/cards/templates";
import { TemplateSettingsForm } from "./template-settings-form";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  templates: CardTemplate[];
  initialTemplateId: CardTemplate["id"] | null;
};

export const TemplateSummary = ({
  manageToken,
  templates,
  initialTemplateId
}: Props) => {
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const openerButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? null;
  const isPreviewTemplate = selectedTemplate
    ? selectedTemplate.id === "paper-birthday" || selectedTemplate.id === "route-adventure"
    : false;

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    const openerButton = openerButtonRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPickerOpen(false);
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      openerButton?.focus({ preventScroll: true });
    };
  }, [isPickerOpen]);

  return (
    <div className={styles.templateSummary}>
      <div className={styles.templateSummaryMain}>
        {isPreviewTemplate && selectedTemplate ? (
          <div className={styles.templatePreviewWrap}>
            {/* Intentional fixed preview asset inside a CSS-sized template frame. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedTemplate.id === "route-adventure" ? "/assets/landing/template-route-adventure-preview.png" : "/templates/warm-classic-preview.png"}
              alt={selectedTemplate.name}
              className={styles.templatePreviewImage}
            />
          </div>
        ) : selectedTemplate ? (
          <div className={styles.templatePreviewPlaceholder}>
            <span className={styles.templatePreviewPlaceholderIcon}>🎨</span>
            <span className={styles.templatePreviewPlaceholderText}>Другие шаблоны появятся позже</span>
          </div>
        ) : (
          <div className={styles.templatePreviewPlaceholder}>
            <span className={styles.templatePreviewPlaceholderIcon} aria-hidden="true">＋</span>
            <span className={styles.templatePreviewPlaceholderText}>Выберите оформление открытки</span>
          </div>
        )}

        <div className={styles.templateSummaryText}>
          <div className={styles.templateNameRow}>
            <strong>{selectedTemplate?.name ?? "Шаблон не выбран"}</strong>
          </div>
          <p>
            <span className={styles.templateDescriptionDesktop}>
              {selectedTemplate?.description ?? "Это обязательный шаг перед открытием сбора."}
            </span>
            <span className={styles.templateDescriptionMobile}>
              {!selectedTemplate
                ? "Обязательный шаг"
                : selectedTemplate.id === "route-adventure"
                ? "Приключенческий тёмный стиль"
                : "Тёплый бумажный стиль"}
            </span>
          </p>
          <button
            ref={openerButtonRef}
            type="button"
            className={styles.templateChangeButton}
            onClick={() => setIsPickerOpen(true)}
          >
            {selectedTemplate ? "Выбрать другой шаблон" : "Выбрать шаблон"}
          </button>
        </div>
      </div>

      {selectedTemplate ? <div className={styles.templateAnimationInline}>
        <div className={styles.envelopeIcon} aria-hidden="true">
          <span />
        </div>
        <div>
          <strong>Анимация: конверт с открыткой</strong>
          <p>Получатель увидит открывающийся конверт после передачи.</p>
        </div>
      </div> : null}

      {isPickerOpen ? (
        <div className={styles.templateDialogBackdrop} role="presentation" onMouseDown={() => setIsPickerOpen(false)}>
          <section
            ref={dialogRef}
            className={styles.templateDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.templateDialogHeader}>
              <div>
                <span>Оформление открытки</span>
                <h3 id="template-dialog-title">Выберите шаблон</h3>
              </div>
              <button ref={closeButtonRef} type="button" onClick={() => setIsPickerOpen(false)} aria-label="Закрыть выбор шаблона">×</button>
            </div>
            <TemplateSettingsForm
              manageToken={manageToken}
              templates={templates}
              currentTemplateId={templateId}
              onTemplateSelectionChange={setTemplateId}
              onApplied={() => setIsPickerOpen(false)}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
};
