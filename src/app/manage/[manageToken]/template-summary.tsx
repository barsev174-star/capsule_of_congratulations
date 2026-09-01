"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { CardTemplate } from "@/lib/cards/templates";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import { giftAnimations, type GiftAnimationId } from "@/lib/gift-animations";
import { getRevealExampleHref, RevealIcon, RevealSettingsDialog } from "./reveal-settings-dialog";
import { TemplateSettingsForm } from "./template-settings-form";
import { updateGiftAnimationAction } from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  templates: CardTemplate[];
  initialTemplateId: CardTemplate["id"] | null;
  initialAnimationId: GiftAnimationId;
};

export const TemplateSummary = ({
  manageToken,
  templates,
  initialTemplateId,
  initialAnimationId
}: Props) => {
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isRevealPickerOpen, setIsRevealPickerOpen] = useState(false);
  const [animationId, setAnimationId] = useState(initialAnimationId);
  const openerButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? null;
  const selectedAnimation = giftAnimations.find((animation) => animation.id === animationId) ?? giftAnimations[0];
  const handleAnimationAction = async (previousState: { ok: boolean; message: string }, formData: FormData) => {
    const requestedAnimationId = String(formData.get("giftAnimationId") ?? "");
    const result = await updateGiftAnimationAction(previousState, formData);
    if (result.ok && (requestedAnimationId === "envelope" || requestedAnimationId === "collect-messages")) {
      setAnimationId(requestedAnimationId);
      sendClientTelemetry("REVEAL_TYPE_SELECTED", {
        templateId: selectedTemplate?.id ?? "",
        revealType: requestedAnimationId,
        savedRevealType: requestedAnimationId,
        source: "reveal_modal"
      });
    }
    return result;
  };
  const [animationState, animationAction, isAnimationPending] = useActionState(handleAnimationAction, {
    ok: false,
    message: ""
  });
  const previewSrc = selectedTemplate?.preview
    ?? (selectedTemplate?.id === "route-adventure"
      ? "/assets/landing/template-route-adventure-preview.png"
      : selectedTemplate?.id === "paper-birthday"
        ? "/templates/warm-classic-preview.png"
        : null);

  const trackSidebarExample = () => {
    if (!selectedTemplate) return;
    sendClientTelemetry("REVEAL_EXAMPLE_OPENED", {
      templateId: selectedTemplate.id,
      previewedRevealType: animationId,
      savedRevealType: animationId,
      source: "editor_sidebar"
    });
  };

  const openRevealPicker = () => {
    if (!selectedTemplate) return;
    sendClientTelemetry("REVEAL_SETTINGS_MODAL_OPENED", {
      templateId: selectedTemplate.id,
      revealType: animationId,
      savedRevealType: animationId,
      source: "editor_sidebar"
    });
    setIsRevealPickerOpen(true);
  };

  const closeRevealPicker = () => {
    if (selectedTemplate) {
      sendClientTelemetry("REVEAL_SETTINGS_MODAL_CLOSED", {
        templateId: selectedTemplate.id,
        revealType: animationId,
        savedRevealType: animationId,
        source: "reveal_modal"
      });
    }
    setIsRevealPickerOpen(false);
  };

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
        {previewSrc && selectedTemplate ? (
          <div className={styles.templatePreviewWrap}>
            {/* Intentional fixed preview asset inside a CSS-sized template frame. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
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
              {selectedTemplate?.description ?? "Обязательный шаг"}
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

      {selectedTemplate ? (
        <section className={styles.revealSummary} aria-labelledby="reveal-summary-title">
          <div className={styles.revealSummaryHeading}>
            <span>Способ открытия</span>
            <h3 id="reveal-summary-title">Как получатель впервые увидит подарок</h3>
          </div>
          <div className={styles.revealSummaryCurrent}>
            <RevealIcon animationId={selectedAnimation.id} />
            <div>
              <strong>{selectedAnimation.name}</strong>
              <p>{selectedAnimation.description}</p>
            </div>
          </div>
          <div className={styles.revealSummaryFooter}>
            <div className={styles.revealSummaryActions}>
              <button type="button" onClick={openRevealPicker}>
                Изменить
              </button>
              <a
                href={getRevealExampleHref(selectedTemplate.id, animationId)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackSidebarExample}
              >
                Посмотреть пример <span aria-hidden="true">↗</span>
              </a>
            </div>
            <span className={styles.revealSaveStatus} role="status" aria-live="polite">
              {isAnimationPending ? "Сохраняем…" : animationState.message || "Сохранено"}
            </span>
          </div>
        </section>
      ) : null}

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

      {isRevealPickerOpen && selectedTemplate ? (
        <RevealSettingsDialog
          manageToken={manageToken}
          templateId={selectedTemplate.id}
          templatePreviewSrc={previewSrc ?? "/templates/warm-classic-preview.png"}
          selectedAnimationId={animationId}
          action={animationAction}
          isPending={isAnimationPending}
          errorMessage={animationState.ok ? "" : animationState.message}
          onClose={closeRevealPicker}
        />
      ) : null}
    </div>
  );
};
