import { notFound } from "next/navigation";
import { TemplateStudio } from "./template-studio";
import { createTemplateStudioDraft } from "@/lib/templates/studio";
import { resolveTemplateTheme, studioTemplateRegistrations, templateRegistry } from "@/lib/templates/registry";

type TemplateStudioPageProps = {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ theme?: string }>;
};

const templateIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function TemplateStudioPage({ params, searchParams }: TemplateStudioPageProps) {
  if (process.env.NODE_ENV !== "development") notFound();

  const { templateId } = await params;
  if (!templateIdPattern.test(templateId)) notFound();
  const registration = templateRegistry.get(templateId);
  const theme = resolveTemplateTheme(registration, (await searchParams).theme);
  const profile = theme?.profile ?? (registration?.family === "universal-v1" ? registration.profile : templateId);
  const themeOptions = registration?.family === "universal-v1"
    ? registration.themes?.options.map(({ id, label }) => ({ id, label }))
    : undefined;

  const registeredTemplateOptions = studioTemplateRegistrations.map((entry) => ({
    id: entry.id,
    label: entry.catalog.name
  }));

  return <TemplateStudio
    key={`${templateId}:${theme?.id ?? ""}`}
    initialDraft={createTemplateStudioDraft(profile)}
    registeredTemplateOptions={registeredTemplateOptions}
    themeId={theme?.id}
    themeOptions={themeOptions}
  />;
}
