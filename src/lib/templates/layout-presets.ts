import {
  getFinalCardMessageLayoutProfile,
  type FinalCardMessageLayoutProfile
} from "@/lib/final-card/message-layout-rules";
import type {
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout
} from "@/lib/final-card/types";
import type { UniversalMessageScenario } from "@/lib/templates/fixtures";

export const universalLayoutPresetIds = ["route-v1"] as const;
export type UniversalLayoutPresetId = (typeof universalLayoutPresetIds)[number];

export type UniversalMessageMediaDistribution =
  | "none"
  | "single-fill"
  | "centered-pair"
  | "distributed-trio";

export type UniversalMessageLayoutRule = FinalCardMessageLayoutProfile & {
  scenario: UniversalMessageScenario;
  sourceLayoutMode: FinalCardMessageLayoutMode;
  sourceMediaLayout?: FinalCardMessageMediaLayout;
  photoCount: 0 | 1 | 2 | 3;
  photoFrame: "none" | "portrait" | "landscape";
  mediaDistribution: UniversalMessageMediaDistribution;
};

export type UniversalLayoutGeometry = {
  shellMaxWidth: number;
  shellPaddingMax: number;
  sectionGap: number;
  sectionRadius: number;
  sectionPaddingMax: number;
  sectionHeadingMax: number;
  heroMinHeight: number;
  heroPadding: number;
  recipientNameMax: number;
  recipientNameLongMax: number;
  summaryContentMaxWidth: number;
  summaryPaddingBlock: number;
  summaryPaddingInline: number;
  qualitiesPaddingTop: number;
  qualitiesPaddingBottom: number;
  qualitiesPaddingInline: number;
  qualityCardHeight: number;
  qualityFontMax: number;
  messagesPaddingBlock: number;
  messagesPaddingInline: number;
  messageCardHeight: number;
  messageGap: number;
  messageTextFontMax: number;
  messageTrioPhotoWidthPercent: number;
  photoCaptionFontMax: number;
  handwrittenPhotoCaptionFontMax: number;
  memoryCaptionFontMax: number;
  photoCaptionInlinePaddingPercent: number;
  quotesPaddingBlock: number;
  quotesHeadingGap: number;
  quotesHeadingInline: number;
  quoteCardHeight: number;
  quoteTextFontMax: number;
  closingHeight: number;
  closingFontMax: number;
};

export type UniversalLayoutPreset = {
  id: UniversalLayoutPresetId;
  referenceTemplateId: "route-adventure";
  geometry: UniversalLayoutGeometry;
  messages: Readonly<Record<UniversalMessageScenario, UniversalMessageLayoutRule>>;
};

const messageRule = (
  scenario: UniversalMessageScenario,
  sourceLayoutMode: FinalCardMessageLayoutMode,
  sourceMediaLayout: FinalCardMessageMediaLayout | undefined,
  photoCount: 0 | 1 | 2 | 3,
  mediaDistribution: UniversalMessageMediaDistribution
): UniversalMessageLayoutRule => ({
  scenario,
  sourceLayoutMode,
  sourceMediaLayout,
  photoCount,
  photoFrame: photoCount === 0
    ? "none"
    : sourceMediaLayout === "portrait"
      ? "portrait"
      : "landscape",
  mediaDistribution,
  ...getFinalCardMessageLayoutProfile(sourceLayoutMode, sourceMediaLayout)
});

export const routeV1LayoutPreset: UniversalLayoutPreset = {
  id: "route-v1",
  referenceTemplateId: "route-adventure",
  geometry: {
    shellMaxWidth: 1126,
    shellPaddingMax: 52,
    sectionGap: 24,
    sectionRadius: 28,
    sectionPaddingMax: 40,
    sectionHeadingMax: 24,
    heroMinHeight: 390,
    heroPadding: 32,
    recipientNameMax: 88,
    recipientNameLongMax: 64,
    summaryContentMaxWidth: 940,
    summaryPaddingBlock: 24,
    summaryPaddingInline: 24,
    qualitiesPaddingTop: 34,
    qualitiesPaddingBottom: 36,
    qualitiesPaddingInline: 24,
    qualityCardHeight: 68,
    qualityFontMax: 16,
    messagesPaddingBlock: 32,
    messagesPaddingInline: 24,
    messageCardHeight: 190,
    messageGap: 18,
    messageTextFontMax: 17,
    messageTrioPhotoWidthPercent: 86,
    photoCaptionFontMax: 18,
    handwrittenPhotoCaptionFontMax: 24,
    memoryCaptionFontMax: 28,
    photoCaptionInlinePaddingPercent: 8,
    quotesPaddingBlock: 8,
    quotesHeadingGap: 8,
    quotesHeadingInline: 24,
    quoteCardHeight: 150,
    quoteTextFontMax: 17,
    closingHeight: 176,
    closingFontMax: 28
  },
  messages: {
    "grid-2": messageRule("grid-2", "grid-2", undefined, 0, "none"),
    "carousel-1": messageRule("carousel-1", "carousel-1", undefined, 0, "none"),
    "carousel-2": messageRule("carousel-2", "carousel-2", undefined, 0, "none"),
    portrait: messageRule("portrait", "column-media", "portrait", 1, "single-fill"),
    "landscape-pair": messageRule("landscape-pair", "column-media", "landscape-pair", 2, "centered-pair"),
    "landscape-trio": messageRule("landscape-trio", "column-media", "landscape-trio", 3, "distributed-trio")
  }
};

const presets: Readonly<Record<UniversalLayoutPresetId, UniversalLayoutPreset>> = {
  "route-v1": routeV1LayoutPreset
};

export const getUniversalLayoutPreset = (id: UniversalLayoutPresetId) => presets[id];

export const getUniversalMessageLayoutRule = (
  presetId: UniversalLayoutPresetId,
  scenario: UniversalMessageScenario
) => getUniversalLayoutPreset(presetId).messages[scenario];

export const getUniversalMessageScenarioForPhotoCount = (
  presetId: UniversalLayoutPresetId,
  photoCount: number,
  noMediaScenario: UniversalMessageScenario = "grid-2"
): UniversalMessageScenario => {
  const preset = getUniversalLayoutPreset(presetId);
  if (photoCount <= 0) {
    return preset.messages[noMediaScenario].photoCount === 0 ? noMediaScenario : "grid-2";
  }

  const matchingRule = Object.values(preset.messages).find((rule) => rule.photoCount === photoCount);
  return matchingRule?.scenario ?? "landscape-trio";
};
