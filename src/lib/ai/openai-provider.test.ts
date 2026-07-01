import { describe, expect, it } from "vitest";
import { parseOpenAiGreetingContent, parseOpenAiMatrixContent } from "@/lib/ai/openai-provider";

describe("OpenAI greeting response", () => {
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
