import type { LadderVariant, LadderVariantType } from "@/lib/ai/greeting-ladder-validation";
import { AiError } from "@/lib/ai/types";
import { logger } from "@/lib/logger";

export const OPENAI_LADDER_PROMPT_VERSION = "greeting-openai-ladder-v1";

const labels: Record<LadderVariantType, string> = {
  safe: "Аккуратно",
  warm: "Теплее",
  expressive: "Живее"
};

const responseSchema = (types: LadderVariantType[]) => ({
  type: "object",
  additionalProperties: false,
  properties: {
    variants: {
      type: "array",
      minItems: types.length,
      maxItems: types.length,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string", enum: types },
          text: { type: "string" }
        },
        required: ["type", "text"]
      }
    }
  },
  required: ["variants"]
});

export const generateLadderWithOpenAi = async (input: {
  system: string;
  user: string;
  requestedTypes: LadderVariantType[];
  attempt: number;
}) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new AiError("PROVIDER_CONFIG", "OpenAI API key is not configured.");
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
  const timeout = Math.max(1_000, Number(process.env.OPENAI_TIMEOUT_MS ?? 45_000) || 45_000);

  if (process.env.NODE_ENV !== "production") {
    logger.info("ai.openai_ladder_request", "Starting OpenAI ladder generation", {
      provider: "openai",
      model,
      promptVersion: OPENAI_LADDER_PROMPT_VERSION,
      attempt: input.attempt,
      requestedTypes: input.requestedTypes
    });
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "greeting_ladder",
            strict: true,
            schema: responseSchema(input.requestedTypes)
          }
        },
        reasoning_effort: "low",
        max_completion_tokens: 1800
      }),
      signal: AbortSignal.timeout(timeout)
    });
  } catch {
    throw new AiError("PROVIDER_UNAVAILABLE", "OpenAI ladder generation is temporarily unavailable.");
  }
  if (!response.ok) throw new AiError("PROVIDER_UNAVAILABLE", `OpenAI returned HTTP ${response.status}.`);

  let payload: {
    model?: unknown;
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown };
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  try {
    payload = await response.json() as typeof payload;
  } catch {
    throw new AiError("INVALID_PROVIDER_RESPONSE", "OpenAI returned an unreadable ladder response.");
  }
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new AiError("INVALID_PROVIDER_RESPONSE", "OpenAI returned an empty ladder response.");

  let parsed: { variants?: Array<{ type?: unknown; text?: unknown }> };
  try {
    parsed = JSON.parse(content) as typeof parsed;
  } catch {
    throw new AiError("INVALID_JSON", "OpenAI returned invalid ladder JSON.");
  }
  if (!Array.isArray(parsed.variants) || parsed.variants.length !== input.requestedTypes.length) {
    throw new AiError("INVALID_PROVIDER_RESPONSE", "OpenAI returned an unexpected number of ladder variants.");
  }

  const variants = parsed.variants.map((variant): LadderVariant => {
    if (!input.requestedTypes.includes(variant.type as LadderVariantType) || typeof variant.text !== "string" || !variant.text.trim()) {
      throw new AiError("INVALID_PROVIDER_RESPONSE", "OpenAI returned an invalid ladder variant.");
    }
    const type = variant.type as LadderVariantType;
    return { type, label: labels[type], text: variant.text.trim() };
  });
  if (new Set(variants.map((variant) => variant.type)).size !== variants.length) {
    throw new AiError("INVALID_PROVIDER_RESPONSE", "OpenAI returned duplicate ladder variants.");
  }

  const token = (value: unknown) => typeof value === "number" ? value : undefined;
  return {
    variants,
    model: typeof payload.model === "string" ? payload.model : model,
    usage: payload.usage ? {
      inputTokens: token(payload.usage.prompt_tokens),
      outputTokens: token(payload.usage.completion_tokens),
      totalTokens: token(payload.usage.total_tokens)
    } : undefined
  };
};
