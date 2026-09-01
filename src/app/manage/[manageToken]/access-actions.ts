"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  claimCardOrganizerEmail,
  getCardDraftByLegacyManageToken,
  getCardDraftByManagementId
} from "@/lib/cards/repository";
import { clearOrganizerSession, setOrganizerSession } from "@/lib/organizer/session";
import { requestOrganizerAccess } from "@/lib/organizer/service";
import { resolveCardRecoveryToken } from "@/lib/manage/recovery-tokens";
import { logger } from "@/lib/logger";
import {
  consumePublicRateLimit,
  getConfiguredRateLimit,
  getPublicClientKey
} from "@/lib/security/public-rate-limit";

export type ManageAccessFormState = {
  ok: boolean;
  message: string;
  devAccessUrl?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanManagePath = (cardId: string) => `/manage/${cardId}`;
const localHostPattern = /^(?:localhost|127\.0\.0\.1)(?::\d+)?$|^\[::1\](?::\d+)?$/i;

const isLocalDevelopmentRequest = async () => {
  if (process.env.NODE_ENV === "production") return false;
  const requestHeaders = await headers();
  return localHostPattern.test(requestHeaders.get("host")?.trim() ?? "");
};

export async function requestCardAccessAction(
  _previous: ManageAccessFormState,
  formData: FormData
): Promise<ManageAccessFormState> {
  const cardId = String(formData.get("cardId") ?? "");
  const recoveryToken = String(formData.get("recoveryToken") ?? "");
  const requestedEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  const card = await getCardDraftByManagementId(cardId);
  if (!card) return { ok: false, message: "Не удалось открыть эту ссылку." };

  const requestHeaders = await headers();
  const clientLimit = consumePublicRateLimit({
    scope: `manage-access:${card.id}`,
    clientKey: getPublicClientKey(requestHeaders),
    limit: getConfiguredRateLimit("MANAGE_ACCESS_RATE_LIMIT", 5),
    windowMs: 60 * 60 * 1000
  });
  if (!clientLimit.allowed) {
    logger.warn("manage.recovery_rate_limited", "Manage access request was rate limited", { cardId: card.id });
    return { ok: false, message: "Ссылку уже запрашивали несколько раз. Попробуйте через час." };
  }

  let email = card.organizerEmail.trim().toLowerCase();
  let claimCardId: string | undefined;
  if (!email) {
    const recoveryCardId = recoveryToken ? await resolveCardRecoveryToken(recoveryToken) : null;
    const recoveryCard = recoveryCardId
      ? await getCardDraftByManagementId(recoveryCardId)
      : recoveryToken
        ? await getCardDraftByLegacyManageToken(recoveryToken)
        : null;
    if (!recoveryCard || recoveryCard.id !== card.id || !emailPattern.test(requestedEmail)) {
      logger.warn("manage.recovery_denied", "Initial card ownership recovery was denied", { cardId: card.id });
      return { ok: false, message: "Не удалось подтвердить право на первичную настройку открытки." };
    }
    email = requestedEmail;
    claimCardId = card.id;
  }

  try {
    const result = await requestOrganizerAccess(email, {
      returnPath: cleanManagePath(card.id),
      claimCardId
    });
    if (result.limited) {
      return { ok: false, message: "Ссылку уже отправляли несколько раз. Попробуйте через час." };
    }
    logger.info("manage.recovery_started", "Passwordless manage access was requested", {
      cardId: card.id,
      initialClaim: Boolean(claimCardId)
    });
    return {
      ok: true,
      message: "Отправили безопасную ссылку для входа. Она действует 15 минут.",
      devAccessUrl: result.devAccessUrl
    };
  } catch {
    return { ok: false, message: "Не удалось отправить письмо. Попробуйте немного позже." };
  }
}

export async function switchOrganizerAccountAction(formData: FormData) {
  const cardId = String(formData.get("cardId") ?? "");
  await clearOrganizerSession();
  redirect(/^[-0-9a-f]{36}$/i.test(cardId) ? cleanManagePath(cardId) : "/account/login");
}

export async function localBypassCardAccessAction(formData: FormData) {
  if (!(await isLocalDevelopmentRequest())) {
    throw new Error("Local authentication bypass is unavailable");
  }

  const cardId = String(formData.get("cardId") ?? "");
  const recoveryToken = String(formData.get("recoveryToken") ?? "");
  const requestedEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  const card = await getCardDraftByManagementId(cardId);
  if (!card) throw new Error("Card not found");

  let email = card.organizerEmail.trim().toLowerCase();
  if (!email) {
    const recoveryCardId = recoveryToken ? await resolveCardRecoveryToken(recoveryToken) : null;
    const recoveryCard = recoveryCardId
      ? await getCardDraftByManagementId(recoveryCardId)
      : recoveryToken
        ? await getCardDraftByLegacyManageToken(recoveryToken)
        : null;
    if (!recoveryCard || recoveryCard.id !== card.id || !emailPattern.test(requestedEmail)) {
      throw new Error("Initial card ownership proof is required");
    }
    const claimed = await claimCardOrganizerEmail(card.id, requestedEmail);
    if (!claimed) throw new Error("Card owner could not be assigned");
    email = requestedEmail;
  }

  await setOrganizerSession(email);
  logger.info("manage.local_auth_bypass", "Local passwordless check was bypassed", { cardId: card.id });
  redirect(cleanManagePath(card.id));
}
