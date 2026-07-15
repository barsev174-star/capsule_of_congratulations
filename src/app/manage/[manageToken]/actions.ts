"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  deleteCardMediaAsset,
  getCardDraftById,
  getCardDraftByManageToken,
  listAllContributionsByCardId,
  listContributionsByCardId,
  listCardMediaAssetsByCardId,
  moveContribution,
  reorderContributions,
  swapCardMediaAssetSlots,
  updateCardDraftBasics,
  updateCardStatus,
  updateCardFinalPresentationSettings,
  updateCardMainGreetingSettings,
  updateCardMediaAssetCaption,
  updateContributionMessage,
  updateContributionStatus,
  upsertCardMediaAsset
} from "@/lib/cards/repository";
import { CARD_MEDIA_MAX_COUNT, validateCardMediaFile } from "@/lib/cards/media";
import { createContribution } from "@/lib/cards/service";
import { isTemplateId } from "@/lib/cards/templates";
import type { CardDraft, CardMediaAsset, CardMediaSlot } from "@/lib/cards/types";
import { validateContributionFormData, validateContributionMessage } from "@/lib/contributions/validation";
import { generateBestQuotes, generateQualities } from "@/lib/ai/service";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type {
  FinalCardBlockId,
  FinalCardBlockOrder,
  FinalCardBlockSettings,
  FinalCardMediaSlot,
  FinalCardMemorySettings,
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout,
  FinalCardMessageSettings,
  FinalCardOptionalBlockId
} from "@/lib/final-card/types";
import { logger } from "@/lib/logger";
import { saveCardMediaFile } from "@/lib/media/local-card-media-storage";
import { requestOrganizerAccess } from "@/lib/organizer/service";
import { getGiftPath, getJoinPath, getManagePath } from "@/lib/routes/card-links";
import { reportCriticalError } from "@/lib/telemetry";
import { ContributionLimitReachedError } from "@/lib/contributions/limits";
import {
  closeGiftPoll,
  createGiftPoll,
  deleteGiftPollOptionsExcept,
  getGiftPollForManage,
  openGiftPoll,
  saveGiftPollOption,
  selectGiftPollOption
} from "@/lib/gift-polls/repository";
import { GIFT_POLL_MAX_OPTIONS, GIFT_POLL_MIN_OPTIONS, isSafeProductUrl, normalizeBudgetAmount, normalizeGiftPollMode } from "@/lib/gift-polls/validation";

const optionalBlockIds: FinalCardOptionalBlockId[] = ["summary", "qualities", "memories", "quotes"];
const managedBlockIds: FinalCardBlockId[] = ["hero", "summary", "qualities", "messages", "memories", "quotes", "closing"];
const messageLayoutModes: FinalCardMessageLayoutMode[] = ["grid-2", "carousel-1", "carousel-2", "column-media"];
const mediaLayouts: FinalCardMessageMediaLayout[] = ["portrait", "landscape-pair", "landscape-trio"];
const mediaSlots: CardMediaSlot[] = ["portrait", "landscape-a", "landscape-b", "landscape-c", "memory-a", "memory-b", "memory-c"];
const finalMediaSlots: FinalCardMediaSlot[] = ["portrait", "landscape-a", "landscape-b", "landscape-c", "memory-a", "memory-b", "memory-c"];
const cardStatuses: CardDraft["status"][] = ["draft", "collecting", "ready", "closed"];

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validateLength = (value: string, min: number, max: number) => value.length >= min && value.length <= max;
const validateDate = (value: string) => value.length === 0 || !Number.isNaN(Date.parse(value));

type CardBasicsFields = {
  recipientName: string;
  fromLabel: string;
  occasionText: string;
  organizerName: string;
  organizerEmail: string;
  eventDate: string;
  description: string;
  signature: string;
};

export type CardBasicsFormState = {
  ok: boolean;
  message: string;
  fields?: CardBasicsFields;
};

export type GiftPollFormState = { ok: boolean; message: string };

const giftPollState = (ok: boolean, message: string): GiftPollFormState => ({ ok, message });

