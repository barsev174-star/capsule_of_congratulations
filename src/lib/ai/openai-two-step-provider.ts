import type { GreetingContentPlan } from "@/lib/ai/greeting-two-step";
import type { LadderVariant, LadderVariantType } from "@/lib/ai/greeting-ladder-validation";
import { AiError } from "@/lib/ai/types";

const labels: Record<LadderVariantType, string> = {
  safe: "Аккуратно",
  warm: "Теплее",
  expressive: "Живее"
};

const variantsSchema = (types: LadderVariantType[]) => ({
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

const planSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    generalActions: { type: "array", items: { type: "string" } },
    personalEpisodes: { type: "array", items: { type: "string" } },
    wishes: { type: "array", items: { type: "string" } },
    derivedQualities: { type: "array", items: { type: "string" } },
    creativeRequest: { type: "string" },
    optionalContextDetails: { type: "array", items: { type: "string" } }
  },
  required: ["generalActions", "personalEpisodes", "wishes", "derivedQualities", "creativeRequest", "optionalContextDetails"]
};

const requestJson = async (input: { system: string; user: string; schema: object; name: string; maxCompletionTokens: number }) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new AiError("PROVIDER_CONFIG", "OpenAI API key is not configured.");
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
  const timeout = Math.max(1_000, Number(process.env.OPENAI_TIMEOUT_MS ?? 45_000) || 45_000);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: input.system }, { role: "user", content: input.user }],
        response_format: { type: "json_schema", json_schema: { name: input.name, strict: true, schema: input.schema } },
        reasoning_effort: "low",
        max_completion_tokens: input.maxCompletionTokens
      }),
      signal: AbortSignal.timeout(timeout)
    });
  } catch {
    throw new AiError("PROVIDER_UNAVAILABLE", "OpenAI two-step generation is temporarily unavailable.");
  }
  if (!response.ok) throw new AiError("PROVIDER_UNAVAILABLE", `OpenAI returned HTTP ${response.status}.`);

  const payload = await response.json() as { model?: unknown; usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; total_tokens?: unknown }; choices?: Array<{ message?: { content?: unknown } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new AiError("INVALID_PROVIDER_RESPONSE", "OpenAI returned an empty two-step response.");
  try {
    return {
      value: JSON.parse(content) as unknown,
      model: typeof payload.model === "string" ? payload.model : model,
      usage: payload.usage ? {
        inputTokens: typeof payload.usage.prompt_tokens === "number" ? payload.usage.prompt_tokens : undefined,
        outputTokens: typeof payload.usage.completion_tokens === "number" ? payload.usage.completion_tokens : undefined,
        totalTokens: typeof payload.usage.total_tokens === "number" ? payload.usage.total_tokens : undefined
      } : undefined
    };
  } catch {
    throw new AiError("INVALID_JSON", "OpenAI returned invalid two-step JSON.");
  }
};

export const generateGreetingContentPlanWithOpenAi = async (input: { system: string; user: string }) => {
  const result = await requestJson({ ...input, schema: planSchema, name: "greeting_content_plan", maxCompletionTokens: 900 });
  const value = result.value as Partial<GreetingContentPlan>;
  const fields: Array<keyof GreetingContentPlan> = ["generalActions", "personalEpisodes", "wishes", "derivedQualities", "creativeRequest", "optionalContextDetails"];
  if (fields.some((field) => field === "creativeRequest" ? typeof value[field] !== "string" : !Array.isArray(value[field]))) {
    throw new AiError("INVALID_PROVIDER_RESPONSE", "OpenAI returned an invalid greeting content plan.");
  }
  return { ...result, plan: value as GreetingContentPlan };
};

export const generateTwoStepVariantsWithOpenAi = async (
  input: { system: string; user: string },
  requestedTypes: LadderVariantType[] = ["safe", "warm", "expressive"]
) => {
  const result = await requestJson({ ...input, schema: variantsSchema(requestedTypes), name: "greeting_two_step_variants", maxCompletionTokens: 1800 });
  const source = result.value as { variants?: Array<{ type?: unknown; text?: unknown }> };
  if (!Array.isArray(source.variants) || source.variants.length !== requestedTypes.length) throw new AiError("INVALID_PROVIDER_RESPONSE", "OpenAI returned an invalid two-step variant set.");
  const variants = source.variants.map((variant): LadderVariant => {
    if (!requestedTypes.includes(variant.type as LadderVariantType) || typeof variant.text !== "string" || !variant.text.trim()) {
      throw new AiError("INVALID_PROVIDER_RESPONSE", "OpenAI returned an invalid two-step variant.");
    }
    const type = variant.type as LadderVariantType;
    return { type, label: labels[type], text: variant.text.trim() };
  });
  if (new Set(variants.map((variant) => variant.type)).size !== requestedTypes.length) throw new AiError("INVALID_PROVIDER_RESPONSE", "OpenAI returned duplicate two-step variants.");
  return { ...result, variants };
};
