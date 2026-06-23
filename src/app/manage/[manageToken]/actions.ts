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
import { getGiftPath, getJoinPath, getManagePath } from "@/lib/routes/card-links";

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

  const contribution = await createContribution(validation.data);
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

  if (!validateLength(fields.occasionText, 2, 120)) {
    return cardBasicsError("Коротко опишите повод или контекст поздравления.", fields);
  }

  if (!validateLength(fields.organizerName, 2, 80)) {
    return cardBasicsError("Укажите имя организатора длиной от 2 до 80 символов.", fields);
  }

  if (fields.organizerEmail && !isValidEmail(fields.organizerEmail)) {
    return cardBasicsError("Введите корректный email организатора или оставьте поле пустым.", fields);
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

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);

  return { ok: true, message: "Основа открытки обновлена.", fields };
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

    const savedFile = await saveCardMediaFile({ cardId: card.id, slot, file });
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

    await upsertCardMediaAsset(asset);

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

  const updated = await updateCardMediaAssetCaption(existingAssetId, captionTitle, captionSubtitle);
  if (!updated || updated.cardId !== card.id) {
    return { ok: false, message: "Не удалось обновить подпись к фото." };
  }

  logger.info("manage.card_media_caption_updated", "Card media caption updated by organizer", {
    cardId: card.id,
    slot: updated.slot,
    assetId: updated.id
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);
  return { ok: true, message: "Подпись к фото обновлена." };
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
