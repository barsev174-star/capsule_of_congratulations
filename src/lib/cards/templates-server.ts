import { listTemplateOverrides } from "@/lib/admin/repository-phase2";
import { cardTemplates, type CardTemplate, type CardTemplateId } from "./templates";

export type { CardTemplate, CardTemplateId } from "./templates";

export const getCardTemplates = async (options?: { includeInactive?: boolean }): Promise<CardTemplate[]> => {
  const overrides = await listTemplateOverrides();
  const overrideById = new Map(overrides.map((override) => [override.id, override]));

  const merged = cardTemplates.map((template) => {
    const override = overrideById.get(template.id);

    if (!override) {
      return template;
    }

    return {
      ...template,
      name: override.name ?? template.name,
      description: override.description ?? template.description,
      accent: override.accent ?? template.accent,
      recommendedFor: override.recommendedFor ?? template.recommendedFor
    };
  });

  if (options?.includeInactive) {
    return merged;
  }

  return merged.filter((template) => {
    const override = overrideById.get(template.id);
    return override ? override.isActive : true;
  });
};

export const getCardTemplateById = async (
  id: string,
  options?: { includeInactive?: boolean }
): Promise<CardTemplate | undefined> =>
  (await getCardTemplates({ includeInactive: options?.includeInactive ?? true })).find(
    (template) => template.id === id
  );
