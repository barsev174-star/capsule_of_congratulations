import { notFound } from "next/navigation";
import { FinalCard } from "@/components/final-card/final-card";
import {
  buildLegacyBaselineModel,
  isLegacyMessageScenario,
  isLegacyTemplateId
} from "@/lib/final-card/legacy-baseline";

type BaselinePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const firstValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function TemplateBaselinePage({ searchParams }: BaselinePageProps) {
  if (process.env.NODE_ENV !== "development") notFound();

  const params = await searchParams;
  const template = firstValue(params.template);
  const scenario = firstValue(params.scenario);
  const surface = firstValue(params.surface);

  if (!isLegacyTemplateId(template) || !isLegacyMessageScenario(scenario)) notFound();
  if (surface !== "private" && surface !== "public") notFound();

  const model = buildLegacyBaselineModel(template, scenario);

  return (
    <main data-template-baseline={`${template}:${surface}:${scenario}`}>
      <FinalCard model={model} mode={surface === "public" ? "public" : "gift"} />
    </main>
  );
}
