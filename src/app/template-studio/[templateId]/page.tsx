import { notFound } from "next/navigation";
import { TemplateStudio } from "./template-studio";
import { createTemplateStudioDraft } from "@/lib/templates/studio";
import { studioTemplateRegistrations, templateRegistry } from "@/lib/templates/registry";

type TemplateStudioPageProps = {
  params: Promise<{ templateId: string }>;
};

const templateIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function TemplateStudioPage({ params }: TemplateStudioPageProps) {
  if (process.env.NODE_ENV !== "development") notFound();

  const { templateId } = await params;
  if (!templateIdPattern.test(templateId)) notFound();
  const registration = templateRegistry.get(templateId);
  const profile = registration?.family === "universal-v1" ? registration.profile : templateId;

  const registeredTemplateOptions = studioTemplateRegistrations.map((entry) => ({
    id: entry.id,
    label: entry.catalog.name
  }));

  return <TemplateStudio
    initialDraft={createTemplateStudioDraft(profile)}
    registeredTemplateOptions={registeredTemplateOptions}
  />;
}
