import { NextResponse } from "next/server";
import { getCardDraftByPublicSlug } from "@/lib/cards/repository";
import { createContribution } from "@/lib/cards/service";
import { validateContributionFormData } from "@/lib/contributions/validation";
import { logger } from "@/lib/logger";
import { consumeAiGenerationDrafts } from "@/lib/ai/repository";
import { reportCriticalError } from "@/lib/telemetry";
import { ContributionLimitReachedError } from "@/lib/contributions/limits";
import { hashParticipantToken, isParticipantToken } from "@/lib/participants/token";

export async function POST(request: Request) {
  const formData = await request.formData();
  const publicSlug = typeof request.headers.get("x-card-slug") === "string" ? request.headers.get("x-card-slug") : null;
  const cardId = typeof formData.get("cardId") === "string" ? String(formData.get("cardId")) : "";
  const card = publicSlug ? await getCardDraftByPublicSlug(publicSlug) : null;

  if (publicSlug && (!card || card.id !== cardId)) {
    return NextResponse.json(
      { ok: false, message: "Открытка не найдена или ссылка больше не актуальна." },
      { status: 404 }
    );
  }

  if (card?.status === "closed") {
    return NextResponse.json(
      { ok: false, message: "Сбор поздравлений для этой открытки уже закрыт организатором." },
      { status: 403 }
    );
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
      participantTokenHash
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
