import type { TemplateProfile, UniversalTemplateBlockId } from "@/lib/templates/profile";

export const universalBareSectionIds = ["hero", "qualities", "quotes"] as const satisfies readonly UniversalTemplateBlockId[];

export const isUniversalBareSection = (id: UniversalTemplateBlockId, profile?: TemplateProfile) =>
  universalBareSectionIds.includes(id as (typeof universalBareSectionIds)[number])
  && profile?.assets.sections[id]?.presentation !== "surface";
