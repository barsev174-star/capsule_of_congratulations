import { isGiftAnimationId, type GiftAnimationId } from "@/lib/gift-animations";
import type { DemoTemplateId } from "./example-experience";

export const newYearExampleThemes = {
  "new-year-red": "red",
  "new-year-green": "green"
} as const;

export type NewYearExampleId = keyof typeof newYearExampleThemes;

const templateAliases: Record<string, DemoTemplateId> = {
  paper: "paper-birthday",
  "paper-birthday": "paper-birthday",
  route: "route-adventure",
  "route-adventure": "route-adventure",
  school: "school-scrapbook",
  "school-scrapbook": "school-scrapbook",
  classic: "school-classic",
  "school-classic": "school-classic",
  kindergarten: "kindergarten-doodles",
  caregiver: "kindergarten-doodles",
  "kindergarten-doodles": "kindergarten-doodles",
  together: "team-editorial",
  team: "team-editorial",
  "team-editorial": "team-editorial",
  "new-year-red": "new-year-red",
  "new-year-green": "new-year-green"
};

export const resolveDemoTemplateId = (value: string | undefined, theme?: string): DemoTemplateId | undefined => {
  if (value === "new-year") return theme === "green" ? "new-year-green" : "new-year-red";
  return value && Object.hasOwn(templateAliases, value) ? templateAliases[value] : undefined;
};

export const resolveDemoAnimationId = (value: string | undefined): GiftAnimationId | undefined =>
  value && isGiftAnimationId(value) ? value : undefined;
