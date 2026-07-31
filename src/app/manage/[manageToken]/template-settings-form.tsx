"use client";

import { useActionState, useState } from "react";
import type { CardTemplate } from "@/lib/cards/templates";
import { updateCardTemplateAction } from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  templates: CardTemplate[];
  currentTemplateId: CardTemplate["id"];
  onTemplateSelectionChange?: (templateId: CardTemplate["id"]) => void;
  onApplied?: () => void;
};

const initialState = {
  ok: false,
  message: ""
};

export const TemplateSettingsForm = ({
  manageToken,
  templates,
  currentTemplateId,
  onTemplateSelectionChange,
  onApplied
}: Props) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(currentTemplateId);
  const handleTemplateAction = async (previousState: typeof initialState, formData: FormData) => {
    const result = await updateCardTemplateAction(previousState, formData);
    if (result.ok) {
      onTemplateSelectionChange?.(selectedTemplateId);
      onApplied?.();
    }
    return result;
  };
  const [state, formAction, isPending] = useActionState(handleTemplateAction, initialState);

  const selectTemplate = (templateId: CardTemplate["id"]) => {
    setSelectedTemplateId(templateId);
  };
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? templates[0];
  const isCurrentTemplateSelected = selectedTemplateId === currentTemplateId;

  return (
    <form action={formAction} className={styles.templatePickerForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <div className={styles.templatePickerGrid} role="radiogroup" aria-label="Шаблоны открытки">
        {templates.map((template) => {
          const selected = selectedTemplateId === template.id;
          const isCurrent = currentTemplateId === template.id;
          const isNewSelection = selected && !isCurrent;
          const previewSrc = template.id === "route-adventure"
            ? "/assets/landing/template-route-adventure-preview.png"
            : "/templates/warm-classic-preview.png";
          return (
            <label
              key={template.id}
              className={`${styles.templatePickerCard} ${
                isCurrent ? styles.templatePickerCardCurrent : ""
              } ${isNewSelection ? styles.templatePickerCardActive : ""}`}
              aria-selected={selected}
            >
              <input
                type="radio"
                name="templateId"
                value={template.id}
                checked={selected}
                onChange={() => selectTemplate(template.id)}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc} alt="" />
              <span className={styles.templatePickerCardCopy}>
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </span>
              {isCurrent ? (
                <span className={styles.templatePickerUsedBadge}>Используется</span>
              ) : null}
              {isNewSelection ? (
                <span className={styles.templatePickerCheck} aria-hidden="true">✓</span>
              ) : null}
            </label>
          );
        })}
      </div>
      <div className={styles.templatePickerFooter}>
        <span id="template-picker-status" role="status" aria-live="polite">
          {state.message ||
            (isCurrentTemplateSelected
              ? `Шаблон «${selectedTemplate.name}» используется сейчас`
              : `Будет применён шаблон «${selectedTemplate.name}»`)}
        </span>
        <button type="submit" className={styles.contentPrimaryButton} disabled={isPending || isCurrentTemplateSelected}>
          {isPending ? "Применяем…" : isCurrentTemplateSelected ? "Этот шаблон уже используется" : "Применить шаблон"}
        </button>
      </div>
    </form>
  );
};
