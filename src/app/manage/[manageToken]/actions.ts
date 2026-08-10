"use server";

import { randomUUID } from "node:crypto";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
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
  updateCardFinalPresentationSettings,
  updateCardMainGreetingSettings,
  updateCardTemplate,
  updateCardMediaAssetCaption,
  updateContributionMessage,
  updateContributionDetails,
  updateContributionStatus,
  upsertCardMediaAsset
} from "@/lib/cards/repository";
import { CARD_MEDIA_MAX_COUNT, validateCardMediaFile } from "@/lib/cards/media";
import {
  ALL_MEDIA_SLOTS,
  getActiveMessageSlots,
  getAssetsForSlots,
  MEMORY_MEDIA_SLOTS,
  normalizeCrop
} from "@/lib/cards/media-slots";
import { createContribution } from "@/lib/cards/service";
import { isTemplateId } from "@/lib/cards/templates";
import type { CardDraft, CardMediaAsset, CardMediaSlot } from "@/lib/cards/types";
import { closeCollection, deliverCard, openCollection } from "@/lib/cards/lifecycle-repository";
import { getCardLifecycleByManageToken } from "@/lib/cards/lifecycle-repository";
import { assertCardContentEditable } from "@/lib/cards/lifecycle";
import { validateContributionFormData, validateContributionMessage } from "@/lib/contributions/validation";
import { generateBestQuotes, generateQualities } from "@/lib/ai/service";
import {
  BEST_QUOTE_MIN_CONTRIBUTION_COUNT,
  buildContributionFingerprint,
  hasEnoughMeaningfulQuoteSources
} from "@/lib/ai/card-insights";
import { AiError } from "@/lib/ai/types";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type {
  FinalCardBlockId,
  FinalCardBlockOrder,
  FinalCardBlockSettings,
  FinalCardMemorySettings,
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout,
  FinalCardMessageSettings,
  FinalCardOptionalBlockId
} from "@/lib/final-card/types";
import { logger } from "@/lib/logger";
import { deleteStoredCardMediaFile, saveCardMediaFile } from "@/lib/media/local-card-media-storage";
import { importGiftOptionImage } from "@/lib/gift-polls/image-storage";
import { ensureGiftPollEnabled } from "@/lib/gift-polls/activation";
import { requestOrganizerAccess } from "@/lib/organizer/service";
import { getGiftPath, getJoinPath, getManagePath } from "@/lib/routes/card-links";
import { reportCriticalError } from "@/lib/telemetry";
import {
  getAiCardInsight,
  getAiCardQuoteSelection,
  getAiUsageSummary,
  saveAiCardQuoteSelection
} from "@/lib/ai/repository";
import { ContributionLimitReachedError } from "@/lib/contributions/limits";
import {
  closeGiftPoll,
  getGiftPollForManage,
  openGiftPoll,
  reorderGiftPollOptionsSafely,
  replaceGiftPollOptionsSafely,
  selectGiftPollOption,
  updateGiftPollSettingsSafely
} from "@/lib/gift-polls/repository";
import { GIFT_POLL_MAX_OPTIONS, isSafeProductUrl, normalizeBudgetAmount, normalizeGiftPollMode } from "@/lib/gift-polls/validation";
import { sanitizeGiftPollText } from "@/lib/gift-polls/text-sanitization";
import { finalCardLayouts } from "@/lib/final-card/layouts";
import { buildCardBlockReadiness } from "@/lib/manage/card-design-readiness";
import { resolveFinalBestQuotes } from "@/lib/final-card/quote-selection";

const optionalBlockIds: FinalCardOptionalBlockId[] = ["summary", "qualities", "memories", "quotes"];
const managedBlockIds: FinalCardBlockId[] = ["hero", "summary", "qualities", "messages", "memories", "quotes", "closing"];
const messageLayoutModes: FinalCardMessageLayoutMode[] = ["grid-2", "carousel-1", "carousel-2", "column-media"];
const mediaLayouts: FinalCardMessageMediaLayout[] = ["portrait", "landscape-pair", "landscape-trio"];
const mediaSlots: CardMediaSlot[] = ALL_MEDIA_SLOTS;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validateLength = (value: string, min: number, max: number) => value.length >= min && value.length <= max;
const validateDate = (value: string) => value.length === 0 || !Number.isNaN(Date.parse(value));

const assertManageContentEditable = async (manageToken: string) => {
  const lifecycle = await getCardLifecycleByManageToken(manageToken);
  if (!lifecycle) {
    throw new Error("Секретная ссылка управления больше не актуальна.");
  }
  assertCardContentEditable(lifecycle);
};

const syncCardPhotoSettings = async (card: CardDraft, assets: CardMediaAsset[]) => {
  if (!isTemplateId(card.templateId)) {
    return;
  }

  const currentMessageSettings = card.finalMessageSettings ?? {
    layoutMode: "grid-2" as const,
    mediaLayout: "portrait" as const,
    mediaSlots: [],
    mediaAssetIds: [],
    showAllLink: true
  };
  const messageSlots = currentMessageSettings.layoutMode === "column-media"
    ? getActiveMessageSlots(currentMessageSettings.mediaLayout)
    : [];
  const messageAssetIds = getAssetsForSlots(assets, messageSlots).map((asset) => asset.id);
  const momentsEnabled = card.finalBlockSettings?.memories ?? true;
  const memorySlots = momentsEnabled ? MEMORY_MEDIA_SLOTS : [];
  const memoryAssetIds = getAssetsForSlots(assets, memorySlots).map((asset) => asset.id);
  const finalMessageSettings: FinalCardMessageSettings = {
    ...currentMessageSettings,
    mediaSlots: messageSlots,
    mediaAssetIds: messageAssetIds
  };
  const finalMemorySettings: FinalCardMemorySettings = {
    ...(card.finalMemorySettings ?? {
      title: "Моменты",
      description: "Фото, которые хочется сохранить",
      mediaSlots: [],
      mediaAssetIds: [],
      photoCount: 3
    }),
    mediaSlots: memorySlots,
    mediaAssetIds: memoryAssetIds,
    photoCount: 3
  };

  await updateCardFinalPresentationSettings(
    card.id,
    card.templateId,
    card.finalBlockSettings ?? {},
    card.finalBlockOrder ?? managedBlockIds,
    finalMessageSettings,
    card.finalMainGreetingSettings ?? { contributionId: null },
    finalMemorySettings
  );
};

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
  accessEmail?: {
    status: "sent" | "failed";
    message: string;
  };
};

