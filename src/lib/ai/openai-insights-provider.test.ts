import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateBestQuotesWithOpenAi, generateQualitiesWithOpenAi } from "@/lib/ai/openai-insights-provider";

const input = {
  recipientName: "Анна",
  occasionText: "С днём рождения!",
  contributions: [
    { id: "one", message: "Спасибо за поддержку и добрые слова." },
    { id: "two", message: "Твоё чувство юмора делает дни светлее." }
  ],
  attempt: 0
};

describe("OpenAI insights provider", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL = "gpt-5-mini";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests exactly three grounded quotes with strict JSON schema", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: "gpt-5-mini",
      choices: [{ message: { content: JSON.stringify({ quotes: [
        { text: "Спасибо за поддержку и добрые слова.", sourceContributionId: "one" },
        { text: "Твоё чувство юмора делает дни светлее.", sourceContributionId: "two" },
        { text: "Спасибо за добрые слова.", sourceContributionId: "one" }
      ] }) } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBestQuotesWithOpenAi(input);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);

    expect(result.quotes).toHaveLength(3);
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.properties.quotes.minItems).toBe(3);
  });

  it("requests exactly five grounded qualities", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: "gpt-5-mini",
      choices: [{ message: { content: JSON.stringify({ qualities: [
        { text: "поддержка", sourceContributionId: "one" },
        { text: "доброта", sourceContributionId: "one" },
        { text: "чувство юмора", sourceContributionId: "two" },
        { text: "тепло", sourceContributionId: "two" },
        { text: "внимание", sourceContributionId: "one" }
      ] }) } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateQualitiesWithOpenAi(input);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);

    expect(result.qualities).toHaveLength(5);
    expect(body.response_format.json_schema.schema.properties.qualities.minItems).toBe(5);
  });
});