export async function saveGiftPollAction(_previous: GiftPollFormState, formData: FormData): Promise<GiftPollFormState> {
  const manageToken = String(formData.get("manageToken") ?? "");
  const card = await getCardDraftByManageToken(manageToken);
  if (!card) return giftPollState(false, "Секретная ссылка управления больше не актуальна.");

  const mode = normalizeGiftPollMode(formData.get("mode"));
  const existingPoll = await getGiftPollForManage(card.id);
  if (existingPoll && existingPoll.totalVotes > 0 && existingPoll.mode !== mode) {
    return giftPollState(false, "Нельзя сменить режим после первого голоса: так результаты останутся корректными.");
  }
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const question = String(formData.get("question") ?? "").trim().slice(0, 180);
  const closesAtValue = String(formData.get("closesAt") ?? "").trim();
  const closesAt = closesAtValue ? new Date(closesAtValue) : null;
  const optionTitles = formData.getAll("optionTitle").map((item) => String(item).trim());
  const optionDescriptions = formData.getAll("optionDescription").map((item) => String(item).trim());
  const optionPrices = formData.getAll("optionPrice").map((item) => String(item).trim());
  const optionUrls = formData.getAll("optionUrl").map((item) => String(item).trim());
  const optionImageUrls = formData.getAll("optionImageUrl").map((item) => String(item).trim());
  const optionIds = formData.getAll("optionId").map((item) => String(item));
  const fallbackOptions = optionTitles.map((optionTitle, index) => ({
    id: optionIds[index] || randomUUID(), title: optionTitle, description: optionDescriptions[index] || "",
    priceLabel: optionPrices[index] || "", productUrl: optionUrls[index] || "", imageUrl: optionImageUrls[index] || ""
  }));
  let submittedOptions = fallbackOptions;
  const optionsPayload = formData.get("optionsPayload");
  if (typeof optionsPayload === "string") {
    try {
      const parsed = JSON.parse(optionsPayload);
      if (Array.isArray(parsed)) {
        submittedOptions = parsed
          .filter((option): option is Record<string, unknown> => Boolean(option) && typeof option === "object")
          .map((option) => ({
            id: typeof option.id === "string" ? option.id : randomUUID(),
            title: typeof option.title === "string" ? option.title.trim() : "",
            description: typeof option.description === "string" ? option.description.trim() : "",
            priceLabel: typeof option.priceLabel === "string" ? option.priceLabel.trim() : "",
            productUrl: typeof option.productUrl === "string" ? option.productUrl.trim() : "",
            imageUrl: typeof option.imageUrl === "string" ? option.imageUrl.trim() : ""
          }));
      }
    } catch {
      // Fall back to regular form fields for clients that do not send the state snapshot.
    }
  }
  const options = submittedOptions.map((option, index) => ({
    id: option.id || randomUUID(),
    title: mode === "budget" ? normalizeBudgetAmount(option.title) : option.title,
    description: option.description || null,
    priceLabel: mode === "budget" ? null : option.priceLabel || null,
    productUrl: mode === "budget" ? null : option.productUrl || null,
    imageUrl: mode === "budget" ? null : option.imageUrl || null,
    index
  })).filter((option): option is { id: string; title: string; description: string | null; priceLabel: string | null; productUrl: string | null; imageUrl: string | null; index: number } => Boolean(option.title));

  if (!title || !question) return giftPollState(false, "Заполните заголовок и вопрос для участников.");
  if (options.length < GIFT_POLL_MIN_OPTIONS || options.length > GIFT_POLL_MAX_OPTIONS) {
    return giftPollState(false, `Добавьте от ${GIFT_POLL_MIN_OPTIONS} до ${GIFT_POLL_MAX_OPTIONS} вариантов.`);
  }
  if (options.some((option) => option.title.length > 60 || (option.description?.length ?? 0) > 140 || (option.priceLabel?.length ?? 0) > 30)) {
    return giftPollState(false, "Проверьте лимиты: название до 60, описание до 140, сумма до 30 символов.");
  }
  if (options.some((option) => (option.productUrl && !isSafeProductUrl(option.productUrl)) || (option.imageUrl && !isSafeProductUrl(option.imageUrl)))) {
    return giftPollState(false, "Ссылка на товар и изображение должны начинаться с https://.");
  }
  if (existingPoll && existingPoll.totalVotes > 0) {
    if (existingPoll.title !== title || existingPoll.question !== question) {
      return giftPollState(false, "После первого голоса нельзя менять заголовок и вопрос: участники должны голосовать при одинаковых условиях.");
    }
    if (options.some((option) => !existingPoll.options.some((savedOption) => savedOption.id === option.id))) {
      return giftPollState(false, "После начала голосования список вариантов зафиксирован: нельзя добавлять, менять или удалять варианты.");
    }
    const changedSavedOption = existingPoll.options.some((savedOption) => {
      const submittedOption = options.find((option) => option.id === savedOption.id);
      return !submittedOption
        || submittedOption.title !== savedOption.title
        || submittedOption.description !== savedOption.description
        || submittedOption.priceLabel !== savedOption.priceLabel
        || submittedOption.productUrl !== savedOption.productUrl
        || submittedOption.imageUrl !== savedOption.imageUrl;
    });
    if (changedSavedOption) return giftPollState(false, "После начала голосования список вариантов зафиксирован: нельзя добавлять, менять или удалять варианты.");
  }

  if (closesAtValue && (!closesAt || Number.isNaN(closesAt.getTime()))) return giftPollState(false, "Укажите корректную дату завершения или оставьте поле пустым.");

  const poll = await createGiftPoll({ cardId: card.id, mode, title, question, closesAt: closesAt?.toISOString() ?? null });
  await Promise.all(options.map((option) => saveGiftPollOption({
    id: option.id, pollId: poll.id, title: option.title, description: option.description,
    imageUrl: option.imageUrl, priceLabel: option.priceLabel, productUrl: option.productUrl, sortOrder: option.index
  })));
  await deleteGiftPollOptionsExcept(poll.id, options.map((option) => option.id));
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  return giftPollState(true, "Варианты сохранены. Откройте голосование, когда будете готовы.");
}

