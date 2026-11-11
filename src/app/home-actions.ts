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
import { resolveTemplateTheme, templateRegistry } from "@/lib/templates/registry";
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
  source = "landing",
  templateTheme?: string
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
          ...(templateTheme ? { templateTheme } : {}),
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

const getInitialTemplateTheme = (templateId: CardTemplateId, formData?: FormData) => {
  const theme = formData?.get("templateTheme");
  return resolveTemplateTheme(templateRegistry.get(templateId), typeof theme === "string" ? theme : undefined)?.id;
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

  const templateTheme = templateId ? getInitialTemplateTheme(templateId, formData) : undefined;
  return startCardFromLanding(templateId, undefined, giftAnimationId, "demo_page", templateTheme);
}

export async function startCardFromTemplateAction(templateId: string, formData?: FormData) {
  if (!isProductTemplateId(templateId)) {
    throw new Error("Этот шаблон недоступен для создания открытки.");
  }
  const templateTheme = getInitialTemplateTheme(templateId, formData);
  return startCardFromLanding(templateId, undefined, undefined, "landing", templateTheme);
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

export async function startNewYearCardFromShowcaseAction(formData: FormData) {
  return startCardFromTemplateAction("new-year", formData);
}
