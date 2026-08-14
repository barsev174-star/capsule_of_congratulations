import type { UniversalTemplateRegistration } from "@/lib/templates/registry";

// template:new:imports
import { school_scrapbookRegistration } from "@/templates/school-scrapbook/registration";
import { daylight_proofRegistration } from "@/templates/daylight-proof/registration";
import { northern_lightRegistration } from "@/templates/northern-light/registration";

export const generatedUniversalTemplateRegistrations = [
  northern_lightRegistration,
  daylight_proofRegistration,
  school_scrapbookRegistration,
  // template:new:entries
] as const satisfies readonly UniversalTemplateRegistration[];

export const generatedUniversalTemplateIds = [
  "northern-light",
  "daylight-proof",
  "school-scrapbook",
  // template:new:ids
] as const;

export type GeneratedUniversalTemplateId = (typeof generatedUniversalTemplateIds)[number];
