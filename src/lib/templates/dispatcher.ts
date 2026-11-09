import {
  templateRegistry,
  resolveTemplateTheme,
  type LegacyTemplateRegistration,
  type TemplateRegistry,
  type UniversalTemplateRegistration
} from "@/lib/templates/registry";
import type { FinalCardStyleId } from "@/lib/final-card/types";
import { getUniversalLayoutPreset } from "@/lib/templates/layout-presets";

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

export const dispatchCardTemplateRenderer = (templateId: string, theme?: string | null): TemplateRendererDispatch | null => {
  const dispatch = dispatchTemplateRenderer(templateId);
  if (dispatch?.kind !== "universal-v1") return dispatch;
  const resolved = resolveTemplateTheme(dispatch.registration, theme);
  return resolved
    ? { ...dispatch, registration: { ...dispatch.registration, profile: resolved.profile } }
    : dispatch;
};

export const getTemplateFinalCardStyleId = (
  dispatch: TemplateRendererDispatch
): FinalCardStyleId => dispatch.kind === "legacy"
  ? dispatch.registration.id
  : getUniversalLayoutPreset(dispatch.registration.profile.layoutPreset).referenceTemplateId;
