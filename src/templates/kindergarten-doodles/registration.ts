import type { UniversalTemplateRegistration } from "@/lib/templates/registry";
import { kindergarten_doodlesProfile } from "./profile";

export const kindergarten_doodlesRegistration = {
  id: kindergarten_doodlesProfile.id,
  family: "universal-v1",
  profile: kindergarten_doodlesProfile,
  catalog: {
    name: "Детство в рисунках",
    description: "Тёплая открытка воспитателю с детскими рисунками, мягкой акварелью и фотографиями группы.",
    recommendedFor: ["caregiver", "teacher"],
    accent: "#ef7665",
    availability: "studio"
  }
} satisfies UniversalTemplateRegistration;
