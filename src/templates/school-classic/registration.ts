import type { UniversalTemplateRegistration } from "@/lib/templates/registry";
import { school_classicProfile } from "./profile";

export const school_classicRegistration = {
  id: school_classicProfile.id,
  family: "universal-v1",
  profile: school_classicProfile,
  catalog: {
    name: "Школьный классический",
    description: "Классическая открытка для учителя с предметной школьной композицией, архивной бумагой и золотыми фотоуголками.",
    recommendedFor: ["teacher", "celebration"],
    accent: "#e9652f",
    availability: "studio"
  }
} satisfies UniversalTemplateRegistration;
