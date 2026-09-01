"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createEmptyCardDraft } from "@/lib/cards/service";
import { getManagePath } from "@/lib/routes/card-links";
import { reportCriticalError, trackFunnel } from "@/lib/telemetry";
import { FIRST_TOUCH_COOKIE_NAME, parseLandingAttribution } from "@/lib/landing-attribution";
import { isProductTemplateId, type CardTemplateId } from "@/lib/cards/templates";
import { isGiftAnimationId, type GiftAnimationId } from "@/lib/gift-animations";

const startCardFromLanding = async (
  templateId: CardTemplateId | null = null,
  occasionText?: string,
  giftAnimationId?: GiftAnimationId,
  source = "landing"
) => {
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
  redirect(getManagePath(result.card.manageToken));
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
