import { validateCreateCardFormData } from "@/lib/cards/validation";

const buildFormData = (entries: Record<string, string>) => {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
};

describe("validateCreateCardFormData", () => {
  it("returns normalized data when form is valid", () => {
    const result = validateCreateCardFormData(
      buildFormData({
        recipientName: "Анна",
        occasion: "teacher",
        fromLabel: "От 5Б класса",
        organizerName: "Мария",
        organizerEmail: "maria@example.com",
        eventDate: "2026-09-01",
        description: "Хотим собрать теплое поздравление ко Дню знаний.",
        templateId: "warm-classic"
      })
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.recipientName).toBe("Анна");
      expect(result.data.templateId).toBe("warm-classic");
    }
  });

  it("returns issues when required fields are broken", () => {
    const result = validateCreateCardFormData(
      buildFormData({
        recipientName: "А",
        occasion: "unknown",
        fromLabel: "",
        organizerName: "",
        organizerEmail: "mail",
        templateId: "missing"
      })
    );

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.issues.length).toBeGreaterThanOrEqual(4);
      expect(result.issues.some((issue) => issue.field === "organizerEmail")).toBe(true);
    }
  });

  it("falls back to default template for selected occasion", () => {
    const result = validateCreateCardFormData(
      buildFormData({
        recipientName: "Анна",
        occasion: "colleague",
        fromLabel: "От команды",
        organizerName: "Игорь",
        organizerEmail: "igor@example.com",
        templateId: ""
      })
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.templateId).toBe("team-modern");
    }
  });
});