export async function openGiftPollAction(formData: FormData) {
  const manageToken = String(formData.get("manageToken") ?? "");
  const pollId = String(formData.get("pollId") ?? "");
  const card = await getCardDraftByManageToken(manageToken);
  if (!card || !pollId) return;
  await openGiftPoll(pollId);
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
}

export async function reopenGiftPollAction(formData: FormData) {
  await openGiftPollAction(formData);
}

export async function closeGiftPollAction(formData: FormData) {
  const manageToken = String(formData.get("manageToken") ?? "");
  const pollId = String(formData.get("pollId") ?? "");
  const card = await getCardDraftByManageToken(manageToken);
  if (!card || !pollId) return;
  await closeGiftPoll(pollId);
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
}

export async function selectGiftPollOptionAction(formData: FormData) {
  const manageToken = String(formData.get("manageToken") ?? "");
  const pollId = String(formData.get("pollId") ?? "");
  const optionId = String(formData.get("optionId") ?? "");
  const card = await getCardDraftByManageToken(manageToken);
  if (!card || !pollId || !optionId) return;
  await selectGiftPollOption(pollId, optionId);
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
}

const getCardBasicsFields = (formData: FormData): CardBasicsFields => ({
  recipientName: String(formData.get("recipientName") ?? "").trim(),
  fromLabel: String(formData.get("fromLabel") ?? "").trim(),
  occasionText: String(formData.get("occasionText") ?? "").trim(),
  organizerName: String(formData.get("organizerName") ?? "").trim(),
  organizerEmail: String(formData.get("organizerEmail") ?? "").trim(),
  eventDate: String(formData.get("eventDate") ?? "").trim(),
  description: String(formData.get("description") ?? "").trim(),
  signature: String(formData.get("signature") ?? "").trim()
});

const cardBasicsError = (message: string, fields?: CardBasicsFields): CardBasicsFormState => ({
  ok: false,
  message,
  fields
});

const revalidateCardSurfaces = (manageToken: string, publicSlug: string, finalSlug: string) => {
  revalidatePath(getManagePath(manageToken));
  revalidatePath(getJoinPath(publicSlug));
  revalidatePath(getGiftPath(finalSlug));
  revalidatePath(`${getGiftPath(finalSlug)}/messages`);
};

export async function setContributionStatusAction(formData: FormData) {
  const contributionId = String(formData.get("contributionId") ?? "");
  const manageToken = String(formData.get("manageToken") ?? "");
  const status = String(formData.get("status") ?? "") as "visible" | "hidden" | "deleted";

  if (!contributionId || !manageToken || !status) {
    return;
  }

  const updated = await updateContributionStatus(contributionId, status);
  if (!updated) {
    return;
  }

  const card = await getCardDraftById(updated.cardId);

  logger.info("manage.contribution_status_updated", "Contribution status updated by organizer", {
    contributionId,
    status
  });

  if (card) {
    if (status === "hidden") {
      const siblings = await listAllContributionsByCardId(card.id);
      const nextOrder = siblings
        .map((contribution) => contribution.id)
        .filter((id) => id !== contributionId);

      nextOrder.push(contributionId);
      await reorderContributions(card.id, nextOrder);
    }

    if (status === "visible") {
      const siblings = await listAllContributionsByCardId(card.id);
      const nextOrder = siblings
        .map((contribution) => contribution.id)
        .filter((id) => id !== contributionId);
      const firstHiddenIndex = nextOrder.findIndex((id) => {
        const contribution = siblings.find((item) => item.id === id);
        return contribution?.status === "hidden";
      });

      if (firstHiddenIndex === -1) {
        nextOrder.push(contributionId);
      } else {
        nextOrder.splice(firstHiddenIndex, 0, contributionId);
      }

      await reorderContributions(card.id, nextOrder);
    }

    revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  } else {
    revalidatePath(getManagePath(manageToken));
  }
}

