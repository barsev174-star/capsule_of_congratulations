"use client";

import { useActionState, useState } from "react";
import type { CardTemplate } from "@/lib/cards/templates";
import { updateCardTemplateAction } from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  templates: CardTemplate[];
  currentTemplateId: CardTemplate["id"] | null;
  currentTheme?: string | null;
  onTemplateSelectionChange?: (templateId: CardTemplate["id"], theme?: string) => void;
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
  currentTheme,
  onTemplateSelectionChange,
  onApplied
}: Props) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(currentTemplateId);
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
  const themes = selectedTemplate?.themes;
  const theme = themes?.find((option) => option.id === selectedTheme) ?? themes?.[0];
  const handleTemplateAction = async (previousState: typeof initialState, formData: FormData) => {
    const result = await updateCardTemplateAction(previousState, formData);
    if (result.ok && selectedTemplateId) {
      if (theme) onTemplateSelectionChange?.(selectedTemplateId, theme.id);
      else onTemplateSelectionChange?.(selectedTemplateId);
      onApplied?.();
    }
    return result;
  };
  const [state, formAction, isPending] = useActionState(handleTemplateAction, initialState);

  const selectTemplate = (templateId: CardTemplate["id"]) => {
    setSelectedTemplateId(templateId);
    setSelectedTheme(templateId === currentTemplateId ? currentTheme : null);
  };
  const isCurrentTemplateSelected =
    selectedTemplateId !== null && selectedTemplateId === currentTemplateId;
  const isCurrentSelection = isCurrentTemplateSelected && theme?.id === (currentTheme ?? themes?.[0]?.id);

  return (
    <form action={formAction} className={styles.templatePickerForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <div className={styles.templatePickerGrid} role="radiogroup" aria-label="Шаблоны открытки">
        {templates.map((template) => {
          const selected = selectedTemplateId === template.id;
          const isCurrent = currentTemplateId === template.id;
          const isNewSelection = selected && !isCurrent;
          const previewSrc = (selected ? theme?.preview : undefined) ?? template.preview
            ?? (template.id === "route-adventure"
              ? "/assets/landing/template-route-adventure-preview.png"
              : "/templates/warm-classic-preview.png");
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
                disabled={isPending}
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
      {themes?.length ? (
        <fieldset className={styles.templateThemePicker} disabled={isPending}>
          <legend>Цвет оформления</legend>
          <div className={styles.templateThemeOptions}>
            {themes.map((option) => (
              <label key={option.id} className={styles.templateThemeOption}>
                <input type="radio" name="templateTheme" value={option.id}
                  checked={option.id === theme?.id} onChange={() => setSelectedTheme(option.id)} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={option.preview} width={44} height={28} alt="" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className={styles.templatePickerFooter}>
        <span id="template-picker-status" role="status" aria-live="polite">
          {state.message ||
            (!selectedTemplate
              ? "Сначала выберите шаблон"
              : isCurrentSelection
              ? `Шаблон «${selectedTemplate.name}» используется сейчас`
              : theme ? `Будет применено оформление «${theme.label}»` : `Будет применён шаблон «${selectedTemplate.name}»`)}
        </span>
        <button
          type="submit"
          className={styles.contentPrimaryButton}
          disabled={isPending || !selectedTemplate || isCurrentSelection}
        >
          {isPending
            ? "Применяем…"
            : !selectedTemplate
              ? "Выберите шаблон"
              : isCurrentSelection
                ? "Этот шаблон уже используется"
                : isCurrentTemplateSelected ? "Применить цвет" : "Применить шаблон"}
        </button>
      </div>
    </form>
  );
};
