import type { UniversalTemplateRegistration } from "@/lib/templates/registry";
import { new_yearProfile, newYearGreenProfile } from "./profile";

export const new_yearRegistration = {
  id: new_yearProfile.id,
  family: "universal-v1",
  profile: new_yearProfile,
  themes: {
    defaultId: "red",
    options: [
      { id: "red", label: "Красный + золото", profile: new_yearProfile },
      { id: "green", label: "Зелёный + золото", profile: newYearGreenProfile }
    ]
  },
  catalog: {
    name: "Новый год",
    description: new_yearProfile.metadata.description,
    recommendedFor: ["personal", "team", "celebration"],
    accent: "#e9652f",
    availability: "studio"
  }
} satisfies UniversalTemplateRegistration;
