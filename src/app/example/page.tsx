import { FinalCard } from "@/components/final-card/final-card";
import type { Metadata } from "next";
import { exampleCardModel, routeAdventureDemoCardModel } from "@/lib/example-card";
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
  "route-adventure": "route-adventure"
};

type ExamplePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExamplePage({ searchParams }: ExamplePageProps) {
  const { template } = await searchParams;
  const rawTemplate = Array.isArray(template) ? template[0] : template;
  const initialTemplateId = rawTemplate ? templateAliases[rawTemplate] : undefined;

  return (
    <ExampleExperience initialTemplateId={initialTemplateId} routeChildren={<FinalCard model={routeAdventureDemoCardModel} />}>
      <FinalCard model={exampleCardModel} />
    </ExampleExperience>
  );
}
