import type { CardTemplateId } from "@/lib/cards/templates";
import type { NormalizedRect, TemplateGiftVisualPreset, TemplateMotionPreset } from "@/lib/templates/profile";

export type GiftRevealPreviewProfile = {
  visualPreset: TemplateGiftVisualPreset;
  motionPreset: TemplateMotionPreset;
  targetZones: {
    messages: NormalizedRect;
    photos: NormalizedRect;
    qualities: NormalizedRect;
    quotes: NormalizedRect;
  };
};

const profile = (
  visualPreset: TemplateGiftVisualPreset,
  motionPreset: TemplateMotionPreset,
  targetZones: GiftRevealPreviewProfile["targetZones"]
): GiftRevealPreviewProfile => ({ visualPreset, motionPreset, targetZones });

const defaultZones = {
  messages: { x: 0.08, y: 0.28, width: 0.48, height: 0.55 },
  photos: { x: 0.57, y: 0.18, width: 0.35, height: 0.42 },
  qualities: { x: 0.09, y: 0.12, width: 0.52, height: 0.14 },
  quotes: { x: 0.57, y: 0.64, width: 0.34, height: 0.22 }
} satisfies GiftRevealPreviewProfile["targetZones"];

const REVEAL_PREVIEW_PROFILES: Partial<Record<CardTemplateId, GiftRevealPreviewProfile>> = {
  "paper-birthday": profile("paper-celebration", "playful", defaultZones),
  "route-adventure": profile("expedition", "calm", {
    messages: { x: 0.09, y: 0.31, width: 0.52, height: 0.5 },
    photos: { x: 0.6, y: 0.16, width: 0.31, height: 0.46 },
    qualities: { x: 0.1, y: 0.14, width: 0.48, height: 0.13 },
    quotes: { x: 0.59, y: 0.65, width: 0.32, height: 0.2 }
  }),
  "school-scrapbook": profile("school-playful", "playful", defaultZones),
  "school-classic": profile("school-formal", "calm", {
    messages: { x: 0.12, y: 0.29, width: 0.44, height: 0.51 },
    photos: { x: 0.6, y: 0.22, width: 0.28, height: 0.38 },
    qualities: { x: 0.16, y: 0.12, width: 0.68, height: 0.12 },
    quotes: { x: 0.58, y: 0.64, width: 0.31, height: 0.18 }
  }),
  "kindergarten-doodles": profile("caregiver-playful", "playful", defaultZones),
  "team-editorial": profile("editorial", "calm", {
    messages: { x: 0.08, y: 0.32, width: 0.5, height: 0.5 },
    photos: { x: 0.62, y: 0.17, width: 0.29, height: 0.43 },
    qualities: { x: 0.09, y: 0.14, width: 0.56, height: 0.13 },
    quotes: { x: 0.58, y: 0.66, width: 0.34, height: 0.18 }
  })
};

export const getGiftRevealPreviewProfile = (templateId: CardTemplateId) =>
  REVEAL_PREVIEW_PROFILES[templateId] ?? null;

export const hasGiftRevealPreviewProfile = (templateId: CardTemplateId) =>
  Boolean(getGiftRevealPreviewProfile(templateId));