export type GiftPollFormState = { ok: boolean; message: string };

const giftPollState = (ok: boolean, message: string): GiftPollFormState => ({ ok, message });

export async function enableGiftPollAction(_previous: GiftPollFormState, formData: FormData): Promise<GiftPollFormState> {
  const manageToken = String(formData.get("manageToken") ?? "");
  const card = await getCardDraftByManageToken(manageToken);
  if (!card) return giftPollState(false, "Секретная ссылка управления больше не актуальна.");

  try {
    await assertManageContentEditable(manageToken);
    const activation = await ensureGiftPollEnabled(card.id);
    if (activation.created) {
      logger.info("manage.gift_poll_enabled", "Gift poll enabled by organizer", { cardId: card.id });
    }
    revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
    return giftPollState(true, "Голосование включено. Добавьте варианты подарка или бюджета.");
  } catch (error) {
    logger.error("manage.gift_poll_enable_failed", "Gift poll could not be enabled", {
      cardId: card.id,
      error: error instanceof Error ? error.message : String(error)
    });
    return giftPollState(false, "Не удалось включить голосование. Попробуйте ещё раз.");
  }
}

export async function saveGiftPollAction(_previous: GiftPollFormState, formData: FormData): Promise<GiftPollFormState> {
  const manageToken = String(formData.get("manageToken") ?? "");
  const card = await getCardDraftByManageToken(manageToken);
  if (!card) return giftPollState(false, "Секретная ссылка управления больше не актуальна.");
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return giftPollState(false, error instanceof Error ? error.message : "Открытка недоступна для редактирования.");
  }

  const mode = normalizeGiftPollMode(formData.get("mode"));
  const existingPoll = await getGiftPollForManage(card.id);
  if (existingPoll && existingPoll.totalVotes > 0 && existingPoll.mode !== mode) {
    return giftPollState(false, "Нельзя сменить режим после первого голоса: так результаты останутся корректными.");
  }
  const title = sanitizeGiftPollText(String(formData.get("title") ?? ""), 80);
  const question = sanitizeGiftPollText(String(formData.get("question") ?? ""), 180);
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
            title: typeof option.title === "string" ? sanitizeGiftPollText(option.title, 60) : "",
            description: typeof option.description === "string" ? sanitizeGiftPollText(option.description, 140) : "",
            priceLabel: typeof option.priceLabel === "string" ? sanitizeGiftPollText(option.priceLabel, 30) : "",
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
    title: mode === "budget" ? normalizeBudgetAmount(option.title) : sanitizeGiftPollText(option.title, 60),
    description: sanitizeGiftPollText(option.description, 140) || null,
    priceLabel: mode === "budget" ? null : sanitizeGiftPollText(option.priceLabel, 30) || null,
    productUrl: mode === "budget" ? null : option.productUrl || null,
    imageUrl: mode === "budget" ? null : option.imageUrl || null,
    index
  })).filter((option): option is { id: string; title: string; description: string | null; priceLabel: string | null; productUrl: string | null; imageUrl: string | null; index: number } => Boolean(option.title));

  if (!title || !question) return giftPollState(false, "Заполните заголовок и вопрос для участников.");
  if (options.length > GIFT_POLL_MAX_OPTIONS) {
    return giftPollState(false, `Можно добавить не более ${GIFT_POLL_MAX_OPTIONS} вариантов.`);
  }
  if (options.some((option) => option.title.length > 60 || (option.description?.length ?? 0) > 140 || (option.priceLabel?.length ?? 0) > 30)) {
    return giftPollState(false, "Проверьте лимиты: название до 60, описание до 140, сумма до 30 символов.");
  }
  if (options.some((option) => (option.productUrl && !isSafeProductUrl(option.productUrl)) || (option.imageUrl && !option.imageUrl.startsWith("/uploads/gift-options/") && !isSafeProductUrl(option.imageUrl)))) {
    return giftPollState(false, "Ссылка на товар должна начинаться с https://.");
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

  if (!existingPoll) return giftPollState(false, "Голосование не найдено. Обновите страницу.");
  const optionsForSave = await Promise.all(options.map(async (option) => {
    if (!option.imageUrl || option.imageUrl.startsWith("/uploads/gift-options/")) return option;
    try {
      return { ...option, imageUrl: await importGiftOptionImage(card.id, option.imageUrl) };
    } catch {
      // A failed marketplace image must never prevent the organizer from saving the option.
      return { ...option, imageUrl: null };
    }
  }));
  const mutation = await replaceGiftPollOptionsSafely(existingPoll.id, {
    mode, title, question, closesAt: closesAt?.toISOString() ?? null
  }, optionsForSave.map((option) => ({
    id: option.id, title: option.title, description: option.description,
    imageUrl: option.imageUrl, priceLabel: option.priceLabel, productUrl: option.productUrl, sortOrder: option.index
  })));
  if (mutation === "locked") return giftPollState(false, "Настройки уже нельзя изменить: голосование получило первый голос. Обновите страницу, чтобы увидеть актуальное состояние.");
  if (mutation !== "ok") return giftPollState(false, "Список вариантов изменился. Обновите страницу и повторите действие.");
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  return giftPollState(true, "Варианты сохранены. Откройте голосование, когда будете готовы.");
}