export async function addManualContributionAction(
  _prevState: { ok: boolean; message: string },
  formData: FormData
) {
  const manageToken = String(formData.get("manageToken") ?? "");

  if (!manageToken) {
    return { ok: false, message: "Не удалось определить страницу управления." };
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) {
    return { ok: false, message: "Секретная ссылка управления больше не актуальна." };
  }

  const contributionFormData = new FormData();
  contributionFormData.set("cardId", card.id);
  contributionFormData.set("authorName", String(formData.get("authorName") ?? ""));
  contributionFormData.set("authorRole", String(formData.get("authorRole") ?? ""));
  contributionFormData.set("message", String(formData.get("message") ?? ""));

  const validation = validateContributionFormData(contributionFormData, {
    layoutMode: card.finalMessageSettings?.layoutMode ?? "grid-2"
  });

  if (!validation.success) {
    return {
      ok: false,
      message: validation.issues.map((issue) => issue.message).join(" ")
    };
  }

  let contribution;
  try {
    contribution = await createContribution(validation.data);
  } catch (error) {
    if (error instanceof ContributionLimitReachedError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
  const siblings = await listAllContributionsByCardId(card.id);
  const nextOrder = siblings
    .map((item) => item.id)
    .filter((id) => id !== contribution.id);
  const firstHiddenIndex = nextOrder.findIndex((id) => {
    const item = siblings.find((sibling) => sibling.id === id);
    return item?.status === "hidden";
  });

  if (firstHiddenIndex === -1) {
    nextOrder.push(contribution.id);
  } else {
    nextOrder.splice(firstHiddenIndex, 0, contribution.id);
  }

  await reorderContributions(card.id, nextOrder);

  logger.info("manage.manual_contribution_created", "Manual contribution created by organizer", {
    cardId: card.id,
    contributionId: contribution.id
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);

  return { ok: true, message: "Поздравление добавлено вручную." };
}

export async function deleteContributionAction(formData: FormData) {
  const contributionId = String(formData.get("contributionId") ?? "");
  const manageToken = String(formData.get("manageToken") ?? "");

  if (!contributionId || !manageToken) {
    return;
  }

  const updated = await updateContributionStatus(contributionId, "deleted");
  if (!updated) {
    return;
  }

  const card = await getCardDraftById(updated.cardId);

  logger.info("manage.contribution_deleted", "Contribution deleted by organizer", {
    contributionId
  });

  if (card) {
    revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  } else {
    revalidatePath(getManagePath(manageToken));
  }
}

export async function updateCardBasicsAction(
  _prevState: CardBasicsFormState,
  formData: FormData
): Promise<CardBasicsFormState> {
  const manageToken = String(formData.get("manageToken") ?? "");
  const fields = getCardBasicsFields(formData);

  if (!manageToken) {
    return cardBasicsError("Не удалось сохранить основу открытки.", fields);
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) {
    return cardBasicsError("Секретная ссылка управления больше не актуальна.", fields);
  }

  const occasionValue = (String(formData.get("occasion") ?? "").trim() || card.occasion) as CardDraft["occasion"];

  if (!validateLength(fields.recipientName, 2, 80)) {
    return cardBasicsError("Укажите имя получателя длиной от 2 до 80 символов.", fields);
  }

  if (!validateLength(fields.fromLabel, 2, 80)) {
    return cardBasicsError("Укажите, от кого открытка, длиной от 2 до 80 символов.", fields);
  }

  if (!validateLength(fields.occasionText, 2, 40)) {
    return cardBasicsError("Укажите короткую надпись события: от 2 до 40 символов.", fields);
  }

  if (!validateLength(fields.organizerName, 2, 80)) {
    return cardBasicsError("Укажите имя организатора длиной от 2 до 80 символов.", fields);
  }

  if (!isValidEmail(fields.organizerEmail) || fields.organizerEmail.length > 254) {
    return cardBasicsError("Введите корректный email организатора.", fields);
  }

  if (!validateDate(fields.eventDate)) {
    return cardBasicsError("Дата события выглядит некорректно.", fields);
  }

  if (fields.description && !validateLength(fields.description, 10, 300)) {
    return cardBasicsError("Описание должно быть от 10 до 300 символов.", fields);
  }

  if (fields.signature && !validateLength(fields.signature, 2, 120)) {
    return cardBasicsError("Подпись должна быть от 2 до 120 символов.", fields);
  }

  const updated = await updateCardDraftBasics(card.id, {
    recipientName: fields.recipientName,
    fromLabel: fields.fromLabel,
    occasion: occasionValue,
    occasionText: fields.occasionText,
    organizerName: fields.organizerName,
    organizerEmail: fields.organizerEmail,
    eventDate: fields.eventDate || null,
    description: fields.description || null,
    signature: fields.signature || null
  });

  if (!updated) {
    return cardBasicsError("Не удалось обновить основу открытки.", fields);
  }

  logger.info("manage.card_basics_updated", "Card basics updated by organizer", {
    cardId: card.id,
    occasion: occasionValue
  });

  const organizerEmailChanged = fields.organizerEmail.toLowerCase() !== card.organizerEmail.toLowerCase();
  let accessEmailSent = false;

  if (organizerEmailChanged && isValidEmail(fields.organizerEmail)) {
    try {
      const access = await requestOrganizerAccess(fields.organizerEmail);
      accessEmailSent = !access.limited;
    } catch (error) {
      logger.warn("organizer.access_email_failed", "Organizer access email was not sent after email update", {
        cardId: card.id,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);

  const message = organizerEmailChanged && accessEmailSent
    ? `Изменения сохранены. Мы отправили письмо со ссылкой для входа на ${fields.organizerEmail}.`
    : organizerEmailChanged
      ? "Изменения сохранены, но письмо со ссылкой отправить не удалось. Попробуйте отправить его ещё раз."
      : "Изменения сохранены.";

  return { ok: true, message, fields };
}

export async function resendOrganizerAccessAction(
  manageToken: string
): Promise<{ ok: boolean; message: string }> {
  const card = await getCardDraftByManageToken(manageToken);
  if (!card) return { ok: false, message: "Секретная ссылка управления больше не актуальна." };

  try {
    const access = await requestOrganizerAccess(card.organizerEmail);
    if (access.limited) {
      return { ok: false, message: "Ссылку уже отправляли недавно. Попробуйте немного позже." };
    }
    return { ok: true, message: `Письмо со ссылкой для входа отправлено на ${card.organizerEmail}.` };
  } catch (error) {
    logger.warn("organizer.access_email_failed", "Organizer access email resend failed", {
      cardId: card.id,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return { ok: false, message: "Не удалось отправить письмо. Попробуйте ещё раз немного позже." };
  }
}

export async function updateCardStatusAction(formData: FormData) {
  const manageToken = String(formData.get("manageToken") ?? "");
  const statusValue = String(formData.get("status") ?? "") as CardDraft["status"];

  if (!manageToken || !cardStatuses.includes(statusValue)) {
    return;
  }

  const card = await getCardDraftByManageToken(manageToken);

  if (!card) {
    return;
  }

  await updateCardStatus(card.id, statusValue);
  logger.info("manage.card_status_updated", "Card lifecycle status updated by organizer", {
    cardId: card.id,
    status: statusValue
  });
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
}

export async function updateContributionMessageAction(
  _prevState: { ok: boolean; message: string },
  formData: FormData
) {
  const contributionId = String(formData.get("contributionId") ?? "");
  const manageToken = String(formData.get("manageToken") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!contributionId || !manageToken || !message) {
    return { ok: false, message: "Не удалось сохранить текст поздравления." };
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) {
    return { ok: false, message: "Секретная ссылка управления больше не актуальна." };
  }

  const issues = validateContributionMessage(message, {
    layoutMode: card.finalMessageSettings?.layoutMode ?? "grid-2"
  });

  if (issues.length > 0) {
    return { ok: false, message: issues[0]?.message ?? "Текст нужно поправить." };
  }

  const updated = await updateContributionMessage(contributionId, message);
  if (!updated || updated.cardId !== card.id) {
    return { ok: false, message: "Поздравление не найдено." };
  }

  logger.info("manage.contribution_message_updated", "Contribution message updated by organizer", {
    cardId: card.id,
    contributionId: updated.id
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);

  return { ok: true, message: "Текст поздравления обновлен." };
}

export async function moveContributionAction(formData: FormData) {
  const contributionId = String(formData.get("contributionId") ?? "");
  const manageToken = String(formData.get("manageToken") ?? "");
  const direction = String(formData.get("direction") ?? "") as "up" | "down";

  if (!contributionId || !manageToken || !direction) {
    return;
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) {
    return;
  }

  const updated = await moveContribution(contributionId, direction);
  if (!updated || updated.cardId !== card.id) {
    return;
  }

  logger.info("manage.contribution_reordered", "Contribution order changed by organizer", {
    cardId: card.id,
    contributionId,
    direction
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
}

export async function reorderContributionsAction(
  _prevState: { ok: boolean; message: string },
  formData: FormData
) {
  const manageToken = String(formData.get("manageToken") ?? "");
  const orderedContributionIds = formData
    .getAll("orderedContributionIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!manageToken || orderedContributionIds.length === 0) {
    return { ok: false, message: "Не удалось сохранить новый порядок поздравлений." };
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) {
    return { ok: false, message: "Секретная ссылка управления больше не актуальна." };
  }

  const updated = await reorderContributions(card.id, orderedContributionIds);

  logger.info("manage.contributions_reordered", "Contribution list reordered by organizer", {
    cardId: card.id,
    orderedContributionIds
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);

  return {
    ok: true,
    message: updated.length > 0 ? "Новый порядок поздравлений сохранён." : "Порядок поздравлений обновлён."
  };
}

export async function updateFinalPresentationSettingsAction(
  _prevState: { ok: boolean; message: string },
  formData: FormData
) {
  const manageToken = String(formData.get("manageToken") ?? "");

  if (!manageToken) {
    return { ok: false, message: "Не удалось сохранить настройки финального экрана." };
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) {
    return { ok: false, message: "Секретная ссылка управления больше не актуальна." };
  }

  const layoutModeValue = String(formData.get("layoutMode") ?? "");
  const layoutMode = messageLayoutModes.includes(layoutModeValue as FinalCardMessageLayoutMode)
    ? (layoutModeValue as FinalCardMessageLayoutMode)
    : "grid-2";

  const mediaLayoutValue = String(formData.get("mediaLayout") ?? "");
  const mediaLayout = mediaLayouts.includes(mediaLayoutValue as FinalCardMessageMediaLayout)
    ? (mediaLayoutValue as FinalCardMessageMediaLayout)
    : "portrait";
  const rawTemplateId = String(formData.get("templateId") ?? "");
  const templateId = isTemplateId(rawTemplateId) ? rawTemplateId : card.templateId;
  const visibleContributions = await listContributionsByCardId(card.id);
  const layoutProfile = getFinalCardMessageLayoutProfile(layoutMode);
  const messageMediaSlots = formData
    .getAll("messageMediaSlots")
    .map((value) => String(value))
    .filter((value): value is FinalCardMediaSlot => finalMediaSlots.includes(value as FinalCardMediaSlot));
  const memoryMediaSlots = formData
    .getAll("memoryMediaSlots")
    .map((value) => String(value))
    .filter((value): value is FinalCardMediaSlot => finalMediaSlots.includes(value as FinalCardMediaSlot));
  const cardMediaAssets = await listCardMediaAssetsByCardId(card.id);
  const cardMediaAssetIds = new Set(cardMediaAssets.map((asset) => asset.id));
  const messageMediaAssetIds = formData
    .getAll("messageMediaAssetIds")
    .map((value) => String(value))
    .filter((value) => cardMediaAssetIds.has(value));
  const memoryMediaAssetIds = formData
    .getAll("memoryMediaAssetIds")
    .map((value) => String(value))
    .filter((value) => cardMediaAssetIds.has(value));
  const memoryTitle = String(formData.get("memoryTitle") ?? "").trim().slice(0, 80) || "Моменты";
  const memoryDescription =
    String(formData.get("memoryDescription") ?? "").trim().slice(0, 180) ||
    "Фото, которые хочется сохранить";
  const memoryPhotoCountValue = Number(formData.get("memoryPhotoCount"));
  const memoryPhotoCount: FinalCardMemorySettings["photoCount"] = memoryPhotoCountValue === 2 ? 2 : 3;
  const finalBlockOrder = formData
    .getAll("blockOrder")
    .map((value) => String(value))
    .filter((value): value is FinalCardBlockId => managedBlockIds.includes(value as FinalCardBlockId));

  const finalBlockSettings = optionalBlockIds.reduce<FinalCardBlockSettings>((acc, blockId) => {
    acc[blockId] = formData.get(blockId) === "on";
    return acc;
  }, {});

  const finalMessageSettings: FinalCardMessageSettings = {
    layoutMode,
    mediaLayout,
    mediaSlots: messageMediaSlots,
    mediaAssetIds: messageMediaAssetIds,
    showAllLink: visibleContributions.length > layoutProfile.cardsPerPage
  };
  const mainGreetingContributionIdValue = String(formData.get("mainGreetingContributionId") ?? "");
  const validVisibleContributionIds = new Set(visibleContributions.map((contribution) => contribution.id));
  const finalMainGreetingSettings = {
    contributionId: validVisibleContributionIds.has(mainGreetingContributionIdValue)
      ? mainGreetingContributionIdValue
      : card.finalMainGreetingSettings?.contributionId ?? null
  };
  const finalMemorySettings: FinalCardMemorySettings = {
    title: memoryTitle,
    description: memoryDescription,
    mediaSlots: memoryMediaSlots,
    mediaAssetIds: memoryMediaAssetIds.slice(0, memoryPhotoCount),
    photoCount: memoryPhotoCount
  };

  const updated = await updateCardFinalPresentationSettings(
    card.id,
    templateId,
    finalBlockSettings,
    finalBlockOrder.length > 0 ? (finalBlockOrder as FinalCardBlockOrder) : card.finalBlockOrder,
    finalMessageSettings,
    finalMainGreetingSettings,
    finalMemorySettings
  );
  if (!updated) {
    return { ok: false, message: "Не удалось сохранить состав финального экрана." };
  }

  logger.info("manage.final_presentation_settings_updated", "Final presentation settings updated by organizer", {
    cardId: card.id,
    templateId,
    finalBlockSettings,
    finalMessageSettings,
    finalMainGreetingSettings,
    finalMemorySettings
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);

  return { ok: true, message: "Настройки финального экрана обновлены." };
}

export async function setMainGreetingAction(formData: FormData) {
  const contributionId = String(formData.get("contributionId") ?? "");
  const manageToken = String(formData.get("manageToken") ?? "");

  if (!manageToken) {
    return;
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) {
    return;
  }

  const visibleContributions = await listContributionsByCardId(card.id);
  const selectedContribution = visibleContributions.find((contribution) => contribution.id === contributionId);

  await updateCardMainGreetingSettings(card.id, {
    contributionId: selectedContribution?.id ?? null
  });

  logger.info("manage.main_greeting_selected", "Main greeting selected by organizer", {
    cardId: card.id,
    contributionId: selectedContribution?.id ?? null
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
}

export async function saveCardMediaAction(
  _prevState: { ok: boolean; message: string },
  formData: FormData
) {
  const manageToken = String(formData.get("manageToken") ?? "");
  const slot = String(formData.get("slot") ?? "") as CardMediaSlot;
  const captionTitle = String(formData.get("captionTitle") ?? "").trim().slice(0, 60);
  const captionSubtitle = String(formData.get("captionSubtitle") ?? "").trim().slice(0, 120);
  const existingAssetId = String(formData.get("assetId") ?? "");
  const file = formData.get("file");

  if (!manageToken || !mediaSlots.includes(slot)) {
    return { ok: false, message: "Не удалось определить слот для фото." };
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) {
    return { ok: false, message: "Секретная ссылка управления больше не актуальна." };
  }

  if (file instanceof File && file.size > 0) {
    const issue = validateCardMediaFile(file);

    if (issue) {
      return { ok: false, message: issue };
    }

    const currentAssets = await listCardMediaAssetsByCardId(card.id);
    const existingSlotAsset = currentAssets.find((item) => item.slot === slot);
    const isReplacingExistingAsset = Boolean(existingAssetId || existingSlotAsset);

    if (!isReplacingExistingAsset && currentAssets.length >= CARD_MEDIA_MAX_COUNT) {
      return {
        ok: false,
        message: `В одной открытке можно использовать до ${CARD_MEDIA_MAX_COUNT} фото. Удалите или замените одно из уже добавленных.`
      };
    }

    let savedFile;
    try {
      savedFile = await saveCardMediaFile({ cardId: card.id, slot, file });
    } catch (error) {
      const errorId = await reportCriticalError("media", error, { cardId: card.id, operation: "save_file", slot });
      return { ok: false, message: `Не удалось сохранить фото. Код ошибки: ${errorId}` };
    }
    const now = new Date().toISOString();

    const asset: CardMediaAsset = {
      id: existingAssetId || randomUUID(),
      cardId: card.id,
      slot,
      publicUrl: savedFile.publicUrl,
      storagePath: savedFile.storagePath,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      captionTitle,
      captionSubtitle,
      createdAt: now,
      updatedAt: now
    };

    if (existingSlotAsset) {
      asset.id = existingSlotAsset.id;
      asset.createdAt = existingSlotAsset.createdAt;
    }

    try {
      await upsertCardMediaAsset(asset);
    } catch (error) {
      const errorId = await reportCriticalError("database", error, { cardId: card.id, operation: "save_media_record", slot });
      return { ok: false, message: `Фото загружено, но не добавлено в открытку. Код ошибки: ${errorId}` };
    }

    logger.info("manage.card_media_saved", "Card media saved by organizer", {
      cardId: card.id,
      slot,
      mimeType: file.type,
      sizeBytes: file.size
    });

    revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
    return { ok: true, message: "Фото сохранено." };
  }

  if (!existingAssetId) {
    return { ok: false, message: "Выберите файл для загрузки." };
  }

  const currentAssets = await listCardMediaAssetsByCardId(card.id);
  const currentAsset = currentAssets.find((item) => item.id === existingAssetId);
  const targetSlotAsset = currentAssets.find((item) => item.slot === slot && item.id !== existingAssetId);

  const isSlotChanged = currentAsset && currentAsset.slot !== slot;
  const isCaptionChanged = currentAsset && currentAsset.captionTitle !== captionTitle;

  if (isSlotChanged && targetSlotAsset) {
    await swapCardMediaAssetSlots(card.id, existingAssetId, targetSlotAsset.id);
  }

  const updated = await updateCardMediaAssetCaption(
    existingAssetId,
    captionTitle,
    captionSubtitle,
    targetSlotAsset ? undefined : slot
  );
  if (!updated || updated.cardId !== card.id) {
    return { ok: false, message: "Не удалось обновить фото." };
  }

  logger.info("manage.card_media_caption_updated", "Card media caption updated by organizer", {
    cardId: card.id,
    slot: updated.slot,
    assetId: updated.id
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);

  if (isSlotChanged) {
    return { ok: true, message: targetSlotAsset ? "Фото поменяны местами." : "Фото перемещено." };
  }

  if (isCaptionChanged) {
    return { ok: true, message: "Подпись к фото обновлена." };
  }

  return { ok: true, message: "Изменения сохранены." };
}

export async function deleteCardMediaAction(
  _prevState: { ok: boolean; message: string },
  formData: FormData
) {
  const manageToken = String(formData.get("manageToken") ?? "");
  const assetId = String(formData.get("assetId") ?? "");

  if (!manageToken || !assetId) {
    return { ok: false, message: "Не удалось удалить фото." };
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) {
    return { ok: false, message: "Секретная ссылка управления больше не актуальна." };
  }

  const deleted = await deleteCardMediaAsset(assetId);
  if (!deleted || deleted.cardId !== card.id) {
    return { ok: false, message: "Фото не найдено." };
  }

  logger.info("manage.card_media_deleted", "Card media deleted by organizer", {
    cardId: card.id,
    assetId: deleted.id,
    slot: deleted.slot
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  return { ok: true, message: "Фото удалено." };
}

export async function generateBestQuotesAction(
  manageToken: string
): Promise<{ ok: boolean; message: string; quotes: string[]; usage: import("@/lib/ai/types").AiUsage }> {
  const card = await getCardDraftByManageToken(manageToken);

  if (!card) {
    return { ok: false, message: "Секретная ссылка управления больше не актуальна.", quotes: [], usage: { used: 0, limit: 0, remaining: 0 } };
  }

  const contributions = await listContributionsByCardId(card.id);
  const result = await generateBestQuotes({
    cardId: card.id,
    recipientName: card.recipientName,
    occasionText: card.occasionText,
    contributions
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);

  return {
    ok: true,
    message: "Лучшие фразы обновлены.",
    quotes: result.insight.items.map((item) => item.text),
    usage: result.usage
  };
}

export async function generateQualitiesAction(
  manageToken: string
): Promise<{ ok: boolean; message: string; qualities: string[]; usage: import("@/lib/ai/types").AiUsage }> {
  const card = await getCardDraftByManageToken(manageToken);

  if (!card) {
    return { ok: false, message: "Секретная ссылка управления больше не актуальна.", qualities: [], usage: { used: 0, limit: 0, remaining: 0 } };
  }

  const contributions = await listContributionsByCardId(card.id);
  const result = await generateQualities({
    cardId: card.id,
    recipientName: card.recipientName,
    occasionText: card.occasionText,
    contributions
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);

  return {
    ok: true,
    message: "Качества обновлены.",
    qualities: result.insight.items.map((item) => item.text),
    usage: result.usage
  };
}
