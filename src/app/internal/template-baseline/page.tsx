import { notFound } from "next/navigation";
import { FinalCard } from "@/components/final-card/final-card";
import { TemplateCardRenderer } from "@/components/templates/template-card-renderer";
import {
  UniversalTemplateExportCard,
  universalExportFormats,
  type UniversalExportFormat
} from "@/components/templates/universal-v1/universal-export-card";
import {
  buildLegacyBaselineModel,
  isLegacyMessageScenario,
  isLegacyTemplateId
} from "@/lib/final-card/legacy-baseline";
import { dispatchTemplateRenderer } from "@/lib/templates/dispatcher";
import { resolveTemplateExportAsset } from "@/lib/templates/export-asset-url";
import { universalMessageScenarios, type UniversalMessageScenario } from "@/lib/templates/fixtures";
import {
  buildUniversalFixtureViewModel,
  universalScenarioPhotoCount
} from "@/lib/templates/view-model";

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
  const format = firstValue(params.format);

  if (surface !== "private" && surface !== "public") notFound();

  if (isLegacyTemplateId(template) && isLegacyMessageScenario(scenario)) {
    const model = buildLegacyBaselineModel(template, scenario);

    return (
      <main data-template-baseline={`${template}:${surface}:${scenario}`}>
        <FinalCard model={model} mode={surface === "public" ? "public" : "gift"} />
      </main>
    );
  }

  const dispatch = typeof template === "string" ? dispatchTemplateRenderer(template) : null;
  const universalScenario = typeof scenario === "string" && universalMessageScenarios.includes(scenario as UniversalMessageScenario)
    ? scenario as UniversalMessageScenario
    : null;
  if (!dispatch || dispatch.kind !== "universal-v1" || !universalScenario) notFound();

  const model = buildUniversalFixtureViewModel("full-card-default", {
    templateId: dispatch.registration.id,
    scenario: universalScenario,
    photoCount: universalScenarioPhotoCount[universalScenario]
  });

  if (format && format in universalExportFormats) {
    const exportFormat = format as UniversalExportFormat;
    const spec = universalExportFormats[exportFormat];
    return (
      <main
        data-template-baseline={`${template}:export:${exportFormat}`}
        data-template-export-baseline={exportFormat}
        style={{ width: spec.width, height: spec.height }}
      >
        <UniversalTemplateExportCard
          profile={dispatch.registration.profile}
          model={model}
          format={exportFormat}
          resolveAsset={resolveTemplateExportAsset}
        />
      </main>
    );
  }

  return (
    <main data-template-baseline={`${template}:${surface}:${scenario}`}>
      <TemplateCardRenderer dispatch={dispatch} model={model} surface={surface} />
    </main>
  );
}
