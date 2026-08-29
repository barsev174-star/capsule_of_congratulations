const apiKey = process.env.YANDEX_CLOUD_API_KEY?.trim();
const folderId = process.env.YANDEX_CLOUD_FOLDER_ID?.trim();
if (!apiKey) throw new Error("YANDEX_CLOUD_API_KEY is not configured.");
if (!folderId) throw new Error("YANDEX_CLOUD_FOLDER_ID is not configured.");

const baseUrl = (process.env.YANDEX_CLOUD_AI_BASE_URL ?? "https://ai.api.cloud.yandex.net/v1").replace(/\/$/, "");
const configuredModel = process.env.YANDEX_GREETING_COMPOSER_MODEL?.trim();
const model = configuredModel?.startsWith("gpt://") ? configuredModel : `gpt://${folderId}/yandexgpt/latest`;
const timeout = Math.max(1_000, Number(process.env.YANDEX_CLOUD_AI_TIMEOUT_MS ?? 60_000) || 60_000);

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

if (!response.ok) throw new Error(`Yandex AI Studio returned HTTP ${response.status}.`);
const payload = await response.json().catch(() => null);
if (typeof payload?.choices?.[0]?.message?.content !== "string") {
  throw new Error("Yandex AI Studio returned an invalid chat completion response.");
}

console.log(`Direct Yandex AI Studio connection check passed (${payload.model ?? model}).`);
