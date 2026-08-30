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

// RouterAI rates as of 2026-08-26 and direct Yandex AI Studio rates as of
// 2026-08-30. An unknown model produces a null cost rather than a misleading estimate.
const knownRates: Record<string, ModelRates> = {
  "openai/gpt-5-mini": { inputRubPerMillion: 27.4506375, cachedInputRubPerMillion: 2.74506375, outputRubPerMillion: 219.6051 },
  "openai/gpt-5": { inputRubPerMillion: 137.2531875, cachedInputRubPerMillion: 13.72531875, outputRubPerMillion: 1098.0255 },
  "yandex/gpt-pro-5.1": { inputRubPerMillion: 581.953515, cachedInputRubPerMillion: 581.953515, outputRubPerMillion: 581.953515 },
  "yandex-direct/gpt-pro-5.1": { inputRubPerMillion: 800, cachedInputRubPerMillion: 800, outputRubPerMillion: 800 },
  "yandex-direct/gpt-pro-5": { inputRubPerMillion: 1200, cachedInputRubPerMillion: 1200, outputRubPerMillion: 1200 },
  "yandex-direct/gpt-lite-5": { inputRubPerMillion: 200, cachedInputRubPerMillion: 200, outputRubPerMillion: 200 }
};

const roundRub = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

const getRates = (model: string): ModelRates | null => {
  const normalized = model.trim().toLowerCase();
  if (knownRates[normalized]) return knownRates[normalized];
  if (normalized.includes("/yandexgpt-5.1")) return knownRates["yandex-direct/gpt-pro-5.1"];
  if (normalized.includes("/yandexgpt-5-pro")) return knownRates["yandex-direct/gpt-pro-5"];
  if (normalized.includes("/yandexgpt-5-lite")) return knownRates["yandex-direct/gpt-lite-5"];
  if (normalized.includes("yandex") && normalized.includes("gpt-pro-5.1")) return knownRates["yandex/gpt-pro-5.1"];
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
