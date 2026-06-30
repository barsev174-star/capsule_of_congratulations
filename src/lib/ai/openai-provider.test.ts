import { describe, expect, it } from "vitest";
import { parseOpenAiGreetingContent } from "@/lib/ai/openai-provider";

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
});
