import { logger } from "@/lib/logger";
import { hasConfiguredEmailTransport, sendTransactionalEmail } from "@/lib/email/transport";

type AccessEmailInput = { email: string; accessUrl: string; idempotencyKey: string };

export const sendOrganizerAccessEmail = async ({ email, accessUrl, idempotencyKey }: AccessEmailInput) => {
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();
  const emailLogoUrl = `${new URL(accessUrl, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").origin}/brand/email-logo.png`;

  if (!hasConfiguredEmailTransport()) {
    if (process.env.NODE_ENV !== "production") {
      logger.info("organizer.magic_link_dev", "Organizer access link generated in development");
      return;
    }
    throw new Error("Email provider is not configured");
  }

  await sendTransactionalEmail({
    to: email,
    replyTo,
    idempotencyKey,
    subject: "Вход в ваши открытки — Slovesto",
    html: `<div style="font-family:Arial,sans-serif;color:#38261f;line-height:1.6"><img src="${emailLogoUrl}" width="180" alt="Slovesto" style="display:block;width:180px;height:auto;margin:0 0 20px"><h1 style="font-family:Georgia,serif">Ваши открытки</h1><p>Перейдите по ссылке, чтобы открыть список ваших открыток. Ссылка действует 15 минут и сработает один раз.</p><p><a href="${accessUrl}" style="display:inline-block;padding:13px 20px;background:#e9652f;color:white;text-decoration:none;border-radius:12px;font-weight:700">Открыть мои открытки</a></p><p style="color:#7b6253;font-size:13px">С теплом,<br>команда Slovesto<br>Место, где слова становятся подарком</p><p style="color:#7b6253;font-size:13px">Если вы не запрашивали вход, просто проигнорируйте это письмо.</p></div>`,
    text: `Откройте ваши открытки по ссылке: ${accessUrl}\n\nСсылка действует 15 минут и сработает один раз.`
  });
};
