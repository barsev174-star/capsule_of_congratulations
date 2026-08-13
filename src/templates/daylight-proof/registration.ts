import type { UniversalTemplateRegistration } from "@/lib/templates/registry";
import { daylight_proofProfile } from "./profile";

export const daylight_proofRegistration = {
  id: daylight_proofProfile.id,
  family: "universal-v1",
  profile: daylight_proofProfile,
  catalog: {
    name: "Дневной коллаж — тест",
    description: "Техническая проверка смены ассетов без индивидуальной геометрии.",
    recommendedFor: ["personal", "celebration"],
    accent: "#126f8f",
    availability: "studio"
  }
} satisfies UniversalTemplateRegistration;
