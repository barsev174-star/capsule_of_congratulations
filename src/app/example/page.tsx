import { FinalCard } from "@/components/final-card/final-card";
import type { Metadata } from "next";
import { TemplateCardRenderer } from "@/components/templates/template-card-renderer";
import { exampleCardModel, kindergartenDoodlesDemoCardModel, routeAdventureDemoCardModel, schoolClassicDemoCardModel, schoolScrapbookDemoCardModel, teamEditorialDemoCardModel } from "@/lib/example-card";
import { requireTemplateRenderer } from "@/lib/templates/dispatcher";
import { ExampleExperience, type DemoTemplateId } from "./example-experience";
import { birthdayExampleCardModel } from "@/lib/birthday-example";
import { isBirthdayExample } from "@/lib/birthday-scenario";

export const metadata: Metadata = {
  title: "Пример групповой онлайн-открытки",
  description: "Посмотрите, как поздравления и фотографии превращаются в тёплую групповую онлайн-открытку Slovesto.",
  alternates: { canonical: "/example" },
  openGraph: { url: "/example" }
};

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

type ExamplePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExamplePage({ searchParams }: ExamplePageProps) {
  const { template, scenario } = await searchParams;
  const rawTemplate = Array.isArray(template) ? template[0] : template;
  const birthdayScenario = isBirthdayExample(rawTemplate, Array.isArray(scenario) ? scenario[0] : scenario);
  const initialTemplateId = rawTemplate ? templateAliases[rawTemplate] : undefined;
  const schoolDispatch = requireTemplateRenderer("school-scrapbook");
  const schoolClassicDispatch = requireTemplateRenderer("school-classic");
  const kindergartenDoodlesDispatch = requireTemplateRenderer("kindergarten-doodles");
  const teamEditorialDispatch = requireTemplateRenderer("team-editorial");
  if (schoolDispatch.kind !== "universal-v1") {
    throw new Error("Шаблон school-scrapbook должен использовать универсальный рендерер.");
  }
  if (schoolClassicDispatch.kind !== "universal-v1") {
    throw new Error("Школьный классический шаблон должен использовать универсальный рендерер.");
  }
  if (kindergartenDoodlesDispatch.kind !== "universal-v1") {
    throw new Error("Шаблон воспитателю должен использовать универсальный рендерер.");
  }
  if (teamEditorialDispatch.kind !== "universal-v1") {
    throw new Error("Шаблон «Вместе» должен использовать универсальный рендерер.");
  }

  return (
    <ExampleExperience
      birthdayScenario={birthdayScenario}
      initialTemplateId={initialTemplateId}
      routeChildren={<FinalCard model={routeAdventureDemoCardModel} />}
      schoolChildren={<TemplateCardRenderer dispatch={schoolDispatch} model={schoolScrapbookDemoCardModel} surface="private" />}
      schoolClassicChildren={<TemplateCardRenderer dispatch={schoolClassicDispatch} model={schoolClassicDemoCardModel} surface="private" />}
      kindergartenDoodlesChildren={<TemplateCardRenderer dispatch={kindergartenDoodlesDispatch} model={kindergartenDoodlesDemoCardModel} surface="private" />}
      teamEditorialChildren={<TemplateCardRenderer dispatch={teamEditorialDispatch} model={teamEditorialDemoCardModel} surface="private" />}
    >
      <FinalCard model={birthdayScenario ? birthdayExampleCardModel : exampleCardModel} creationScenario={birthdayScenario ? "birthday" : undefined} />
    </ExampleExperience>
  );
}
