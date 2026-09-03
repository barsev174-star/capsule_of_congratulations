"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createEmptyCardDraft } from "@/lib/cards/service";
import { claimCardOrganizerEmail } from "@/lib/cards/repository";
import { getOrganizerSession } from "@/lib/organizer/session";
import { grantNewDraftAccess } from "@/lib/manage/draft-session";
import { getManagePath } from "@/lib/routes/card-links";
import { reportCriticalError, trackFunnel } from "@/lib/telemetry";
import { FIRST_TOUCH_COOKIE_NAME, parseLandingAttribution } from "@/lib/landing-attribution";
import { isProductTemplateId, type CardTemplateId } from "@/lib/cards/templates";
import { isGiftAnimationId, type GiftAnimationId } from "@/lib/gift-animations";
import {
  consumePublicRateLimit,
  getConfiguredRateLimit,
  getPublicClientKey
} from "@/lib/security/public-rate-limit";

const startCardFromLanding = async (
  templateId: CardTemplateId | null = null,
  occasionText?: string,
  giftAnimationId?: GiftAnimationId,
  source = "landing"
) => {
  const requestHeaders = await headers();
  const rateLimit = consumePublicRateLimit({
    scope: "card-create-action",
    clientKey: getPublicClientKey(requestHeaders),
    limit: getConfiguredRateLimit("PUBLIC_CARD_CREATE_RATE_LIMIT", 12),
    windowMs: 60 * 60 * 1000
  });
  if (!rateLimit.allowed) redirect("/manage/new?limited=1");
  const cookieStore = await cookies();
  const attribution = parseLandingAttribution(cookieStore.get(FIRST_TOUCH_COOKIE_NAME)?.value);
  const attributionContext = attribution ?? {};
  await trackFunnel("funnel.card_creation_started", {
    source,
    ...attributionContext,
    ...(templateId ? { templateId } : {}),
    ...(giftAnimationId ? { giftAnimationId } : {})
  });
  let result;
  try {
    result = templateId
      ? await createEmptyCardDraft(attributionContext, {
          templateId,
          ...(occasionText ? { occasionText } : {}),
          ...(giftAnimationId ? { giftAnimationId } : {})
        })
      : giftAnimationId
        ? await createEmptyCardDraft(attributionContext, { giftAnimationId })
        : await createEmptyCardDraft(attributionContext);
  } catch (error) {
    await reportCriticalError("database", error, {
      operation: "create_card",
      source,
      ...(templateId ? { templateId } : {}),
      ...(giftAnimationId ? { giftAnimationId } : {})
    });
    throw error;
  }
  const organizer = await getOrganizerSession();
  if (organizer) {
    if (!await claimCardOrganizerEmail(result.card.id, organizer.email)) throw new Error("Could not assign the new draft");
  } else {
    await grantNewDraftAccess(result.card.id);
  }
  redirect(getManagePath(result.card.id));
};

export async function startCardFromShowcaseAction() {
  return startCardFromLanding();
}

export async function startCardFromExampleSelectionAction(formData: FormData) {
  const rawTemplateId = formData.get("templateId");
  const rawGiftAnimationId = formData.get("giftAnimationId");
  const templateId = typeof rawTemplateId === "string" && isProductTemplateId(rawTemplateId)
    ? rawTemplateId
    : null;
  const giftAnimationId = typeof rawGiftAnimationId === "string" && isGiftAnimationId(rawGiftAnimationId)
    ? rawGiftAnimationId
    : undefined;

  return startCardFromLanding(templateId, undefined, giftAnimationId, "demo_page");
}

export async function startCardFromTemplateAction(templateId: string) {
  if (!isProductTemplateId(templateId)) {
    throw new Error("Этот шаблон недоступен для создания открытки.");
  }
  return startCardFromLanding(templateId);
}

export async function startTeacherCardFromShowcaseAction() {
  return startCardFromLanding("school-classic");
}

export async function startCaregiverCardFromShowcaseAction() {
  return startCardFromLanding("kindergarten-doodles");
}

export async function startColleagueCardFromShowcaseAction() {
  return startCardFromLanding("team-editorial");
}

export async function startBirthdayCardFromShowcaseAction() {
  return startCardFromLanding("paper-birthday", "С днём рождения!");
}