export async function saveGiftPollSettingsAction(_previous: GiftPollFormState, formData: FormData): Promise<GiftPollFormState> {
  const manageToken = String(formData.get("manageToken") ?? "");
  const pollId = String(formData.get("pollId") ?? "");
  const card = await getCardDraftByManageToken(manageToken);
  if (!card || !pollId) return giftPollState(false, "Секретная ссылка управления больше не актуальна.");
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return giftPollState(false, error instanceof Error ? error.message : "Открытка недоступна для редактирования.");
  }

  const existingPoll = await getGiftPollForManage(card.id);
  if (!existingPoll || existingPoll.id !== pollId) return giftPollState(false, "Голосование не найдено. Обновите страницу.");

  const mode = normalizeGiftPollMode(formData.get("mode"));
  const title = sanitizeGiftPollText(String(formData.get("title") ?? ""), 80);
  const question = sanitizeGiftPollText(String(formData.get("question") ?? ""), 180);
  const closesAtValue = String(formData.get("closesAt") ?? "").trim();
  const closesAt = closesAtValue ? new Date(closesAtValue) : null;

  if (!title || !question) return giftPollState(false, "Заполните заголовок и вопрос для участников.");
  if (closesAtValue && (!closesAt || Number.isNaN(closesAt.getTime()))) return giftPollState(false, "Укажите корректную дату завершения или оставьте поле пустым.");

  if (existingPoll.totalVotes > 0) {
    if (existingPoll.mode !== mode) return giftPollState(false, "Нельзя сменить режим после первого голоса: так результаты останутся корректными.");
    if (existingPoll.title !== title || existingPoll.question !== question) {
      return giftPollState(false, "После первого голоса нельзя менять заголовок и вопрос: участники должны голосовать при одинаковых условиях.");
    }
  }

  const mutation = await updateGiftPollSettingsSafely(pollId, { mode, title, question, closesAt: closesAt?.toISOString() ?? null });
  if (mutation === "locked") return giftPollState(false, "Настройки уже нельзя изменить: голосование получило первый голос. Обновите страницу, чтобы увидеть актуальное состояние.");
  if (mutation !== "ok") return giftPollState(false, "Голосование изменилось. Обновите страницу и повторите действие.");
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  return giftPollState(true, "Настройки голосования сохранены.");
}

const openGiftPollCore = async (formData: FormData): Promise<GiftPollFormState> => {
  const manageToken = String(formData.get("manageToken") ?? "");
  const pollId = String(formData.get("pollId") ?? "");
  const card = await getCardDraftByManageToken(manageToken);
  if (!card || !pollId) return giftPollState(false, "Секретная ссылка управления больше не актуальна.");
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return giftPollState(false, error instanceof Error ? error.message : "Открытка недоступна для редактирования.");
  }
  const poll = await getGiftPollForManage(card.id);
  if (!poll || poll.id !== pollId) return giftPollState(false, "Голосование не найдено. Обновите страницу.");
  if (!poll.title.trim() || !poll.question.trim()) return giftPollState(false, "Заполните заголовок и вопрос для участников.");
  const namedOptions = poll.options.filter((option) => option.title.trim().length > 0);
  if (namedOptions.length < 2) return giftPollState(false, "Добавьте минимум два варианта, чтобы открыть голосование.");
  if (namedOptions.length > GIFT_POLL_MAX_OPTIONS) return giftPollState(false, `Можно добавить не более ${GIFT_POLL_MAX_OPTIONS} вариантов.`);
  await openGiftPoll(pollId);
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  return giftPollState(true, "Голосование открыто");
};

export async function openGiftPollAction(_previous: GiftPollFormState, formData: FormData): Promise<GiftPollFormState> {
  return openGiftPollCore(formData);
}

export async function reorderGiftPollOptionsAction(_previous: GiftPollFormState, formData: FormData): Promise<GiftPollFormState> {
  const manageToken = String(formData.get("manageToken") ?? "");
  const pollId = String(formData.get("pollId") ?? "");
  const orderedOptionIds = formData.getAll("orderedOptionIds").map(String).filter(Boolean);
  const baseOptionIds = formData.getAll("baseOptionIds").map(String).filter(Boolean);
  const card = await getCardDraftByManageToken(manageToken);
  if (!card || !pollId) return giftPollState(false, "Секретная ссылка управления больше не актуальна.");
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return giftPollState(false, error instanceof Error ? error.message : "Открытка недоступна для редактирования.");
  }
  const poll = await getGiftPollForManage(card.id);
  if (!poll || poll.id !== pollId) return giftPollState(false, "Голосование не найдено. Обновите страницу.");
  const mutation = await reorderGiftPollOptionsSafely(pollId, orderedOptionIds, baseOptionIds);
  if (mutation === "locked") return giftPollState(false, "Настройки уже нельзя изменить: голосование получило первый голос. Обновите страницу, чтобы увидеть актуальное состояние.");
  if (mutation === "stale") return giftPollState(false, "Список вариантов изменился. Обновите страницу и повторите настройку порядка.");
  if (mutation !== "ok") return giftPollState(false, "Не удалось сохранить порядок вариантов.");
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  return giftPollState(true, "Новый порядок вариантов сохранён.");
}

export async function reopenGiftPollAction(formData: FormData) {
  await openGiftPollCore(formData);
}

