"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { CardTemplate } from "@/lib/cards/templates";
import type {
  FinalCardBlockId,
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout,
  FinalCardOptionalBlockId
} from "@/lib/final-card/types";
import { updateFinalPresentationSettingsAction } from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  templates: CardTemplate[];
  initialTemplateId: CardTemplate["id"];
  initialLayoutMode: FinalCardMessageLayoutMode;
  initialMediaLayout: FinalCardMessageMediaLayout;
  initialBlockOrder: FinalCardBlockId[];
  blockState: Record<FinalCardOptionalBlockId, boolean>;
  variant?: "grid" | "hero";
};

const initialState = {
  ok: false,
  message: ""
};

export const TemplateSettingsForm = ({
  manageToken,
  templates,
  initialTemplateId,
  initialLayoutMode,
  initialMediaLayout,
  initialBlockOrder,
  blockState,
  variant = "grid"
}: Props) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
  const [showApplied, setShowApplied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTemplateAction = async (previousState: typeof initialState, formData: FormData) => {
    const result = await updateFinalPresentationSettingsAction(previousState, formData);
    if (result.ok) {
      setShowApplied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowApplied(false), 2000);
    }
    return result;
  };
  const [, formAction, isPending] = useActionState(handleTemplateAction, initialState);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <form action={formAction} className={variant === "hero" ? styles.templateHeroForm : styles.templateForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <input type="hidden" name="layoutMode" value={initialLayoutMode} />
      <input type="hidden" name="mediaLayout" value={initialMediaLayout} />

      {initialBlockOrder.map((blockId) => (
        <input key={blockId} type="hidden" name="blockOrder" value={blockId} />
      ))}

      {Object.entries(blockState).map(([blockId, enabled]) => (
        <input key={blockId} type="hidden" name={blockId} value={enabled ? "on" : ""} />
      ))}

      {variant === "hero" ? (
        <>
          <label className={styles.templateHeroPicker}>
            <span className={styles.templateHeroPickerLabel}>Выбрать другой</span>
            <select
              name="templateId"
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value as CardTemplate["id"])}
              className={styles.templateHeroSelect}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.templateHeroActions}>
            <button type="submit" className={styles.secondaryButton} disabled={isPending}>
              {isPending ? "Применяем..." : showApplied ? "Шаблон применен ✓" : "Применить"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.templateGrid}>
            {templates.map((template) => (
              <label
                key={template.id}
                className={`${styles.templateCard} ${selectedTemplateId === template.id ? styles.templateCardActive : ""}`}
              >
                <input
                  type="radio"
                  name="templateId"
                  value={template.id}
                  defaultChecked={template.id === initialTemplateId}
                  onChange={() => setSelectedTemplateId(template.id)}
                />
                <span className={styles.templateSwatch} style={{ background: template.accent }} />
                <span className={styles.templateName}>{template.name}</span>
                <span className={styles.templateDescription}>{template.description}</span>
              </label>
            ))}
          </div>

          <div className={styles.editorFooter}>
            <button type="submit" className={styles.secondaryButton} disabled={isPending}>
              {isPending ? "Применяем..." : showApplied ? "Шаблон применен ✓" : "Применить"}
            </button>
          </div>
        </>
      )}
    </form>
  );
};
