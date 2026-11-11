"use client";

import { useActionState, useState } from "react";
import type { CardTemplate } from "@/lib/cards/templates";
import type { GiftAnimationId } from "@/lib/gift-animations";
import { updateCardTemplateAction } from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  templates: CardTemplate[];
  currentTemplateId: CardTemplate["id"] | null;
  currentTheme?: string | null;
  onTemplateSelectionChange?: (templateId: CardTemplate["id"], theme?: string, animationId?: GiftAnimationId | null) => void;
  onApplied?: () => void;
};

const initialState = {
  ok: false,
  message: ""
};

type TemplateOption = {
  key: string;
  templateId: CardTemplate["id"];
  themeId?: string;
  name: string;
  description: string;
  preview?: string;
};

export const resolveCatalogTheme = (template: CardTemplate | null | undefined, themeId?: string | null) =>
  template?.themes?.find(({ id }) => id === themeId)
  ?? template?.themes?.find(({ id }) => id === template.defaultThemeId)
  ?? template?.themes?.[0];

export const TemplateSettingsForm = ({
  manageToken,
  templates,
  currentTemplateId,
  currentTheme,
  onTemplateSelectionChange,
  onApplied
}: Props) => {
  const currentTemplate = templates.find(({ id }) => id === currentTemplateId);
  const savedTheme = resolveCatalogTheme(currentTemplate, currentTheme);
  const currentKey = savedTheme ? `${currentTemplateId}:${savedTheme.id}` : currentTemplateId;
  const [selectedKey, setSelectedKey] = useState(currentKey);
  const options = templates.flatMap<TemplateOption>((template) => template.themes?.length
    ? template.themes.map(({ id, name, description, preview }) => ({
        key: `${template.id}:${id}`, templateId: template.id, themeId: id, name, description, preview
      }))
    : [{ key: template.id, templateId: template.id, name: template.name, description: template.description, preview: template.preview }]
  ).sort((left, right) => Number(Boolean(right.themeId)) - Number(Boolean(left.themeId)));
  const selectedOption = options.find(({ key }) => key === selectedKey);
  const isCurrentSelection = selectedOption?.key === currentKey;
  const handleTemplateAction = async (previousState: typeof initialState, formData: FormData) => {
    const result = await updateCardTemplateAction(previousState, formData);
    if (result.ok && selectedOption) {
      onTemplateSelectionChange?.(selectedOption.templateId, selectedOption.themeId, result.giftAnimationId);
      onApplied?.();
    }
    return result;
  };
  const [state, formAction, isPending] = useActionState(handleTemplateAction, initialState);

  return (
    <form action={formAction} className={styles.templatePickerForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <input type="hidden" name="templateId" value={selectedOption?.templateId ?? ""} />
      {selectedOption?.themeId ? <input type="hidden" name="templateTheme" value={selectedOption.themeId} /> : null}
      <div className={styles.templatePickerGrid} role="radiogroup" aria-label="Шаблоны открытки">
        {options.map((option) => {
          const selected = selectedKey === option.key;
          const isCurrent = currentKey === option.key;
          const showSelection = selected && (!isCurrent || Boolean(option.themeId));
          const previewSrc = option.preview
            ?? (option.templateId === "route-adventure"
              ? "/assets/landing/template-route-adventure-preview.png"
              : "/templates/warm-classic-preview.png");
          return (
            <label
              key={option.key}
              className={`${styles.templatePickerCard} ${option.themeId ? styles.templatePickerCardThemed : ""} ${
                showSelection ? styles.templatePickerCardActive : isCurrent ? styles.templatePickerCardCurrent : ""
              }`}
              aria-selected={selected}
            >
              <input
                type="radio"
                name="templateChoice"
                value={option.key}
                checked={selected}
                disabled={isPending}
                onChange={() => setSelectedKey(option.key)}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc} alt="" />
              <span className={styles.templatePickerCardCopy}>
                <strong>{option.name}</strong>
                <span className={styles.templatePickerCardDescription}>{option.description}</span>
                {isCurrent && option.themeId ? <span className={styles.templatePickerUsedBadge}>Используется</span> : null}
              </span>
              {isCurrent && !option.themeId ? (
                <span className={styles.templatePickerUsedBadge}>Используется</span>
              ) : null}
              {showSelection ? (
                <span className={styles.templatePickerCheck} aria-hidden="true">✓</span>
              ) : null}
            </label>
          );
        })}
      </div>
      <div className={styles.templatePickerFooter}>
        <span id="template-picker-status" role="status" aria-live="polite">
          {state.message ||
            (!selectedOption
              ? "Сначала выберите шаблон"
              : isCurrentSelection
              ? `Шаблон «${selectedOption.name}» используется сейчас`
              : `Будет применён шаблон «${selectedOption.name}»`)}
        </span>
        <button
          type="submit"
          className={styles.contentPrimaryButton}
          disabled={isPending || !selectedOption || isCurrentSelection}
        >
          {isPending
            ? "Применяем…"
            : !selectedOption
              ? "Выберите шаблон"
              : isCurrentSelection
                ? "Этот шаблон уже используется"
                : "Применить шаблон"}
        </button>
      </div>
    </form>
  );
};
