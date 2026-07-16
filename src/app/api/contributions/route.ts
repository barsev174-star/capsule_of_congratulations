import { NextResponse } from "next/server";
import { getCardDraftByPublicSlug } from "@/lib/cards/repository";
import { createContribution } from "@/lib/cards/service";
import { validateContributionFormData } from "@/lib/contributions/validation";
import { logger } from "@/lib/logger";
import { consumeAiGenerationDrafts } from "@/lib/ai/repository";
import { reportCriticalError } from "@/lib/telemetry";
import { ContributionLimitReachedError } from "@/lib/contributions/limits";
import { hashParticipantToken, isParticipantToken } from "@/lib/participants/token";
import { getCardLifecycleByPublicSlug } from "@/lib/cards/lifecycle-repository";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

export async function POST(request: Request) {
  const formData = await request.formData();
  const publicSlug = typeof request.headers.get("x-card-slug") === "string" ? request.headers.get("x-card-slug") : null;
  const cardId = typeof formData.get("cardId") === "string" ? String(formData.get("cardId")) : "";
  const card = publicSlug ? await getCardDraftByPublicSlug(publicSlug) : null;
  const lifecycle = publicSlug ? await getCardLifecycleByPublicSlug(publicSlug) : null;

  if (publicSlug && (!card || !lifecycle || card.id !== cardId || lifecycle.purgedAt !== null)) {
    return NextResponse.json(
      { ok: false, message: "Открытка не найдена или ссылка больше не актуальна." },
      { status: 404 }
    );
  }

  if (lifecycle && (lifecycle.collectionStatus !== "OPEN" || lifecycle.deliveryStatus !== "PREPARING")) {
    return NextResponse.json(
      { ok: false, message: "Сбор поздравлений для этой открытки уже закрыт организатором." },
      { status: 409 }
    );
  }
  if (formData.get("participantConsent") !== "on") {
    return NextResponse.json({ ok: false, issues: [{ field: "participantConsent", message: "Подтвердите согласие на обработку и показ поздравления." }] }, { status: 400 });
  }

  const validation = validateContributionFormData(formData, {
    layoutMode: card?.finalMessageSettings?.layoutMode ?? "grid-2"
  });

  if (!validation.success) {
    logger.warn("validation.contribution_failed", "Contribution validation failed", {
      issues: validation.issues
    });

    return NextResponse.json({ ok: false, issues: validation.issues }, { status: 400 });
  }

  try {
    const participantToken = formData.get("participantToken");
    const participantTokenHash = isParticipantToken(participantToken) ? hashParticipantToken(participantToken) : undefined;
    const contribution = await createContribution({
      ...validation.data,
      source: participantTokenHash ? "participant" : "manual",
      participantTokenHash,
      consentVersion: LEGAL_VERSIONS.participantConsent,
      consentAcceptedAt: new Date().toISOString()
    });
    const aiGenerationIds = typeof formData.get("aiGenerationIds") === "string"
      ? String(formData.get("aiGenerationIds")).split(",")
      : [];

    if (aiGenerationIds.length > 0) {
      try {
        await consumeAiGenerationDrafts(cardId, aiGenerationIds);
      } catch (error) {
        logger.error("ai.draft_cleanup_failed", "Failed to remove a submitted AI draft", {
          cardId,
          generationCount: aiGenerationIds.length,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    return NextResponse.json({ ok: true, contribution }, { status: 201 });
  } catch (error) {
    if (error instanceof ContributionLimitReachedError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 409 });
    }
    const errorId = await reportCriticalError("database", error, { operation: "create_contribution", cardId });

    return NextResponse.json(
      { ok: false, message: "Не удалось сохранить поздравление. Попробуйте еще раз.", errorId },
      { status: 500 }
    );
  }
}
