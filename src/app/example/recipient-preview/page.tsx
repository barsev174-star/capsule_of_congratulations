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
import { resolveDemoTemplateId } from "../example-query";
import { getNewYearExample } from "../new-year-example";

export const metadata: Metadata = {
  title: "Предпросмотр открытки",
  robots: { index: false, follow: false }
};

type RecipientPreviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RecipientPreviewPage({ searchParams }: RecipientPreviewPageProps) {
  const { template } = await searchParams;
  const rawTemplate = Array.isArray(template) ? template[0] : template;
  const templateId = resolveDemoTemplateId(rawTemplate) ?? "paper-birthday";

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

  if (templateId === "new-year-red" || templateId === "new-year-green") {
    const { dispatch, model } = getNewYearExample(templateId);
    return (
      <>
        {previewDocumentStyles}
        <TemplateCardRenderer dispatch={dispatch} model={model} surface="private" actionContext="demo" />
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
