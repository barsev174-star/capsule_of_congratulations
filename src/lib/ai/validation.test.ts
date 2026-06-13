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
        occasion: "personal",
        occasionText: "благодарим за заботу о группе",
        draftNotes: "Хочу пожелать любви и радости. Ценю скромность и то, как легко с тобой рядом.",
        style: "warm-simple"
      })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.draftNotes).toContain("Хочу пожелать");
      expect(result.data.occasionText).toBe("благодарим за заботу о группе");
    }
  });

  it("returns issues when required AI inputs are missing", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "",
        recipientName: "",
        occasion: "wrong",
        occasionText: "",
        draftNotes: "коротко",
        style: "none"
      })
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.length).toBeGreaterThanOrEqual(5);
    }
  });
});
