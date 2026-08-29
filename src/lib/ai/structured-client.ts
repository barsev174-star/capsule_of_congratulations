import { AiError } from "@/lib/ai/types";

export type StructuredAiTransport = "routerai" | "yandex";

export type StructuredAiUsage = {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type StructuredRequest = {
  transport: StructuredAiTransport;
  model: string;
  system: string;
  user: string;
  schema: object;
  schemaName: string;
  maxCompletionTokens: number;
  temperature?: number;
};

type StructuredPayload = {
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
  choices?: Array<{ message?: { content?: string } }>;
};

const getTransportConfig = (transport: StructuredAiTransport) => {
  if (transport === "yandex") {
    const apiKey = process.env.YANDEX_CLOUD_API_KEY?.trim();
    if (!apiKey) throw new AiError("PROVIDER_CONFIG", "Yandex Cloud API key is not configured.");
    return {
      apiKey,
      label: "Yandex AI Studio",
      baseUrl: (process.env.YANDEX_CLOUD_AI_BASE_URL ?? "https://ai.api.cloud.yandex.net/v1").replace(/\/$/, ""),
      timeout: Math.max(1_000, Number(process.env.YANDEX_CLOUD_AI_TIMEOUT_MS ?? 60_000) || 60_000)
    };
  }

  const apiKey = process.env.ROUTERAI_API_KEY?.trim();
  if (!apiKey) throw new AiError("PROVIDER_CONFIG", "RouterAI API key is not configured.");
  return {
    apiKey,
    label: "RouterAI",
    baseUrl: (process.env.ROUTERAI_BASE_URL ?? "https://routerai.ru/api/v1").replace(/\/$/, ""),
    timeout: Math.max(1_000, Number(process.env.ROUTERAI_TIMEOUT_MS ?? 60_000) || 60_000)
  };
};

export const resolveStructuredAiModel = (
  transport: StructuredAiTransport,
  configuredModel?: string
) => {
  const configured = configuredModel?.trim();
  if (transport === "routerai") return configured || "yandex/gpt-pro-5.1";
  if (configured?.startsWith("gpt://")) return configured;

  const folderId = process.env.YANDEX_CLOUD_FOLDER_ID?.trim();
  if (!folderId) {
    throw new AiError("PROVIDER_CONFIG", "Yandex Cloud folder ID is not configured.");
  }
  return `gpt://${folderId}/yandexgpt/latest`;
};

export const requestStructuredAi = async <T>({
  transport,
  model,
  system,
  user,
  schema,
  schemaName,
  maxCompletionTokens,
  temperature
}: StructuredRequest): Promise<{
  value: T;
  model: string;
  durationMs: number;
  usage?: StructuredAiUsage;
}> => {
  const config = getTransportConfig(transport);
  const startedAt = Date.now();
  let response: Response;

  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, strict: true, schema }
        },
        ...(temperature === undefined ? {} : { temperature }),
        max_tokens: maxCompletionTokens
      }),
      signal: AbortSignal.timeout(config.timeout)
    });
  } catch {
    throw new AiError("PROVIDER_UNAVAILABLE", `${config.label} generation is temporarily unavailable.`);
  }

  if (!response.ok) {
    throw new AiError("PROVIDER_UNAVAILABLE", `${config.label} returned HTTP ${response.status}.`);
  }

  let payload: StructuredPayload;
  try {
    payload = await response.json() as StructuredPayload;
  } catch {
    throw new AiError("INVALID_PROVIDER_RESPONSE", `${config.label} returned an unreadable response.`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new AiError("INVALID_PROVIDER_RESPONSE", `${config.label} returned an empty response.`);
  }

  let value: T;
  try {
    value = JSON.parse(content) as T;
  } catch {
    throw new AiError("INVALID_JSON", `${config.label} returned invalid JSON.`);
  }

  return {
    value,
    model: payload.model ?? model,
    durationMs: Date.now() - startedAt,
    usage: payload.usage ? {
      inputTokens: payload.usage.prompt_tokens,
      cachedInputTokens: payload.usage.prompt_tokens_details?.cached_tokens,
      outputTokens: payload.usage.completion_tokens,
      totalTokens: payload.usage.total_tokens
    } : undefined
  };
};
