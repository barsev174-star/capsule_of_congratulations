import type { UniversalTemplateRegistration } from "@/lib/templates/registry";
import { newYearThemeCatalog } from "./catalog";
import { new_yearProfile, newYearGreenProfile } from "./profile";

export const new_yearRegistration = {
  id: new_yearProfile.id,
  family: "universal-v1",
  profile: new_yearProfile,
  themes: {
    defaultId: "red",
    options: [
      { id: "red", label: "Красный + золото", profile: new_yearProfile, catalog: newYearThemeCatalog.red },
      { id: "green", label: "Зелёный + золото", profile: newYearGreenProfile, catalog: newYearThemeCatalog.green }
    ]
  },
  catalog: {
    name: "Новый год",
    description: new_yearProfile.metadata.description,
    recommendedFor: ["personal", "team", "celebration"],
    accent: "#e9652f",
    availability: "product"
  }
} satisfies UniversalTemplateRegistration;