export async function closeGiftPollAction(formData: FormData) {
  const manageToken = String(formData.get("manageToken") ?? "");
  const pollId = String(formData.get("pollId") ?? "");
  const card = await getCardDraftByManageToken(manageToken);
  if (!card || !pollId) return;
  await assertManageContentEditable(manageToken);
  await closeGiftPoll(pollId);
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
}

export async function selectGiftPollOptionAction(formData: FormData) {
  const manageToken = String(formData.get("manageToken") ?? "");
  const pollId = String(formData.get("pollId") ?? "");
  const optionId = String(formData.get("optionId") ?? "");
  const card = await getCardDraftByManageToken(manageToken);
  if (!card || !pollId || !optionId) return;
  await assertManageContentEditable(manageToken);
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

  const managedCard = await getCardDraftByManageToken(manageToken);
  if (!managedCard) return;
  await assertManageContentEditable(manageToken);

  const updated = await updateContributionStatus(contributionId, status);
  if (!updated || updated.cardId !== managedCard.id) {
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
  await assertManageContentEditable(manageToken);

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

  const managedCard = await getCardDraftByManageToken(manageToken);
  if (!managedCard) return;
  await assertManageContentEditable(manageToken);

  const updated = await updateContributionStatus(contributionId, "deleted");
  if (!updated || updated.cardId !== managedCard.id) {
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
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return cardBasicsError(error instanceof Error ? error.message : "Открытка недоступна для редактирования.", fields);
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

  const accessEmail = organizerEmailChanged
    ? accessEmailSent
      ? {
          status: "sent" as const,
          message: `Письмо со ссылкой для входа отправлено на ${fields.organizerEmail}.`
        }
      : {
          status: "failed" as const,
          message: "Не удалось отправить письмо со ссылкой."
        }
    : undefined;

  return { ok: true, message: "Изменения сохранены.", fields, accessEmail };
}

export async function saveOrganizerContributionAction(
  _prevState: { ok: boolean; message: string; contributionId?: string },
  formData: FormData
) {
  const manageToken = String(formData.get("manageToken") ?? "");
  const contributionId = String(formData.get("contributionId") ?? "");
  const requestedStatus = formData.get("status") === "hidden" ? "hidden" : "visible";
  const requestedMainGreeting = formData.get("isMainGreeting") === "true";

  if (!manageToken) {
    return { ok: false, message: "Не удалось определить страницу управления." };
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) {
    return { ok: false, message: "Секретная ссылка управления больше не актуальна." };
  }
  await assertManageContentEditable(manageToken);

  const contributionFormData = new FormData();
  contributionFormData.set("cardId", card.id);
  contributionFormData.set("authorName", String(formData.get("authorName") ?? ""));
  contributionFormData.set("authorRole", String(formData.get("authorRole") ?? ""));
  contributionFormData.set("message", String(formData.get("message") ?? ""));
  const validation = validateContributionFormData(contributionFormData, {
    layoutMode: card.finalMessageSettings?.layoutMode ?? "grid-2"
  });

  if (!validation.success) {
    return { ok: false, message: validation.issues[0]?.message ?? "Проверьте заполненные поля." };
  }

  if (contributionId) {
    const existing = (await listAllContributionsByCardId(card.id)).find((item) => item.id === contributionId);
    if (!existing) return { ok: false, message: "Поздравление не найдено." };
    const isCurrentMainGreeting = card.finalMainGreetingSettings?.contributionId === contributionId;
    if (isCurrentMainGreeting && (!requestedMainGreeting || requestedStatus === "hidden")) {
      return { ok: false, message: "Сначала выберите другое главное поздравление." };
    }
    if (requestedMainGreeting && requestedStatus === "hidden") {
      return { ok: false, message: "Главное поздравление должно быть видно в открытке." };
    }
    const updated = await updateContributionDetails(contributionId, {
      authorName: validation.data.authorName,
      authorRole: validation.data.authorRole?.trim() || null,
      message: validation.data.message
    });
    if (!updated) return { ok: false, message: "Не удалось сохранить поздравление." };

    if (existing.status !== requestedStatus) {
      await updateContributionStatus(contributionId, requestedStatus);
      const siblings = await listAllContributionsByCardId(card.id);
      const nextOrder = siblings.map((item) => item.id).filter((id) => id !== contributionId);
      if (requestedStatus === "hidden") {
        nextOrder.push(contributionId);
      } else {
        const firstHiddenIndex = nextOrder.findIndex((id) =>
          siblings.find((item) => item.id === id)?.status === "hidden"
        );
        if (firstHiddenIndex === -1) nextOrder.push(contributionId);
        else nextOrder.splice(firstHiddenIndex, 0, contributionId);
      }
      await reorderContributions(card.id, nextOrder);
    }

    if (requestedMainGreeting && !isCurrentMainGreeting) {
      await updateCardMainGreetingSettings(card.id, { contributionId });
    }
    logger.info("manage.contribution_details_updated", "Contribution details updated by organizer", {
      cardId: card.id,
      contributionId
    });
    revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
    return { ok: true, message: "Изменения сохранены.", contributionId };
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
  const nextOrder = siblings.map((item) => item.id).filter((id) => id !== contribution.id);
  const firstHiddenIndex = nextOrder.findIndex((id) =>
    siblings.find((item) => item.id === id)?.status === "hidden"
  );
  if (firstHiddenIndex === -1) nextOrder.push(contribution.id);
  else nextOrder.splice(firstHiddenIndex, 0, contribution.id);
  await reorderContributions(card.id, nextOrder);
  if (requestedMainGreeting) {
    await updateCardMainGreetingSettings(card.id, { contributionId: contribution.id });
  }
  logger.info("manage.manual_contribution_created", "Manual contribution created by organizer", {
    cardId: card.id,
    contributionId: contribution.id
  });
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  return { ok: true, message: "Поздравление добавлено.", contributionId: contribution.id };
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

const runLifecycleAction = async (formData: FormData, command: (manageToken: string) => Promise<unknown>) => {
  const manageToken = String(formData.get("manageToken") ?? "");
  if (!manageToken) return;
  const card = await getCardDraftByManageToken(manageToken);
  if (!card) return;
  await command(manageToken);
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
};

export async function openCollectionAction(formData: FormData) {
  await runLifecycleAction(formData, openCollection);
}

export async function closeCollectionAction(formData: FormData) {
  await runLifecycleAction(formData, closeCollection);
}

export type DeliverCardState = { ok: boolean; message: string };

export async function deliverCardAction(
  _previousState: DeliverCardState,
  formData: FormData
): Promise<DeliverCardState> {
  const manageToken = String(formData.get("manageToken") ?? "");
  const cardVersion = String(formData.get("cardVersion") ?? "");
  const confirmed = formData.get("deliveryConfirmed") === "on";
  const card = manageToken ? await getCardDraftByManageToken(manageToken) : null;
  if (!card) return { ok: false, message: "Секретная ссылка управления больше не актуальна." };
  if (!isTemplateId(card.templateId)) {
    logger.warn("manage.delivery_blocked_by_template", "Card delivery blocked because no template is selected", {
      cardId: card.id
    });
    return { ok: false, message: "Сначала выберите шаблон открытки." };
  }
  const [contributions, assets, quotesInsight, qualitiesInsight, savedQuoteSelection] = await Promise.all([
    listContributionsByCardId(card.id),
    listCardMediaAssetsByCardId(card.id),
    getAiCardInsight(card.id, "quotes"),
    getAiCardInsight(card.id, "qualities"),
    getAiCardQuoteSelection(card.id)
  ]);
  const fingerprint = buildContributionFingerprint(contributions);
  const quotesAreStale = Boolean(quotesInsight && quotesInsight.sourceFingerprint !== fingerprint);
  const qualitiesAreStale = Boolean(qualitiesInsight && qualitiesInsight.sourceFingerprint !== fingerprint);
  const quoteCandidates = quotesInsight?.items.map((item) => item.text) ?? [];
  const selectedQuoteTexts = savedQuoteSelection && quotesInsight && savedQuoteSelection.sourceFingerprint === quotesInsight.sourceFingerprint
    ? savedQuoteSelection.items.map((item) => item.text)
    : [];
  const quoteSelection = resolveFinalBestQuotes(card, quoteCandidates, selectedQuoteTexts);
  const readiness = buildCardBlockReadiness({
    card,
    requiredBlockIds: finalCardLayouts[card.templateId].blocks
      .filter((block) => block.required)
      .map((block) => block.id),
    visibleContributions: contributions,
    mediaAssets: assets,
    qualities: qualitiesInsight?.items.map((item) => item.text) ?? [],
    qualitiesAreStale,
    bestQuotes: quoteSelection.quotes,
    bestQuotesAreStale: quotesAreStale && !quoteSelection.usesLegacyDefault
  });
  if (readiness.some((block) => block.enabled && block.status !== "READY")) {
    logger.warn("manage.delivery_blocked_by_readiness", "Card delivery blocked by incomplete blocks", {
      cardId: card.id,
      incompleteBlocks: readiness
        .filter((block) => block.enabled && block.status !== "READY")
        .map((block) => block.blockId)
    });
    return { ok: false, message: "Сначала завершите обязательные блоки открытки." };
  }
  try {
    await deliverCard(manageToken, { confirmed, cardVersion });
    revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
    return { ok: true, message: "Открытка передана. Приватная ссылка готова." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Не удалось передать открытку. Попробуйте ещё раз."
    };
  }
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
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Открытка недоступна для редактирования." };
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
  const baseContributionIds = formData
    .getAll("baseContributionIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!manageToken || orderedContributionIds.length === 0) {
    return { ok: false, message: "Не удалось сохранить новый порядок поздравлений." };
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) {
    return { ok: false, message: "Секретная ссылка управления больше не актуальна." };
  }
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Открытка недоступна для редактирования." };
  }

  const siblings = await listAllContributionsByCardId(card.id);
  const mainGreetingContributionId = card.finalMainGreetingSettings?.contributionId ?? null;
  const reorderableIds = siblings
    .filter((item) => item.status === "visible" && item.id !== mainGreetingContributionId)
    .map((item) => item.id);
  const hasUniqueIds = new Set(orderedContributionIds).size === orderedContributionIds.length;
  const hasCurrentSet = orderedContributionIds.length === reorderableIds.length
    && orderedContributionIds.every((id) => reorderableIds.includes(id));
  const baseStillCurrent = baseContributionIds.length === reorderableIds.length
    && baseContributionIds.every((id, index) => id === reorderableIds[index]);

  if (!hasUniqueIds || !hasCurrentSet || !baseStillCurrent) {
    return { ok: false, message: "Список поздравлений изменился. Обновите данные и повторите настройку порядка." };
  }

  let nextVisibleIndex = 0;
  const mergedOrder = siblings.map((item) => {
    if (item.status !== "visible" || item.id === mainGreetingContributionId) return item.id;
    return orderedContributionIds[nextVisibleIndex++] ?? item.id;
  });
  let updated;
  try {
    updated = await reorderContributions(card.id, mergedOrder);
  } catch (error) {
    logger.error("manage.contributions_reorder_failed", "Contribution order could not be saved", {
      cardId: card.id,
      error: error instanceof Error ? error.message : String(error)
    });
    return { ok: false, message: "Не удалось сохранить порядок. Проверьте соединение и попробуйте ещё раз." };
  }

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
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Открытка недоступна для редактирования." };
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
  if (!isTemplateId(templateId)) {
    return { ok: false, message: "Сначала выберите шаблон открытки." };
  }
  const visibleContributions = await listContributionsByCardId(card.id);
  const layoutProfile = getFinalCardMessageLayoutProfile(layoutMode, mediaLayout);
  const cardMediaAssets = await listCardMediaAssetsByCardId(card.id);
  const memoryTitle = String(formData.get("memoryTitle") ?? "").trim().slice(0, 80) || "Моменты";
  const memoryDescription =
    String(formData.get("memoryDescription") ?? "").trim().slice(0, 180) ||
    "Фото, которые хочется сохранить";
  const memoryPhotoCount: FinalCardMemorySettings["photoCount"] = 3;
  const finalBlockOrder = formData
    .getAll("blockOrder")
    .map((value) => String(value))
    .filter((value): value is FinalCardBlockId => managedBlockIds.includes(value as FinalCardBlockId));

  const finalBlockSettings = optionalBlockIds.reduce<FinalCardBlockSettings>((acc, blockId) => {
    acc[blockId] = formData.get(blockId) === "on";
    return acc;
  }, {});
  const messageMediaSlots = layoutMode === "column-media" ? getActiveMessageSlots(mediaLayout) : [];
  const messageMediaAssetIds = getAssetsForSlots(cardMediaAssets, messageMediaSlots).map((asset) => asset.id);
  const momentsEnabled = finalBlockSettings.memories ?? true;
  const memoryMediaSlots = momentsEnabled ? MEMORY_MEDIA_SLOTS : [];
  const memoryMediaAssetIds = getAssetsForSlots(cardMediaAssets, memoryMediaSlots).map((asset) => asset.id);

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
    return { ok: false, message: "Не удалось изменить оформление. Попробуйте ещё раз." };
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

export async function updateCardTemplateAction(
  _previousState: { ok: boolean; message: string },
  formData: FormData
) {
  const manageToken = String(formData.get("manageToken") ?? "");
  const templateIdValue = String(formData.get("templateId") ?? "");
  if (!manageToken || !isTemplateId(templateIdValue)) {
    return { ok: false, message: "Не удалось выбрать шаблон." };
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) return { ok: false, message: "Секретная ссылка управления больше не актуальна." };
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Открытка недоступна для редактирования." };
  }

  const updated = await updateCardTemplate(card.id, templateIdValue);
  if (!updated) return { ok: false, message: "Не удалось применить шаблон." };

  logger.info("manage.card_template_updated", "Card template updated by organizer", {
    cardId: card.id,
    templateId: templateIdValue
  });
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  return { ok: true, message: "Шаблон применён." };
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
  await assertManageContentEditable(manageToken);

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
  const captionTitle = String(formData.get("captionTitle") ?? "").trim();
  const captionSubtitle = String(formData.get("captionSubtitle") ?? "").trim();
  const existingAssetId = String(formData.get("assetId") ?? "");
  const file = formData.get("file");
  const rightsConfirmed = formData.get("rightsConfirmed") === "on";
  const crop = normalizeCrop({
    x: Number(formData.get("cropX") ?? 50),
    y: Number(formData.get("cropY") ?? 50),
    zoom: Number(formData.get("cropZoom") ?? 1)
  });
  const rawImageWidth = Number(formData.get("imageWidth") ?? 0);
  const rawImageHeight = Number(formData.get("imageHeight") ?? 0);
  const imageWidth = Number.isInteger(rawImageWidth) && rawImageWidth > 0 ? rawImageWidth : null;
  const imageHeight = Number.isInteger(rawImageHeight) && rawImageHeight > 0 ? rawImageHeight : null;

  if (!manageToken) {
    return { ok: false, message: "Не удалось определить слот для фото." };
  }

  if (captionTitle.length > 45 || captionSubtitle.length > 45) {
    return { ok: false, message: "Подпись длиннее 45 символов. Сократите её, чтобы она поместилась на полароиде." };
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) {
    return { ok: false, message: "Секретная ссылка управления больше не актуальна." };
  }
  if (file instanceof File && file.size > 0 && !rightsConfirmed) {
    return { ok: false, message: "Подтвердите право использовать загружаемые материалы." };
  }
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Открытка недоступна для редактирования." };
  }

  if (file instanceof File && file.size > 0) {
    const issue = validateCardMediaFile(file);

    if (issue) {
      return { ok: false, message: issue };
    }

    if (!mediaSlots.includes(slot)) {
      return { ok: false, message: "Не удалось определить слот для фото." };
    }
    const currentAssets = await listCardMediaAssetsByCardId(card.id);
    const currentAsset = existingAssetId ? currentAssets.find((item) => item.id === existingAssetId) : null;
    if (existingAssetId && !currentAsset) {
      return { ok: false, message: "Фотография для замены не найдена." };
    }
    const existingSlotAsset = currentAssets.find((item) => item.slot === slot);
    if (existingSlotAsset && existingSlotAsset.id !== existingAssetId) {
      return { ok: false, message: "Эта позиция уже занята. Используйте перемещение или обмен местами." };
    }
    const isReplacingExistingAsset = Boolean(currentAsset);

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
      id: currentAsset?.id ?? randomUUID(),
      cardId: card.id,
      slot,
      publicUrl: savedFile.publicUrl,
      storagePath: savedFile.storagePath,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      captionTitle,
      captionSubtitle,
      imageWidth,
      imageHeight,
      cropX: crop.x,
      cropY: crop.y,
      cropZoom: crop.zoom,
      rightsConsentVersion: LEGAL_VERSIONS.materialRights,
      rightsConfirmedAt: now,
      createdAt: now,
      updatedAt: now
    };

    if (currentAsset) {
      asset.createdAt = currentAsset.createdAt;
    }

    try {
      await upsertCardMediaAsset(asset);
    } catch (error) {
      await deleteStoredCardMediaFile(savedFile.storagePath);
      const errorId = await reportCriticalError("database", error, { cardId: card.id, operation: "save_media_record", slot });
      return { ok: false, message: `Фото загружено, но не добавлено в открытку. Код ошибки: ${errorId}` };
    }

    logger.info("manage.card_media_saved", "Card media saved by organizer", {
      cardId: card.id,
      slot,
      mimeType: file.type,
      sizeBytes: file.size
    });

    const nextAssets = [...currentAssets.filter((item) => item.id !== asset.id), asset];
    await syncCardPhotoSettings(card, nextAssets);
    revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
    const position = slot === "portrait" || slot.endsWith("-a") ? 1 : slot.endsWith("-b") ? 2 : 3;
    return { ok: true, message: `Фото добавлено в позицию ${position}.`, asset };
  }

  if (!existingAssetId) {
    return { ok: false, message: "Выберите файл для загрузки." };
  }

  if (!mediaSlots.includes(slot)) {
    return { ok: false, message: "Не удалось определить слот для фото." };
  }

  const currentAssets = await listCardMediaAssetsByCardId(card.id);
  const currentAsset = currentAssets.find((item) => item.id === existingAssetId);
  if (!currentAsset) {
    return { ok: false, message: "Фотография не найдена." };
  }
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
    targetSlotAsset ? undefined : slot,
    { cropX: crop.x, cropY: crop.y, cropZoom: crop.zoom }
  );
  if (!updated || updated.cardId !== card.id) {
    return { ok: false, message: "Не удалось обновить фото." };
  }

  logger.info("manage.card_media_caption_updated", "Card media caption updated by organizer", {
    cardId: card.id,
    slot: updated.slot,
    assetId: updated.id
  });

  const nextAssets = await listCardMediaAssetsByCardId(card.id);
  await syncCardPhotoSettings(card, nextAssets);
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);

  if (isSlotChanged) {
    return { ok: true, message: targetSlotAsset ? "Фото поменяны местами." : "Фото перемещено." };
  }

  if (isCaptionChanged) {
    return { ok: true, message: "Подпись к фото обновлена." };
  }

  return { ok: true, message: "Изменения сохранены." };
}

