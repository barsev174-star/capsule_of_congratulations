"use client";

import { useState } from "react";
import type { CardTemplate } from "@/lib/cards/templates";
import type {
  FinalCardBlockId,
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout,
  FinalCardOptionalBlockId
} from "@/lib/final-card/types";
import { TemplateSettingsForm } from "./template-settings-form";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  templates: CardTemplate[];
  initialTemplateId: CardTemplate["id"];
  initialLayoutMode: FinalCardMessageLayoutMode;
  initialMediaLayout: FinalCardMessageMediaLayout;
  initialBlockOrder: FinalCardBlockId[];
  blockState: Record<FinalCardOptionalBlockId, boolean>;
};

export const TemplateSummary = ({
  manageToken,
  templates,
  initialTemplateId,
  initialLayoutMode,
  initialMediaLayout,
  initialBlockOrder,
  blockState
}: Props) => {
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? templates[0];
  const templatePalette = ["#eaded2", "#f4c59e", selectedTemplate.accent, "#5a3927", "#a8b792"];
  const isPreviewTemplate = selectedTemplate.id === "paper-birthday" || selectedTemplate.id === "route-adventure";

  return (
    <div className={styles.templateSummary}>
      {isPreviewTemplate ? (
        <div className={styles.templatePreviewWrap}>
          {/* Intentional fixed preview asset inside a CSS-sized template frame. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedTemplate.id === "route-adventure" ? "/assets/landing/template-route-adventure-preview.png" : "/templates/warm-classic-preview.png"}
            alt={selectedTemplate.name}
            className={styles.templatePreviewImage}
          />
        </div>
      ) : (
        <div className={styles.templatePreviewPlaceholder}>
          <span className={styles.templatePreviewPlaceholderIcon}>🎨</span>
          <span className={styles.templatePreviewPlaceholderText}>Другие шаблоны появятся позже</span>
        </div>
      )}

      <div className={styles.templateSummaryText}>
        <div className={styles.templateNameRow}>
          <strong>{selectedTemplate.name}</strong>
        </div>
        <p>{selectedTemplate.description}</p>
        <div className={styles.paletteRow} aria-label="Цветовая палитра">
          {templatePalette.map((color) => (
            <span key={color} style={{ backgroundColor: color }} />
          ))}
        </div>
        <TemplateSettingsForm
          manageToken={manageToken}
          templates={templates}
          initialTemplateId={initialTemplateId}
          initialLayoutMode={initialLayoutMode}
          initialMediaLayout={initialMediaLayout}
          initialBlockOrder={initialBlockOrder}
          blockState={blockState}
          onTemplateSelectionChange={setTemplateId}
          variant="hero"
        />
      </div>
    </div>
  );
};
