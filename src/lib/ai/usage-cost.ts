export type AiTokenUsage = {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AiUsageCost = {
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputRub: number | null;
  outputRub: number | null;
  totalRub: number | null;
};

type ModelRates = {
  inputRubPerMillion: number;
  cachedInputRubPerMillion: number;
  outputRubPerMillion: number;
};

// RouterAI public rates as of 2026-07-23. An unknown model produces a null cost
// rather than a misleading estimate.
const knownRates: Record<string, ModelRates> = {
  "openai/gpt-5-mini": { inputRubPerMillion: 25, cachedInputRubPerMillion: 2.55, outputRubPerMillion: 204 },
  "openai/gpt-5": { inputRubPerMillion: 125, cachedInputRubPerMillion: 12, outputRubPerMillion: 1007 }
};

const roundRub = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

const getRates = (model: string): ModelRates | null => {
  const normalized = model.trim().toLowerCase();
  if (knownRates[normalized]) return knownRates[normalized];
  if (normalized.includes("gpt-5-mini")) return knownRates["openai/gpt-5-mini"];
  if (normalized.includes("gpt-5")) return knownRates["openai/gpt-5"];
  return null;
};

export const estimateAiUsageCost = (model: string, usage?: AiTokenUsage): AiUsageCost => {
  const inputTokens = Math.max(0, usage?.inputTokens ?? 0);
  const cachedInputTokens = Math.min(inputTokens, Math.max(0, usage?.cachedInputTokens ?? 0));
  const outputTokens = Math.max(0, usage?.outputTokens ?? 0);
  const totalTokens = Math.max(0, usage?.totalTokens ?? inputTokens + outputTokens);
  const rates = getRates(model);

  if (!rates) return { model, inputTokens, cachedInputTokens, outputTokens, totalTokens, inputRub: null, outputRub: null, totalRub: null };

  const inputRub = ((inputTokens - cachedInputTokens) * rates.inputRubPerMillion + cachedInputTokens * rates.cachedInputRubPerMillion) / 1_000_000;
  const outputRub = outputTokens * rates.outputRubPerMillion / 1_000_000;
  return { model, inputTokens, cachedInputTokens, outputTokens, totalTokens, inputRub: roundRub(inputRub), outputRub: roundRub(outputRub), totalRub: roundRub(inputRub + outputRub) };
};

export const sumAiUsageCosts = (...costs: AiUsageCost[]) => {
  if (costs.some((cost) => cost.totalRub === null)) return null;
  return roundRub(costs.reduce((total, cost) => total + (cost.totalRub ?? 0), 0));
};
