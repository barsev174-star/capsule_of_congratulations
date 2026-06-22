import { validateContributionFormData, validateContributionMessage } from "@/lib/contributions/validation";

const buildFormData = (entries: Record<string, string>) => {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
};

describe("validateContributionFormData", () => {
  it("returns normalized contribution data when form is valid", () => {
    const result = validateContributionFormData(
      buildFormData({
        cardId: "card_123",
        authorName: "Ольга",
        authorRole: "родитель",
        message: "Спасибо вам за тепло, внимание и спокойствие, которое вы даете детям."
      }),
      { layoutMode: "carousel-1" }
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.authorName).toBe("Ольга");
      expect(result.data.authorRole).toBe("родитель");
    }
  });

  it("returns issues for invalid fields", () => {
    const result = validateContributionFormData(
      buildFormData({
        cardId: "",
        authorName: "А",
        authorRole: "x".repeat(81),
        message: "коротко"
      })
    );

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.issues.some((issue) => issue.field === "cardId")).toBe(true);
      expect(result.issues.some((issue) => issue.field === "message")).toBe(true);
    }
  });

  it("blocks messages with links", () => {
    const result = validateContributionFormData(
      buildFormData({
        cardId: "card_123",
        authorName: "Ольга",
        authorRole: "",
        message: "Посмотрите https://example.com и примите поздравление"
      })
    );

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.issues.some((issue) => issue.message.includes("Ссылки"))).toBe(true);
    }
  });

  it("allows messages over the current layout recommendation", () => {
    const result = validateContributionFormData(
      buildFormData({
        cardId: "card_123",
        authorName: "Ольга",
        authorRole: "родитель",
        message:
          "Спасибо вам за тепло, внимание и заботу. Мы очень ценим вашу поддержку, доброту, спокойствие и ту атмосферу, которую вы каждый день создаете вокруг детей. Пусть впереди будет много радости, здоровья, энергии, благодарности и красивых поводов для улыбки. Желаем вам всегда чувствовать себя любимой, нужной и окруженной вниманием близких людей."
      }),
      { layoutMode: "grid-2" }
    );

    expect(result.success).toBe(true);
  });

  it("reuses message rules for organizer editing", () => {
    const issues = validateContributionMessage("Поздравляю!");
    expect(issues.some((issue) => issue.field === "message")).toBe(true);
  });
});
