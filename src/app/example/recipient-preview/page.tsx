import type { Metadata } from "next";
import { FinalCard } from "@/components/final-card/final-card";
import { TemplateCardRenderer } from "@/components/templates/template-card-renderer";
import {
  exampleCardModel,
  kindergartenDoodlesDemoCardModel,
  routeAdventureDemoCardModel,
  schoolClassicDemoCardModel,
  schoolScrapbookDemoCardModel,
  teamEditorialDemoCardModel
} from "@/lib/example-card";
import { requireTemplateRenderer } from "@/lib/templates/dispatcher";

export const metadata: Metadata = {
  title: "Предпросмотр открытки",
  robots: { index: false, follow: false }
};

type PreviewTemplateId =
  | "paper-birthday"
  | "route-adventure"
  | "school-scrapbook"
  | "school-classic"
  | "kindergarten-doodles"
  | "team-editorial";

const templateIds = new Set<PreviewTemplateId>([
  "paper-birthday",
  "route-adventure",
  "school-scrapbook",
  "school-classic",
  "kindergarten-doodles",
  "team-editorial"
]);

type RecipientPreviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RecipientPreviewPage({ searchParams }: RecipientPreviewPageProps) {
  const { template } = await searchParams;
  const rawTemplate = Array.isArray(template) ? template[0] : template;
  const templateId: PreviewTemplateId = rawTemplate && templateIds.has(rawTemplate as PreviewTemplateId)
    ? rawTemplate as PreviewTemplateId
    : "paper-birthday";

  const previewDocumentStyles = (
    <style>{`
      html,
      body {
        overflow-x: hidden;
        scrollbar-width: none;
      }

      html::-webkit-scrollbar,
      body::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }

      nextjs-portal {
        display: none !important;
      }
    `}</style>
  );

  if (templateId === "paper-birthday") {
    return (
      <>
        {previewDocumentStyles}
        <FinalCard model={exampleCardModel} />
      </>
    );
  }

  if (templateId === "route-adventure") {
    return (
      <>
        {previewDocumentStyles}
        <FinalCard model={routeAdventureDemoCardModel} />
      </>
    );
  }

  const dispatch = requireTemplateRenderer(templateId);
  if (dispatch.kind !== "universal-v1") {
    throw new Error(`Шаблон ${templateId} должен использовать универсальный рендерер.`);
  }

  const model = templateId === "school-scrapbook"
    ? schoolScrapbookDemoCardModel
    : templateId === "school-classic"
      ? schoolClassicDemoCardModel
      : templateId === "kindergarten-doodles"
        ? kindergartenDoodlesDemoCardModel
        : teamEditorialDemoCardModel;

  return (
    <>
      {previewDocumentStyles}
      <TemplateCardRenderer
        dispatch={dispatch}
        model={model}
        surface="private"
        actionContext="demo"
      />
    </>
  );
}
