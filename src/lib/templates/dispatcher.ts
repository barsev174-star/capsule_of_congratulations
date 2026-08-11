import {
  templateRegistry,
  type LegacyTemplateRegistration,
  type TemplateRegistry,
  type UniversalTemplateRegistration
} from "@/lib/templates/registry";

export type TemplateRendererDispatch =
  | {
      kind: "legacy";
      registration: LegacyTemplateRegistration;
    }
  | {
      kind: "universal-v1";
      registration: UniversalTemplateRegistration;
    };

export const dispatchTemplateRenderer = (
  templateId: string,
  registry: TemplateRegistry = templateRegistry
): TemplateRendererDispatch | null => {
  const registration = registry.get(templateId);
  if (!registration) return null;

  return registration.family === "legacy"
    ? { kind: "legacy", registration }
    : { kind: "universal-v1", registration };
};

export const requireTemplateRenderer = (
  templateId: string,
  registry: TemplateRegistry = templateRegistry
): TemplateRendererDispatch => {
  const dispatch = dispatchTemplateRenderer(templateId, registry);
  if (!dispatch) {
    throw new Error(`Шаблон ${templateId} не зарегистрирован.`);
  }
  return dispatch;
};
