import { AiError } from "@/lib/ai/types";
import type { GreetingSemanticPlan, SemanticVariantType, SemanticVariants } from "@/lib/ai/greeting-semantic";

const planSchema = {
  type: "object", additionalProperties: false,
  properties: {
    authorVoice: { type: "string", enum: ["I", "WE", "NEUTRAL", "AMBIGUOUS"] }, addressForm: { type: "string", enum: ["TY", "VY", "NEUTRAL", "AMBIGUOUS"] }, recipientNumber: { type: "string", enum: ["ONE", "MANY", "AMBIGUOUS"] },
    coreFacts: { type: "array", maxItems: 6, items: { type: "string" } }, contextFacts: { type: "array", maxItems: 4, items: { type: "string" } }, appreciation: { type: "array", maxItems: 4, items: { type: "string" } }, wishes: { type: "array", maxItems: 5, items: { type: "string" } },
    derivedQualities: { type: "array", maxItems: 4, items: { type: "object", additionalProperties: false, properties: { quality: { type: "string" }, basedOnFactIndexes: { type: "array", items: { type: "integer" } } }, required: ["quality", "basedOnFactIndexes"] } },
    styleRequest: { type: "object", additionalProperties: false, properties: { humor: { type: "string", enum: ["REQUESTED", "NOT_REQUESTED"] }, notes: { type: "array", maxItems: 3, items: { type: "string" } } }, required: ["humor", "notes"] }, variantApproach: { type: "object", additionalProperties: false, properties: { safe: { type: "string" }, warm: { type: "string" }, expressive: { type: "string" } }, required: ["safe", "warm", "expressive"] }, ambiguities: { type: "array", maxItems: 3, items: { type: "string" } }
  }, required: ["authorVoice", "addressForm", "recipientNumber", "coreFacts", "contextFacts", "appreciation", "wishes", "derivedQualities", "styleRequest", "variantApproach", "ambiguities"]
};
const variantSchema = { type: "object", additionalProperties: false, properties: { text: { type: "string" } }, required: ["text"] };
const responseSchema = { type: "object", additionalProperties: false, properties: { plan: planSchema, variants: { type: "object", additionalProperties: false, properties: { safe: variantSchema, warm: variantSchema, expressive: variantSchema }, required: ["safe", "warm", "expressive"] } }, required: ["plan", "variants"] };

const request = async (system: string, user: string, schema: object, name: string) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim(); if (!apiKey) throw new AiError("PROVIDER_CONFIG", "OpenAI API key is not configured.");
  const startedAt = Date.now(); const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""); const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
  let response: Response; try { response = await fetch(`${baseUrl}/chat/completions`, { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }], response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }, reasoning_effort: "low", max_completion_tokens: 2200 }), signal: AbortSignal.timeout(Math.max(1000, Number(process.env.OPENAI_TIMEOUT_MS ?? 45000))) }); } catch { throw new AiError("PROVIDER_UNAVAILABLE", "OpenAI semantic generation is unavailable."); }
  if (!response.ok) throw new AiError("PROVIDER_UNAVAILABLE", `OpenAI returned HTTP ${response.status}.`);
  const payload = await response.json() as { model?: string; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }; choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content; if (!content) throw new AiError("INVALID_PROVIDER_RESPONSE", "OpenAI returned an empty semantic response.");
  try { return { value: JSON.parse(content), model: payload.model ?? model, durationMs: Date.now() - startedAt, usage: payload.usage ? { inputTokens: payload.usage.prompt_tokens, outputTokens: payload.usage.completion_tokens, totalTokens: payload.usage.total_tokens } : undefined }; } catch { throw new AiError("INVALID_JSON", "OpenAI returned invalid semantic JSON."); }
};
export const generateSemanticGreetingWithOpenAi = async (prompt: { system: string; user: string }) => { const result = await request(prompt.system, prompt.user, responseSchema, "semantic_greeting"); const value = result.value as { plan?: GreetingSemanticPlan; variants?: SemanticVariants }; if (!value.plan || !value.variants?.safe?.text || !value.variants.warm?.text || !value.variants.expressive?.text) throw new AiError("INVALID_PROVIDER_RESPONSE", "OpenAI returned an invalid semantic greeting."); return { ...result, plan: value.plan, variants: value.variants }; };
export const repairSemanticGreetingWithOpenAi = async (prompt: { system: string; user: string }, type: SemanticVariantType) => { const result = await request(prompt.system, prompt.user, variantSchema, `semantic_${type}_repair`); const value = result.value as { text?: string }; if (!value.text?.trim()) throw new AiError("INVALID_PROVIDER_RESPONSE", "OpenAI returned an invalid semantic repair."); return { ...result, text: value.text.trim() }; };
