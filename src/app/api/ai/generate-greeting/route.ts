import { NextResponse } from "next/server";
import { generateParticipantMessage } from "@/lib/ai/service";
import { AiError } from "@/lib/ai/types";
import { validateAiGenerationRequest } from "@/lib/ai/validation";
import {
  getCardDraftByManageToken,
  getCardDraftByPublicSlug,
  listAllContributionsByCardId
} from "@/lib/cards/repository";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import { logger } from "@/lib/logger";
import { hasPaidAiEntitlement } from "@/lib/ai/repository";

const buildExistingMessageContext = (messages: string[]) => {
  const selected: string[] = [];
  let totalLength = 0;

  for (const message of messages.slice(-20).reverse()) {
    const normalized = message.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    if (totalLength + normalized.length > 6_000) break;
    selected.push(normalized);
    totalLength += normalized.length;
  }

  return selected;
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Не удалось прочитать запрос." }, { status: 400 });
  }

  const validation = validateAiGenerationRequest(body);
  if (!validation.success) {
    return NextResponse.json({ ok: false, issues: validation.issues }, { status: 400 });
  }

  const input = validation.data;
  const isManagerEdit = input.mode === "shorten" || input.mode === "improve";
  const card = isManagerEdit
    ? input.manageToken
      ? await getCardDraftByManageToken(input.manageToken)
      : null
    : input.publicSlug
      ? await getCardDraftByPublicSlug(input.publicSlug)
      : input.manageToken
        ? await getCardDraftByManageToken(input.manageToken)
        : null;

  if (!card || card.id !== input.cardId) {
    return NextResponse.json({ ok: false, message: "Открытка не найдена или ссылка больше не актуальна." }, { status: 404 });
  }

  if (!isManagerEdit && input.publicSlug && card.status === "closed") {
    return NextResponse.json({ ok: false, message: "Сбор поздравлений для этой открытки уже закрыт." }, { status: 403 });
  }

  const layoutProfile = getFinalCardMessageLayoutProfile(card.finalMessageSettings?.layoutMode ?? "grid-2");
  const contributions = await listAllContributionsByCardId(card.id);
  const sourceContribution = isManagerEdit
    ? contributions.find((item) => item.id === input.contributionId && item.status !== "deleted")
    : null;

  if (isManagerEdit && !sourceContribution) {
    return NextResponse.json({ ok: false, message: "Поздравление для AI-редактирования не найдено." }, { status: 404 });
  }

  const existingMessages = buildExistingMessageContext(
    contributions
      .filter((item) => item.status === "visible" && item.id !== sourceContribution?.id)
      .map((item) => item.message)
  );
  const messageLimit = sourceContribution?.id === card.finalMainGreetingSettings?.contributionId
    ? 500
    : layoutProfile.maxChars;

  try {
    const result = await generateParticipantMessage({
      cardId: card.id,
      recipientName: card.recipientName,
      fromLabel: card.fromLabel,
      relationshipContext: sourceContribution?.authorRole || input.relationshipContext,
      occasionText: card.occasionText,
      draftNotes: sourceContribution?.message ?? input.draftNotes,
      style: input.style,
      messageLimit,
      existingMessages,
      mode: input.mode
    });

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    if (error instanceof AiError && error.code === "LIMIT_REACHED") {
      const isPaid = await hasPaidAiEntitlement(card.id);
      const paidMessage = "AI-варианты закончились для этой открытки.";
      const freeMessage = "Бесплатные AI-варианты закончились. После оплаты лимит увеличится.";
      return NextResponse.json(
        { ok: false, code: error.code, message: isPaid ? paidMessage : freeMessage },
        { status: 429 }
      );
    }

    if (error instanceof AiError && error.code === "PROVIDER_CONFIG") {
      logger.error("ai.provider_config", "AI provider is not configured", { cardId: card.id });
      return NextResponse.json(
        { ok: false, code: error.code, message: "AI-помощник пока не настроен. Попробуйте немного позже." },
        { status: 503 }
      );
    }

    if (error instanceof AiError && error.code === "INVALID_PROVIDER_RESPONSE") {
      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          message: "Не получилось собрать хорошие варианты. Попробуйте добавить пару личных деталей или изменить стиль."
        },
        { status: 502 }
      );
    }

    if (error instanceof AiError && error.code === "INVALID_JSON") {
      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          message: "AI вернул ответ в неверном формате. Попробуйте ещё раз."
        },
        { status: 502 }
      );
    }

    if (error instanceof AiError && error.code === "AI_VALIDATION_FAILED") {
      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          message: "Не получилось собрать хорошие варианты. Попробуйте добавить пару деталей или выбрать другой стиль."
        },
        { status: 422 }
      );
    }

    logger.error("ai.participant_failed", "AI participant generation failed", {
      cardId: card.id,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return NextResponse.json(
      { ok: false, message: "Не удалось подготовить варианты текста. Попробуйте ещё раз." },
      { status: 503 }
    );
  }
}
