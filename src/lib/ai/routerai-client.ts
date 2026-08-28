import { AiError } from "@/lib/ai/types";

export type RouterAiUsage = {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

type StructuredRequest = {
  model: string;
  system: string;
  user: string;
  schema: object;
  schemaName: string;
  maxCompletionTokens: number;
  temperature?: number;
};

type RouterAiPayload = {
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
  choices?: Array<{ message?: { content?: string } }>;
};

const getRouterAiConfig = () => {
  const apiKey = process.env.ROUTERAI_API_KEY?.trim();
  if (!apiKey) throw new AiError("PROVIDER_CONFIG", "RouterAI API key is not configured.");

  return {
    apiKey,
    baseUrl: (process.env.ROUTERAI_BASE_URL ?? "https://routerai.ru/api/v1").replace(/\/$/, ""),
    timeout: Math.max(1_000, Number(process.env.ROUTERAI_TIMEOUT_MS ?? 60_000) || 60_000)
  };
};

export const requestRouterAiStructured = async <T>({
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
  usage?: RouterAiUsage;
}> => {
  const config = getRouterAiConfig();
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
    throw new AiError("PROVIDER_UNAVAILABLE", "RouterAI generation is temporarily unavailable.");
  }

  if (!response.ok) {
    throw new AiError("PROVIDER_UNAVAILABLE", `RouterAI returned HTTP ${response.status}.`);
  }

  let payload: RouterAiPayload;
  try {
    payload = await response.json() as RouterAiPayload;
  } catch {
    throw new AiError("INVALID_PROVIDER_RESPONSE", "RouterAI returned an unreadable response.");
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new AiError("INVALID_PROVIDER_RESPONSE", "RouterAI returned an empty response.");
  }

  let value: T;
  try {
    value = JSON.parse(content) as T;
  } catch {
    throw new AiError("INVALID_JSON", "RouterAI returned invalid JSON.");
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
