const apiKey = process.env.ROUTERAI_API_KEY?.trim();
if (!apiKey) throw new Error("ROUTERAI_API_KEY is not configured.");

const baseUrl = (process.env.ROUTERAI_BASE_URL ?? "https://routerai.ru/api/v1").replace(/\/$/, "");
const model = process.env.YANDEX_GREETING_COMPOSER_MODEL ?? "yandex/gpt-pro-5.1";
const timeout = Math.max(1_000, Number(process.env.ROUTERAI_TIMEOUT_MS ?? 60_000) || 60_000);

const response = await fetch(`${baseUrl}/chat/completions`, {
  method: "POST",
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model,
    messages: [{ role: "user", content: "Ответь одним словом: готово" }],
    temperature: 0,
    max_tokens: 20
  }),
  signal: AbortSignal.timeout(timeout)
});

const payload = await response.json().catch(() => null);
if (!response.ok) {
  throw new Error(`RouterAI returned HTTP ${response.status}: ${JSON.stringify(payload)?.slice(0, 300)}`);
}
if (typeof payload?.choices?.[0]?.message?.content !== "string") {
  throw new Error("RouterAI returned an invalid chat completion response.");
}

console.log(`RouterAI/Yandex connection check passed (${payload.model ?? model}).`);
