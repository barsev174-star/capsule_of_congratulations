import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateBestQuotesWithRouterAi, generateQualitiesWithRouterAi } from "@/lib/ai/routerai-insights-provider";

const input = {
  recipientName: "Анна",
  occasionText: "С днём рождения!",
  contributions: [
    { id: "one", message: "Спасибо за поддержку и добрые слова." },
    { id: "two", message: "Твоё чувство юмора делает дни светлее." }
  ],
  attempt: 0
};

describe("RouterAI Yandex insights provider", () => {
  beforeEach(() => {
    process.env.ROUTERAI_API_KEY = "test-key";
    process.env.YANDEX_INSIGHTS_MODEL = "yandex/gpt-pro-5.1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests six candidate quotes with strict JSON schema", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: "yandex/gpt-pro-5.1",
      choices: [{ message: { content: JSON.stringify({ quotes: [
        { text: "Спасибо за поддержку и добрые слова.", sourceContributionId: "one" },
        { text: "Твоё чувство юмора делает дни светлее.", sourceContributionId: "two" },
        { text: "Спасибо за добрые слова.", sourceContributionId: "one" }
      ] }) } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBestQuotesWithRouterAi(input);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);

    expect(result.quotes).toHaveLength(3);
    expect(body.model).toBe("yandex/gpt-pro-5.1");
    expect(body.max_tokens).toBeGreaterThan(0);
    expect(body).not.toHaveProperty("max_completion_tokens");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.properties.quotes.minItems).toBe(6);
  });

  it("requests exactly five grounded qualities", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: "yandex/gpt-pro-5.1",
      choices: [{ message: { content: JSON.stringify({ qualities: [
        { text: "поддержка", sourceContributionId: "one" },
        { text: "доброта", sourceContributionId: "one" },
        { text: "чувство юмора", sourceContributionId: "two" },
        { text: "тепло", sourceContributionId: "two" },
        { text: "внимание", sourceContributionId: "one" }
      ] }) } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateQualitiesWithRouterAi(input);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);

    expect(result.qualities).toHaveLength(5);
    expect(body.response_format.json_schema.schema.properties.qualities.minItems).toBe(5);
  });
});