export async function updateCardMomentsEnabledAction(manageToken: string, enabled: boolean) {
  const card = await getCardDraftByManageToken(manageToken);
  if (!card) return { ok: false, message: "Секретная ссылка управления больше не актуальна." };
  if (!isTemplateId(card.templateId)) {
    return { ok: false, message: "Сначала выберите шаблон открытки." };
  }
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Открытка недоступна для редактирования." };
  }
  const assets = await listCardMediaAssetsByCardId(card.id);
  const finalBlockSettings: FinalCardBlockSettings = {
    ...(card.finalBlockSettings ?? {}),
    memories: enabled
  };
  const currentMessageSettings: FinalCardMessageSettings = card.finalMessageSettings ?? {
    layoutMode: "grid-2",
    mediaLayout: "portrait",
    mediaSlots: [],
    mediaAssetIds: [],
    showAllLink: true
  };
  const messageSlots = currentMessageSettings.layoutMode === "column-media"
    ? getActiveMessageSlots(currentMessageSettings.mediaLayout)
    : [];
  const finalMessageSettings: FinalCardMessageSettings = {
    ...currentMessageSettings,
    mediaSlots: messageSlots,
    mediaAssetIds: getAssetsForSlots(assets, messageSlots).map((asset) => asset.id)
  };
  const memorySlots = enabled ? MEMORY_MEDIA_SLOTS : [];
  const finalMemorySettings: FinalCardMemorySettings = {
    ...(card.finalMemorySettings ?? {
      title: "Моменты",
      description: "Фото, которые хочется сохранить",
      mediaSlots: [],
      mediaAssetIds: [],
      photoCount: 3
    }),
    mediaSlots: memorySlots,
    mediaAssetIds: getAssetsForSlots(assets, memorySlots).map((asset) => asset.id),
    photoCount: 3
  };
  const updated = await updateCardFinalPresentationSettings(
    card.id,
    card.templateId,
    finalBlockSettings,
    card.finalBlockOrder ?? managedBlockIds,
    finalMessageSettings,
    card.finalMainGreetingSettings ?? { contributionId: null },
    finalMemorySettings
  );
  if (!updated) return { ok: false, message: enabled ? "Не удалось добавить блок «Моменты». Попробуйте ещё раз." : "Не удалось отключить блок «Моменты». Попробуйте ещё раз." };
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  logger.info(enabled ? "manage.card_moments_enabled_from_photos" : "manage.card_moments_disabled", "Moments block visibility updated", { cardId: card.id, enabled });
  return { ok: true, message: enabled ? "Блок «Моменты» добавлен в открытку." : "Блок «Моменты» отключён." };
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
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Открытка недоступна для редактирования." };
  }

  const currentAssets = await listCardMediaAssetsByCardId(card.id);
  const currentAsset = currentAssets.find((item) => item.id === assetId);
  if (!currentAsset) {
    return { ok: false, message: "Фото не найдено." };
  }

  const deleted = await deleteCardMediaAsset(assetId);
  if (!deleted) return { ok: false, message: "Фото не найдено." };

  await syncCardPhotoSettings(card, currentAssets.filter((item) => item.id !== assetId));

  logger.info("manage.card_media_deleted", "Card media deleted by organizer", {
    cardId: card.id,
    assetId: deleted.id,
    slot: deleted.slot
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  return { ok: true, message: "Фото удалено." };
}

export async function saveBestQuoteSelectionAction(
  manageToken: string,
  selectedQuotes: string[]
): Promise<{ ok: boolean; message: string; quotes: string[] }> {
  const card = await getCardDraftByManageToken(manageToken);
  if (!card) return { ok: false, message: "Секретная ссылка управления больше не актуальна.", quotes: [] };

  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Открытка недоступна для редактирования.", quotes: [] };
  }

  const selected = [...new Set(selectedQuotes.map((quote) => quote.trim()).filter(Boolean))];
  if (selected.length !== 3) return { ok: false, message: "Выберите ровно три фразы.", quotes: [] };

  const insight = await getAiCardInsight(card.id, "quotes");
  if (!insight || insight.items.length < 3) return { ok: false, message: "Сначала подготовьте варианты фраз.", quotes: [] };

  const candidateByText = new Map(insight.items.map((item) => [item.text, item]));
  if (selected.some((quote) => !candidateByText.has(quote))) {
    return { ok: false, message: "Можно выбрать только варианты, подготовленные для этой открытки.", quotes: [] };
  }

  const selectedItems = selected.map((quote) => candidateByText.get(quote)!);
  await saveAiCardQuoteSelection({
    cardId: card.id,
    items: selectedItems,
    sourceFingerprint: insight.sourceFingerprint,
    updatedAt: new Date().toISOString()
  });
  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  return { ok: true, message: "Выбранные фразы сохранены для финальной открытки.", quotes: selectedItems.map((item) => item.text) };
}

