"use client";

import { useActionState, useState } from "react";
import type { CardTemplate } from "@/lib/cards/templates";
import type {
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
  blockState: Record<FinalCardOptionalBlockId, boolean>;
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
  blockState
}: Props) => {
  const [state, formAction, isPending] = useActionState(updateFinalPresentationSettingsAction, initialState);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);

  return (
    <form action={formAction} className={styles.templateForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <input type="hidden" name="layoutMode" value={initialLayoutMode} />
      <input type="hidden" name="mediaLayout" value={initialMediaLayout} />

      {Object.entries(blockState).map(([blockId, enabled]) => (
        <input key={blockId} type="hidden" name={blockId} value={enabled ? "on" : ""} />
      ))}

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
        <button type="submit" className={styles.button} disabled={isPending}>
          {isPending ? "Применяем шаблон..." : "Сохранить шаблон"}
        </button>
        {state.message ? (
          <span className={state.ok ? styles.editorSuccess : styles.editorError}>{state.message}</span>
        ) : null}
      </div>
    </form>
  );
};
