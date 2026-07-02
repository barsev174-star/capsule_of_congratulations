import { describe, expect, it } from "vitest";
import {
  buildMatrixPromptV2,
  buildMatrixPromptV3,
  buildMatrixPromptV4,
  parseOpenAiGreetingContent,
  parseOpenAiMatrixContent
} from "@/lib/ai/openai-provider";
import type { AiProviderInput } from "@/lib/ai/types";

describe("OpenAI greeting response", () => {
  const matrixInput: AiProviderInput = {
    recipientName: "Анна Ивановна",
    occasionText: "С выпускным!",
    relationshipContext: "сокурсница",
    draftNotes: "Спасибо за помощь. Желаю интересной работы.",
    style: "humor",
    messageLimit: 280,
    fromLabel: "от сокурсников",
    existingMessages: [],
    attempt: 0
  };

  it("keeps v2 and builds universal v3 context separately", () => {
    const v2 = buildMatrixPromptV2(matrixInput);
    const v3 = buildMatrixPromptV3(matrixInput);

    expect(v2.user).toContain("Получатель: Анна Ивановна");
    expect(v3.user).toContain("Исходное имя: Анна Ивановна");
    expect(v3.user).toContain("Обращение в поздравлении: Анна");
    expect(v3.user).toContain("Категория повода: graduation");
    expect(v3.user).toContain("Мягкое обобщение пожеланий: сохранить благодарность главным смыслом текста");
    expect(v3.user).not.toContain("Явные темы пожеланий:");
  });

  it("builds v4 without exposing fromLabel to the model", () => {
    const v4 = buildMatrixPromptV4(matrixInput);

    expect(v4.user).toContain("Безопасная выжимка пожеланий:");
    expect(v4.user).toContain("Безопасные направления пожеланий:");
    expect(v4.user).toContain("Темы пожеланий:");
    expect(v4.user).not.toContain("от сокурсников");
    expect(v4.user).not.toContain("От кого открытка:");
  });
  it("parses exactly three structured variants", () => {
    const variants = parseOpenAiGreetingContent(JSON.stringify({
      variants: [
        { type: "short", text: "Короткий вариант" },
        { type: "warm", text: "Душевный вариант" },
        { type: "style", text: "Вариант в выбранном стиле" }
      ]
    }));

    expect(variants).toEqual([
      { id: "short", label: "Короткий", text: "Короткий вариант" },
      { id: "warm", label: "Душевный", text: "Душевный вариант" },
      { id: "style", label: "Ваш стиль", text: "Вариант в выбранном стиле" }
    ]);
  });

  it("reports invalid JSON separately", () => {
    expect(() => parseOpenAiGreetingContent("not json")).toThrowError(
      expect.objectContaining({ code: "INVALID_JSON" })
    );
  });

  it("rejects incomplete structured output", () => {
    expect(() => parseOpenAiGreetingContent(JSON.stringify({
      variants: [{ type: "short", text: "Только один" }]
    }))).toThrowError(expect.objectContaining({ code: "INVALID_PROVIDER_RESPONSE" }));
  });

  it("parses only the variant requested during retry", () => {
    const variants = parseOpenAiGreetingContent(JSON.stringify({
      variants: [{ type: "style", text: "Новый вариант в выбранном стиле" }]
    }), ["style"]);

    expect(variants).toEqual([
      { id: "style", label: "Ваш стиль", text: "Новый вариант в выбранном стиле" }
    ]);
  });

  it("parses seven unique matrix variants", () => {
    const types = ["short", "warm", "warm-simple", "short-no-pathos", "humor", "touching", "respectful"];
    const variants = parseOpenAiMatrixContent(JSON.stringify({
      variants: types.map((type) => ({ type, label: type, text: `Текст ${type}` }))
    }));

    expect(variants).toHaveLength(7);
    expect(variants.map((variant) => variant.id)).toEqual(types);
  });

  it("rejects a matrix with duplicate types", () => {
    const types = ["short", "short", "warm-simple", "short-no-pathos", "humor", "touching", "respectful"];
    expect(() => parseOpenAiMatrixContent(JSON.stringify({
      variants: types.map((type) => ({ type, label: type, text: `Текст ${type}` }))
    }))).toThrowError(expect.objectContaining({ code: "INVALID_PROVIDER_RESPONSE" }));
  });
});
