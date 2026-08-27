import { isParticipantSafeEditInstruction, validateAiGenerationFormData } from "@/lib/ai/validation";

describe("participant AI edit policy", () => {
  it("разрешает только сокращение и исправление ошибок", () => {
    expect(isParticipantSafeEditInstruction("shorten")).toBe(true);
    expect(isParticipantSafeEditInstruction("proofread")).toBe(true);
    expect(isParticipantSafeEditInstruction("warmer")).toBe(false);
    expect(isParticipantSafeEditInstruction("detail")).toBe(false);
    expect(isParticipantSafeEditInstruction("alternative")).toBe(false);
  });
});

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
        publicSlug: "card-slug",
        recipientName: "Анна",
        occasionText: "благодарим за заботу о группе",
        draftNotes: "Хочу пожелать любви и радости. Ценю скромность и то, как легко с тобой рядом.",
        style: "warm-simple",
        messageLimit: "220"
      })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.draftNotes).toContain("Хочу пожелать");
      expect(result.data.publicSlug).toBe("card-slug");
    }
  });

  it("accepts a request id and rejects a malformed one", () => {
    const valid = validateAiGenerationFormData(buildFormData({
      requestId: "f9a3a1e4-6a2d-4e52-b1cf-8c7e61e12ec5",
      cardId: "card_1", publicSlug: "card-slug", draftNotes: "Спасибо за помощь и за ваши добрые слова в важный момент.", style: "warm-simple"
    }));
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.requestId).toBe("f9a3a1e4-6a2d-4e52-b1cf-8c7e61e12ec5");

    const invalid = validateAiGenerationFormData(buildFormData({
      requestId: "not-a-request-id", cardId: "card_1", publicSlug: "card-slug", draftNotes: "Спасибо за помощь и за ваши добрые слова в важный момент.", style: "warm-simple"
    }));
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.issues.some((issue) => issue.field === "requestId")).toBe(true);
  });

  it("returns issues when required AI inputs are missing", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "",
        publicSlug: "",
        recipientName: "",
        occasionText: "",
        draftNotes: "коротко",
        style: "none",
        messageLimit: "0"
      })
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("rejects technical instructions", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "card_1",
        publicSlug: "card-slug",
        draftNotes: "POST /api и access_token нужно отправить через backend endpoint",
        style: "touching"
      })
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((issue) => issue.field === "draftNotes")).toBe(true);
    }
  });

  it("accepts a draft up to 700 characters", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "card_1",
        publicSlug: "card-slug",
        draftNotes: "Тёплые личные мысли о человеке и добрые пожелания. ".repeat(12).slice(0, 700),
        style: "warm-simple"
      })
    );

    expect(result.success).toBe(true);
  });

  it("accepts a long existing greeting in shortening mode", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "card_1",
        manageToken: "manage-token",
        contributionId: "contribution-1",
        draftNotes: "Тёплое поздравление с личными пожеланиями и важными деталями. ".repeat(15),
        style: "short-no-pathos",
        mode: "shorten"
      })
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mode).toBe("shorten");
  });

  it("requires manager access and contribution id for shortening", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "card_1",
        publicSlug: "public-slug",
        draftNotes: "Достаточно длинное поздравление, которое нужно аккуратно сократить.",
        style: "short-no-pathos",
        mode: "shorten"
      })
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((issue) => issue.field === "contributionId")).toBe(true);
    }
  });

  it("accepts an existing greeting in improvement mode", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "card_1",
        manageToken: "manage-token",
        contributionId: "contribution-1",
        draftNotes: "Спасибо за поддержку и добрые слова. Желаю больше радостных дней.",
        style: "warm-simple",
        mode: "improve",
        editInstruction: "proofread"
      })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe("improve");
      expect(result.data.editInstruction).toBe("proofread");
    }
  });

  it("rejects an editing instruction for a new greeting", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "card_1",
        publicSlug: "card-slug",
        draftNotes: "Спасибо за поддержку и добрые слова в важный момент.",
        style: "warm-simple",
        editInstruction: "warmer"
      })
    );

    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.some((issue) => issue.field === "editInstruction")).toBe(true);
  });

  it("accepts a single initial result request for join", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "card_1",
        publicSlug: "card-slug",
        draftNotes: "Спасибо за поддержку и добрые слова в важный момент.",
        style: "touching",
        joinAction: "initial"
      })
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.joinAction).toBe("initial");
  });

  it("requires the current result for a join transformation", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "card_1",
        publicSlug: "card-slug",
        draftNotes: "Спасибо за поддержку и добрые слова в важный момент.",
        style: "touching",
        joinAction: "creative"
      })
    );

    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.some((issue) => issue.field === "sourceText")).toBe(true);
  });

  it("accepts a join transformation with the source result", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "card_1",
        publicSlug: "card-slug",
        draftNotes: "Спасибо за поддержку и добрые слова в важный момент.",
        sourceText: "Спасибо за поддержку. Желаю радостных дней.",
        style: "touching",
        joinAction: "warmer"
      })
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sourceText).toContain("Спасибо за поддержку");
  });

  it("accepts a required detail only for the initial join result", () => {
    const result = validateAiGenerationFormData(
      buildFormData({
        cardId: "card_1",
        publicSlug: "card-slug",
        draftNotes: "Спасибо за поддержку и добрые слова в важный момент.",
        requiredDetail: "Хочу видеться с ним чаще",
        style: "touching",
        joinAction: "initial"
      })
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.requiredDetail).toBe("Хочу видеться с ним чаще");
  });
});
