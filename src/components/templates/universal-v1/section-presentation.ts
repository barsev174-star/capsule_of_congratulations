import type { UniversalTemplateBlockId } from "@/lib/templates/profile";

export const universalBareSectionIds = ["hero", "qualities", "quotes"] as const satisfies readonly UniversalTemplateBlockId[];

export const isUniversalBareSection = (id: UniversalTemplateBlockId) =>
  universalBareSectionIds.includes(id as (typeof universalBareSectionIds)[number]);
