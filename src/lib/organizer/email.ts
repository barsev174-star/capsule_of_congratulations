import { logger } from "@/lib/logger";

type AccessEmailInput = { email: string; accessUrl: string; idempotencyKey: string };

export const sendOrganizerAccessEmail = async ({ email, accessUrl, idempotencyKey }: AccessEmailInput) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      logger.info("organizer.magic_link_dev", "Organizer access link generated in development");
      return;
    }
    throw new Error("Email provider is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      "User-Agent": "darislova/1.0"
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Вход в ваши открытки — Дари слова",
      html: `<div style="font-family:Arial,sans-serif;color:#38261f;line-height:1.6"><h1 style="font-family:Georgia,serif">Дари слова</h1><p>Перейдите по ссылке, чтобы открыть список ваших открыток. Ссылка действует 15 минут и сработает один раз.</p><p><a href="${accessUrl}" style="display:inline-block;padding:13px 20px;background:#e9652f;color:white;text-decoration:none;border-radius:12px;font-weight:700">Открыть мои открытки</a></p><p style="color:#7b6253;font-size:13px">Если вы не запрашивали вход, просто проигнорируйте это письмо.</p></div>`,
      text: `Откройте ваши открытки по ссылке: ${accessUrl}\n\nСсылка действует 15 минут и сработает один раз.`
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email provider returned ${response.status}: ${details.slice(0, 200)}`);
  }
};
