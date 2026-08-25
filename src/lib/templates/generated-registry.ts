import type { UniversalTemplateRegistration } from "@/lib/templates/registry";

// template:new:imports
import { team_editorialRegistration } from "@/templates/team-editorial/registration";
import { kindergarten_doodlesRegistration } from "@/templates/kindergarten-doodles/registration";
import { school_classicRegistration } from "@/templates/school-classic/registration";
import { school_scrapbookRegistration } from "@/templates/school-scrapbook/registration";
import { daylight_proofRegistration } from "@/templates/daylight-proof/registration";
import { northern_lightRegistration } from "@/templates/northern-light/registration";

export const generatedUniversalTemplateRegistrations = [
  northern_lightRegistration,
  daylight_proofRegistration,
  school_scrapbookRegistration,
  school_classicRegistration,
  kindergarten_doodlesRegistration,
  team_editorialRegistration,
  // template:new:entries
] as const satisfies readonly UniversalTemplateRegistration[];

export const generatedUniversalTemplateIds = [
  "northern-light",
  "daylight-proof",
  "school-scrapbook",
  "school-classic",
  "kindergarten-doodles",
  "team-editorial",
  // template:new:ids
] as const;

export type GeneratedUniversalTemplateId = (typeof generatedUniversalTemplateIds)[number];
