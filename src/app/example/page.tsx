import { FinalCard } from "@/components/final-card/final-card";
import type { Metadata } from "next";
import { exampleCardModel, routeAdventureDemoCardModel } from "@/lib/example-card";
import { ExampleExperience } from "./example-experience";

export const metadata: Metadata = {
  title: "Пример групповой онлайн-открытки",
  description: "Посмотрите, как поздравления и фотографии превращаются в тёплую групповую онлайн-открытку Slovesto.",
  alternates: { canonical: "/example" },
  openGraph: { url: "/example" }
};

export default function ExamplePage() {
  return (
    <ExampleExperience routeChildren={<FinalCard model={routeAdventureDemoCardModel} />}>
      <FinalCard model={exampleCardModel} />
    </ExampleExperience>
  );
}
