import { FinalCard } from "@/components/final-card/final-card";
import { exampleCardModel } from "@/lib/example-card";
import { ExampleExperience } from "./example-experience";

export default function ExamplePage() {
  return (
    <ExampleExperience>
      <FinalCard model={exampleCardModel} />
    </ExampleExperience>
  );
}
