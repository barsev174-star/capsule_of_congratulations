import type { UniversalTemplateRegistration } from "@/lib/templates/registry";
import { northern_lightProfile } from "./profile";

export const northern_lightRegistration = {
  id: northern_lightProfile.id,
  family: "universal-v1",
  profile: northern_lightProfile,
  catalog: {
    name: "Северное сияние",
    description: "Светлая история о важных людях в сиянии холодного ночного неба.",
    recommendedFor: ["personal", "team", "celebration", "teacher", "caregiver", "colleague"],
    accent: "#6558e8",
    availability: "studio"
  }
} satisfies UniversalTemplateRegistration;
