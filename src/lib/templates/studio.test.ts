import { describe, expect, it } from "vitest";
import {
  createTemplateStudioDraft,
  listTemplateProfileAssets,
  parseTemplateStudioImport,
  validateTemplateStudioDraft
} from "@/lib/templates/studio";
import { northern_lightProfile } from "@/templates/northern-light/profile";

describe("template studio draft", () => {
  it("создаёт валидный development-only профиль и геометрию", () => {
    const draft = createTemplateStudioDraft();

    expect(validateTemplateStudioDraft(draft)).toEqual({ ok: true, issues: [] });
    expect(listTemplateProfileAssets(draft.profile).length).toBeGreaterThan(10);
  });

  it("открывает зарегистрированный профиль как независимый черновик", () => {
    const draft = createTemplateStudioDraft(northern_lightProfile);

    expect(draft.profile).toEqual(northern_lightProfile);
    expect(draft.profile).not.toBe(northern_lightProfile);
    expect(validateTemplateStudioDraft(draft)).toEqual({ ok: true, issues: [] });
  });

  it("импортирует как полный черновик, так и отдельный профиль", () => {
    const draft = createTemplateStudioDraft();
    expect(parseTemplateStudioImport(JSON.stringify(draft), draft)).toEqual({ ok: true, draft });
    expect(parseTemplateStudioImport(JSON.stringify(draft.profile), draft)).toEqual({ ok: true, draft });
  });

  it("блокирует импорт геометрии за нормализованной границей", () => {
    const draft = createTemplateStudioDraft();
    draft.inspector.variants.desktop.safeArea.x = 0.9;

    const result = parseTemplateStudioImport(JSON.stringify(draft), createTemplateStudioDraft());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(expect.objectContaining({
        path: "inspector.variants.desktop.safeArea"
      }));
    }
  });
});
