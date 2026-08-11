import { describe, expect, it } from "vitest";
import {
  buildLegacyBaselineModel,
  buildLegacyExportBaselinePayload,
  getLegacyExportBaselineToken,
  getLegacyTemplateIdFromExportBaselineToken,
  legacyMessageScenarios,
  legacyTemplateIds
} from "@/lib/final-card/legacy-baseline";

describe("legacy template baseline fixtures", () => {
  it.each(legacyTemplateIds)("builds all six message scenarios for %s", (templateId) => {
    const models = legacyMessageScenarios.map((scenario) => buildLegacyBaselineModel(templateId, scenario));

    expect(models).toHaveLength(6);
    expect(models.map((model) => model.messageMediaAssets.length)).toEqual([0, 0, 0, 1, 2, 3]);
    expect(models.every((model) => model.style === templateId)).toBe(true);
    expect(models.every((model) => model.contributions.length > 0)).toBe(true);
  });

  it.each(legacyTemplateIds)("builds a database-free export payload for %s", (templateId) => {
    const token = getLegacyExportBaselineToken(templateId);
    const payload = buildLegacyExportBaselinePayload(templateId);

    expect(getLegacyTemplateIdFromExportBaselineToken(token)).toBe(templateId);
    expect(payload.card.templateId).toBe(templateId);
    expect(payload.photos).toHaveLength(3);
    expect(payload.qualities).toHaveLength(5);
    expect(payload.phrases).toHaveLength(3);
  });
});
