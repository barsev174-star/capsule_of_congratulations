import { validateAiGenerationFormData } from "@/lib/ai/validation";

const buildFormData = (entries: Record<string, string>) => {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
};

describe("validateAiGenerationFormData", () => {
  it("accepts valid AI generation input", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "card_1",
        recipientName: "Анна",
        occasion: "teacher",
        relation: "родитель",
        qualities: "добрая",
        wishes: "здоровья",
        personalDetail: "Спасибо за спокойствие и поддержку детей.",
        style: "warm-simple"
      })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.qualities).toEqual(["добрая"]);
    }
  });

  it("returns issues when required AI inputs are missing", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "",
        recipientName: "",
        occasion: "wrong",
        relation: "",
        qualities: "",
        wishes: "",
        personalDetail: "ok",
        style: "none"
      })
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.length).toBeGreaterThanOrEqual(5);
    }
  });
});
