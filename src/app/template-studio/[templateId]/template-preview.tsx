"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { TemplateCardRenderer } from "@/components/templates/template-card-renderer";
import { UniversalTemplateExportCard } from "@/components/templates/universal-v1/universal-export-card";
import { UniversalTemplateIntroPreview } from "@/components/templates/universal-v1/universal-intro-preview";
import type { UniversalMessageScenario } from "@/lib/templates/fixtures";
import {
  DEFAULT_UNIVERSAL_PUBLIC_HERO_DESCRIPTION,
  type UniversalTemplateFixtureId
} from "@/lib/templates/profile";
import { defineUniversalTemplateRegistration } from "@/lib/templates/registry";
import { resolveTemplateExportAsset } from "@/lib/templates/export-asset-url";
import type {
  TemplateStudioDraft,
  TemplateStudioFormat,
  TemplateStudioSurface,
  TemplateStudioViewport
} from "@/lib/templates/studio";
import { buildUniversalFixtureViewModel } from "@/lib/templates/view-model";
import styles from "./template-studio.module.css";

export type TemplateStudioTextMode = "short" | "default" | "limit";

type TemplatePreviewProps = {
  draft: TemplateStudioDraft;
  fixtureId: UniversalTemplateFixtureId;
  scenario: UniversalMessageScenario;
  surface: TemplateStudioSurface;
  viewport: TemplateStudioViewport;
  format: TemplateStudioFormat;
  photoCount: 0 | 1 | 2 | 3;
  longName: boolean;
  textMode: TemplateStudioTextMode;
  optionalBlocks: boolean;
  longCaptions: boolean;
};

export function TemplatePreview({
  draft,
  fixtureId,
  scenario,
  surface,
  viewport,
  format,
  photoCount,
  longName,
  textMode,
  optionalBlocks,
  longCaptions
}: TemplatePreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const geometry = draft.inspector.variants[format === "web" ? viewport : "export"];
  const model = useMemo(() => {
    const fixtureModel = buildUniversalFixtureViewModel(fixtureId, {
      templateId: draft.profile.id,
      scenario,
      photoCount,
      longName,
      textMode,
      optionalBlocks,
      longCaptions
    });
    return {
      ...fixtureModel,
      heroDescription: surface === "public"
        ? draft.profile.public.heroDescription?.trim() || DEFAULT_UNIVERSAL_PUBLIC_HERO_DESCRIPTION
        : fixtureModel.heroDescription,
      publicPhotoCount: fixtureModel.privatePhotoCount
        ?? fixtureModel.messagePhotos.length + fixtureModel.memoryPhotos.length
    };
  }, [
    draft.profile.id,
    draft.profile.public.heroDescription,
    fixtureId,
    longCaptions,
    longName,
    optionalBlocks,
    photoCount,
    scenario,
    surface,
    textMode
  ]);
  const dispatch = useMemo(() => ({
    kind: "universal-v1" as const,
    registration: defineUniversalTemplateRegistration(draft.profile, {
      name: draft.profile.metadata.name,
      description: draft.profile.metadata.description,
      recommendedFor: ["personal"],
      accent: draft.profile.metadata.accent,
      availability: "studio"
    })
  }), [draft.profile]);
  const previewStyle = {
    "--safe-x": `${geometry.safeArea.x * 100}%`,
    "--safe-y": `${geometry.safeArea.y * 100}%`,
    "--safe-width": `${geometry.safeArea.width * 100}%`,
    "--safe-height": `${geometry.safeArea.height * 100}%`
  } as CSSProperties;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      host.querySelectorAll<HTMLElement>("[data-safe-text]").forEach((node) => {
        const computed = getComputedStyle(node);
        const clipsVertically = computed.overflowY !== "visible" || computed.maxHeight !== "none";
        const overflows = node.scrollWidth > node.clientWidth + 2
          || (clipsVertically && node.scrollHeight > node.clientHeight + 2);
        node.dataset.overflow = overflows ? "true" : "false";
        node.title = overflows ? "Текст вышел за безопасную область" : "";
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [model, surface, viewport, format, draft.profile]);

  return (
    <div className={styles.previewStack}>
      <div className={styles.guideLegend} aria-label="Обозначения технических границ">
        <span data-guide="canvas">Safe area холста</span>
        <span data-guide="underlay">Граница подложки</span>
        <span data-guide="content">Контент блока</span>
        <span data-guide="frame">Рамка / плашка</span>
        <span data-guide="aperture">Окно фотографии</span>
        <span data-guide="text">Жёсткий лимит текста / подпись</span>
        <small>Пунктир виден только в ателье и не попадает в готовую открытку.</small>
      </div>
      <div
        ref={hostRef}
        className={styles.previewViewport}
        data-viewport={viewport}
        data-format={format}
        style={previewStyle}
        aria-label={`Предпросмотр ${surface}, ${format}, ${viewport}`}
      >
        <div className={styles.safeAreaGuide} aria-hidden="true"><span>safe area холста</span></div>
        <div className={styles.rendererHost}>
          {format === "web" ? (
            <TemplateCardRenderer
              dispatch={dispatch}
              model={model}
              surface={surface}
              viewport={viewport}
              actionContext="studio"
              debugSafeAreas
            />
          ) : (
            <UniversalTemplateExportCard
              profile={draft.profile}
              model={model}
              format={format}
              resolveAsset={resolveTemplateExportAsset}
            />
          )}
        </div>
      </div>

      <div className={styles.introPreviewRow}>
        <div><span>Облегчённое открытие</span><p>Только intro-токены профиля, без тяжёлых ассетов полной открытки.</p></div>
        <UniversalTemplateIntroPreview
          profile={draft.profile}
          recipientName={model.recipientName}
          fromLabel={model.fromLabel}
          className={styles.studioIntroPreview}
        />
      </div>
    </div>
  );
}
