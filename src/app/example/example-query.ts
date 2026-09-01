import type { GiftAnimationId } from "@/lib/gift-animations";
import type { DemoTemplateId } from "./example-experience";

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
  "team-editorial": "team-editorial"
};

export const resolveDemoTemplateId = (value: string | undefined): DemoTemplateId | undefined =>
  value ? templateAliases[value] : undefined;

export const resolveDemoAnimationId = (value: string | undefined): GiftAnimationId | undefined =>
  value === "envelope" || value === "collect-messages" ? value : undefined;
