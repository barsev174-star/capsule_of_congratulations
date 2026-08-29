const required = (name) => {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required.`);
};

const assertHost = (name, fallback, expectedHost) => {
  const value = process.env[name]?.trim() || fallback;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL.`);
  }
  if (url.protocol !== "https:" || url.hostname !== expectedHost) {
    throw new Error(`${name} must point to https://${expectedHost}.`);
  }
};

if (process.env.PRODUCTION_PROVIDER_POLICY?.trim() !== "russian-only") {
  throw new Error("PRODUCTION_PROVIDER_POLICY must be russian-only before the provider switch.");
}

for (const name of ["AI_PROVIDER", "AI_GREETING_PROVIDER", "AI_INSIGHTS_PROVIDER"]) {
  if (process.env[name]?.trim() !== "yandex") throw new Error(`${name} must be yandex.`);
}
if (process.env.YANDEX_COMPOSER_PLANNING?.trim() !== "1") {
  throw new Error("YANDEX_COMPOSER_PLANNING must be 1 for fact-preserving production generation.");
}
if (process.env.EMAIL_PROVIDER?.trim() !== "postbox") throw new Error("EMAIL_PROVIDER must be postbox.");

for (const name of [
  "YANDEX_CLOUD_API_KEY",
  "YANDEX_CLOUD_FOLDER_ID",
  "YANDEX_POSTBOX_ACCESS_KEY_ID",
  "YANDEX_POSTBOX_SECRET_ACCESS_KEY",
  "EMAIL_FROM"
]) required(name);

for (const forbidden of ["OPENAI_API_KEY", "ROUTERAI_API_KEY", "GIGACHAT_AUTH_KEY", "RESEND_API_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_SUPPORT_CHAT_ID"]) {
  if (process.env[forbidden]?.trim()) throw new Error(`${forbidden} must be empty under russian-only policy.`);
}

assertHost("YANDEX_CLOUD_AI_BASE_URL", "https://ai.api.cloud.yandex.net/v1", "ai.api.cloud.yandex.net");
assertHost("YANDEX_POSTBOX_ENDPOINT", "https://postbox.cloud.yandex.net", "postbox.cloud.yandex.net");

console.log("Production provider policy check passed: direct Yandex AI Studio and Yandex Cloud Postbox.");
