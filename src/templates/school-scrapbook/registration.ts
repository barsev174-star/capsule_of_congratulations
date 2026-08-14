import type { UniversalTemplateRegistration } from "@/lib/templates/registry";
import { school_scrapbookProfile } from "./profile";

export const school_scrapbookRegistration = {
  id: school_scrapbookProfile.id,
  family: "universal-v1",
  profile: school_scrapbookProfile,
  catalog: {
    name: "Школьный коллаж",
    description: "Тёплый бумажный коллаж для 1 сентября, школы, класса и дружеских воспоминаний.",
    recommendedFor: ["personal", "celebration", "teacher"],
    accent: "#1859bd",
    availability: "studio"
  }
} satisfies UniversalTemplateRegistration;
