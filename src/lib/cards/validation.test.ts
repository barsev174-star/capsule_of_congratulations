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
        occasion: "personal",
        occasionText: "благодарим за выпускной год в садике",
        fromLabel: "От 5Б класса",
        organizerName: "Мария",
        organizerEmail: "maria@example.com",
        eventDate: "2026-09-01",
        description: "Хотим собрать теплую и красивую открытку от всей группы.",
        templateId: "warm-classic"
      })
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.recipientName).toBe("Анна");
      expect(result.data.occasionText).toBe("благодарим за выпускной год в садике");
      expect(result.data.templateId).toBe("warm-classic");
    }
  });

  it("returns issues when required fields are broken", () => {
    const result = validateCreateCardFormData(
      buildFormData({
        recipientName: "А",
        occasion: "unknown",
        occasionText: "",
        fromLabel: "",
        organizerName: "",
        organizerEmail: "mail",
        templateId: "missing"
      })
    );

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.issues.length).toBeGreaterThanOrEqual(5);
      expect(result.issues.some((issue) => issue.field === "occasionText")).toBe(true);
      expect(result.issues.some((issue) => issue.field === "organizerEmail")).toBe(true);
    }
  });

  it("keeps template unselected until the organizer chooses one", () => {
    const result = validateCreateCardFormData(
      buildFormData({
        recipientName: "Анна",
        occasion: "team",
        occasionText: "собираем открытку от команды продукта",
        fromLabel: "От команды",
        organizerName: "Игорь",
        organizerEmail: "igor@example.com",
        templateId: ""
      })
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.templateId).toBeNull();
    }
  });

  it("does not attach a studio-only template to a product card", () => {
    const result = validateCreateCardFormData(
      buildFormData({
        recipientName: "Анна",
        occasion: "personal",
        occasionText: "с днём рождения",
        fromLabel: "От друзей",
        organizerName: "Мария",
        organizerEmail: "maria@example.com",
        templateId: "northern-light"
      })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.templateId).toBeNull();
    }
  });

  it("accepts the school scrapbook template for a product card", () => {
    const result = validateCreateCardFormData(
      buildFormData({
        recipientName: "Анна",
        occasion: "teacher",
        occasionText: "с окончанием учебного года",
        fromLabel: "От 5Б класса",
        organizerName: "Мария",
        organizerEmail: "maria@example.com",
        templateId: "school-scrapbook"
      })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.templateId).toBe("school-scrapbook");
    }
  });
});
