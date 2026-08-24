import { FinalCard } from "@/components/final-card/final-card";
import type { Metadata } from "next";
import { TemplateCardRenderer } from "@/components/templates/template-card-renderer";
import { exampleCardModel, routeAdventureDemoCardModel, schoolClassicDemoCardModel, schoolScrapbookDemoCardModel } from "@/lib/example-card";
import { requireTemplateRenderer } from "@/lib/templates/dispatcher";
import { ExampleExperience, type DemoTemplateId } from "./example-experience";

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
  "school-classic": "school-classic"
};

type ExamplePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExamplePage({ searchParams }: ExamplePageProps) {
  const { template } = await searchParams;
  const rawTemplate = Array.isArray(template) ? template[0] : template;
  const initialTemplateId = rawTemplate ? templateAliases[rawTemplate] : undefined;
  const schoolDispatch = requireTemplateRenderer("school-scrapbook");
  const schoolClassicDispatch = requireTemplateRenderer("school-classic");
  if (schoolDispatch.kind !== "universal-v1") {
    throw new Error("Шаблон school-scrapbook должен использовать универсальный рендерер.");
  }
  if (schoolClassicDispatch.kind !== "universal-v1") {
    throw new Error("Школьный классический шаблон должен использовать универсальный рендерер.");
  }

  return (
    <ExampleExperience
      initialTemplateId={initialTemplateId}
      routeChildren={<FinalCard model={routeAdventureDemoCardModel} />}
      schoolChildren={<TemplateCardRenderer dispatch={schoolDispatch} model={schoolScrapbookDemoCardModel} surface="private" />}
      schoolClassicChildren={<TemplateCardRenderer dispatch={schoolClassicDispatch} model={schoolClassicDemoCardModel} surface="private" />}
    >
      <FinalCard model={exampleCardModel} />
    </ExampleExperience>
  );
}
