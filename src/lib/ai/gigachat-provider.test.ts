import {
  buildGreetingPrompt,
  buildGreetingSystemPrompt,
  parseGreetingContent,
  parseModelJson,
  STYLE_PROFILES
} from "@/lib/ai/gigachat-provider";
import type { AiProviderInput, AiStyle } from "@/lib/ai/types";

const buildInput = (style: AiStyle): AiProviderInput => ({
  recipientName: "Анна",
  fromLabel: "от друзей",
  relationshipContext: "сокурсница",
  occasionText: "С выпускным!",
  draftNotes: "Спасибо за поддержку во время учёбы. Хочу пожелать интересной работы и больше отдыха.",
  style,
  messageLimit: 280,
  existingMessages: ["Поздравляю с выпускным и желаю удачи!"],
  mode: "compose",
  attempt: 0
});

describe("GigaChat greeting prompts", () => {
  it.each(Object.keys(STYLE_PROFILES) as AiStyle[])("includes the human-readable profile for %s", (style) => {
    const prompt = buildGreetingPrompt(buildInput(style));

    expect(prompt).toContain(`Выбранный стиль: ${STYLE_PROFILES[style].label}`);
    expect(prompt).toContain(STYLE_PROFILES[style].instruction);
    expect(prompt).toContain("Отношение автора к получателю: сокурсница");
  });

  it("gives short, warm and style variants separate instructions", () => {
    const prompt = buildGreetingPrompt(buildInput("humor"));

    expect(prompt).toContain("Вариант short / «Короткий»");
    expect(prompt).toContain("Вариант warm / «Душевный»");
    expect(prompt).toContain("Вариант style / «Ваш стиль»");
  });

  it("strengthens the system instruction only on retry", () => {
    expect(buildGreetingSystemPrompt(0)).not.toContain("Предыдущий ответ не подошёл");
    expect(buildGreetingSystemPrompt(1)).toContain(
      "Предыдущий ответ не подошёл: не используй официальный тон, не копируй черновик, не вставляй служебные фразы, верни только JSON"
    );
  });

  it("passes concrete validation feedback into a retry", () => {
    const prompt = buildGreetingSystemPrompt(1, ["short: сократи текст до 280 символов"]);

    expect(prompt).toContain("short: сократи текст до 280 символов");
  });

  it("repairs a missing comma between variant objects", () => {
    const parsed = parseModelJson(
      '{"variants":[{"type":"short","text":"Первый"}{"type":"warm","text":"Второй"}]}'
    ) as { variants: unknown[] };

    expect(parsed.variants).toHaveLength(2);
  });

  it("parses a valid JSON response with three variants", () => {
    const variants = parseGreetingContent(
      '{"variants":[{"type":"short","text":"Первый"},{"type":"warm","text":"Второй"},{"type":"style","text":"Третий"}]}'
    );

    expect(variants).toHaveLength(3);
  });

  it("reports INVALID_JSON for an unrecoverable response", () => {
    expect(() => parseModelJson('{"variants":[{"text":"оборвано"}'))
      .toThrow(expect.objectContaining({ code: "INVALID_JSON" }));
  });

  it("repairs the malformed variant separators returned by GigaChat Pro", () => {
    const variants = parseGreetingContent(
      '{"variants":[{"type":"short","text":"Первый текст" С выпускным!"}{],"type":"warm","text":"Второй текст"}{],"type":"style","text":"Третий текст"]}]'
    );

    expect(variants.map((variant) => variant.id)).toEqual(["short", "warm", "style"]);
    expect(variants[0].text).toBe("Первый текст С выпускным!");
  });
});
