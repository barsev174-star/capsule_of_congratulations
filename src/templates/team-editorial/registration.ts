import type { UniversalTemplateRegistration } from "@/lib/templates/registry";
import { team_editorialProfile } from "./profile";

export const team_editorialRegistration = {
  id: team_editorialProfile.id,
  family: "universal-v1",
  profile: team_editorialProfile,
  catalog: {
    name: "Вместе",
    description: "Универсальная открытка с журнальной типографикой, тактильной бумагой и сдержанными предметными акцентами.",
    recommendedFor: ["personal", "team", "colleague", "celebration"],
    accent: "#2f6f70",
    availability: "studio"
  }
} satisfies UniversalTemplateRegistration;
