import { afterEach, describe, expect, it, vi } from "vitest";
import { requestStructuredAi, resolveStructuredAiModel } from "@/lib/ai/structured-client";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("direct Yandex structured AI client", () => {
  it("sends a structured request directly to Yandex AI Studio", async () => {
    vi.stubEnv("YANDEX_CLOUD_API_KEY", "secret-yandex-key");
    vi.stubEnv("YANDEX_CLOUD_FOLDER_ID", "folder-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      model: "gpt://folder-123/yandexgpt/latest",
      choices: [{ message: { content: JSON.stringify({ text: "Готово" }) } }],
      usage: { prompt_tokens: 11, completion_tokens: 3, total_tokens: 14 }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await requestStructuredAi<{ text: string }>({
      transport: "yandex",
      model: resolveStructuredAiModel("yandex"),
      system: "Системная инструкция",
      user: "Черновик",
      schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
      schemaName: "greeting",
      maxCompletionTokens: 300,
      temperature: 0
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://ai.api.cloud.yandex.net/v1/chat/completions");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer secret-yandex-key",
      "Content-Type": "application/json"
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "gpt://folder-123/yandexgpt/latest",
      response_format: { type: "json_schema", json_schema: { name: "greeting", strict: true } },
      max_tokens: 300
    });
    expect(result).toMatchObject({ value: { text: "Готово" }, usage: { inputTokens: 11, outputTokens: 3, totalTokens: 14 } });
  });

  it("requires both the server-side API key and folder id", async () => {
    expect(() => resolveStructuredAiModel("yandex")).toThrow("folder ID");
    await expect(requestStructuredAi({
      transport: "yandex",
      model: "gpt://folder/yandexgpt/latest",
      system: "system",
      user: "user",
      schema: {},
      schemaName: "result",
      maxCompletionTokens: 100
    })).rejects.toThrow("API key");
  });

  it("does not expose response bodies or secrets in provider errors", async () => {
    vi.stubEnv("YANDEX_CLOUD_API_KEY", "must-not-leak");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("sensitive upstream details", { status: 403 }));

    let message = "";
    try {
      await requestStructuredAi({
        transport: "yandex",
        model: "gpt://folder/yandexgpt/latest",
        system: "system",
        user: "user",
        schema: {},
        schemaName: "result",
        maxCompletionTokens: 100
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("HTTP 403");
    expect(message).not.toContain("sensitive upstream details");
    expect(message).not.toContain("must-not-leak");
  });
});