export async function generateBestQuotesAction(
  manageToken: string
): Promise<{ ok: boolean; message: string; quotes: string[]; usage: import("@/lib/ai/types").AiUsage }> {
  const card = await getCardDraftByManageToken(manageToken);

  if (!card) {
    return { ok: false, message: "Секретная ссылка управления больше не актуальна.", quotes: [], usage: { used: 0, limit: 0, remaining: 0 } };
  }
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Открытка недоступна для редактирования.", quotes: [], usage: { used: 0, limit: 0, remaining: 0 } };
  }

  const contributions = await listContributionsByCardId(card.id);
  if (!hasEnoughMeaningfulQuoteSources(contributions)) {
    logger.info("ai.best_quotes_skipped", "Best quote generation skipped before provider call", {
      cardId: card.id,
      classification: "content_insufficient"
    });
    return {
      ok: false,
      message: contributions.length < BEST_QUOTE_MIN_CONTRIBUTION_COUNT
        ? `Для подбора лучших фраз нужно минимум ${BEST_QUOTE_MIN_CONTRIBUTION_COUNT} активных поздравлений.`
        : "В поздравлениях пока недостаточно содержательных самостоятельных фраз. Добавьте более личные воспоминания, благодарности или конкретные тёплые слова — тогда мы сможем выбрать три сильные цитаты.",
      quotes: [],
      usage: await getAiUsageSummary(card.id)
    };
  }
  let result: Awaited<ReturnType<typeof generateBestQuotes>>;
  try {
    result = await generateBestQuotes({
      cardId: card.id,
      recipientName: card.recipientName,
      occasionText: card.occasionText,
      contributions
    });
  } catch (error) {
    const classification =
      error instanceof AiError && error.code === "LIMIT_REACHED"
        ? "limit_reached"
        : error instanceof AiError && ["PROVIDER_CONFIG", "PROVIDER_UNAVAILABLE"].includes(error.code)
          ? "provider_unavailable"
          : error instanceof AiError && ["AI_VALIDATION_FAILED", "INVALID_PROVIDER_RESPONSE"].includes(error.code)
            ? "invalid_result"
            : "internal_error";
    await reportCriticalError("ai", error, {
      cardId: card.id,
      operation: "best_quotes",
      classification
    });
    const usage = await getAiUsageSummary(card.id);
    return {
      ok: false,
      message:
        classification === "provider_unavailable"
          ? "Не удалось связаться с AI. Попробуйте ещё раз немного позже."
          : classification === "limit_reached"
            ? "Лимит AI исчерпан. Проверьте количество оставшихся попыток."
            : classification === "invalid_result"
              ? "Из этих поздравлений пока не удалось выбрать три самостоятельные фразы. Попробуйте после добавления более содержательных текстов."
              : "Не удалось подготовить фразы. Попробуйте ещё раз немного позже.",
      quotes: [],
      usage
    };
  }

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
  try {
    await assertManageContentEditable(manageToken);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Открытка недоступна для редактирования.", qualities: [], usage: { used: 0, limit: 0, remaining: 0 } };
  }

  const contributions = await listContributionsByCardId(card.id);
  let result: Awaited<ReturnType<typeof generateQualities>>;
  try {
    result = await generateQualities({
      cardId: card.id,
      recipientName: card.recipientName,
      occasionText: card.occasionText,
      contributions
    });
  } catch (error) {
    const errorId = await reportCriticalError("ai", error, { cardId: card.id, operation: "qualities" });
    return {
      ok: false,
      message: `Не удалось определить качества. Попробуйте ещё раз. Если ошибка повторится, сообщите код: ${errorId}.`,
      qualities: [],
      usage: await getAiUsageSummary(card.id)
    };
  }

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);

  return {
    ok: true,
    message: "Качества обновлены.",
    qualities: result.insight.items.map((item) => item.text),
    usage: result.usage
  };
}
