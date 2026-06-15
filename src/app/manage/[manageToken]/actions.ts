"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
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
  updateCardFinalPresentationSettings,
  updateCardMediaAssetCaption,
  updateContributionMessage,
  updateContributionStatus,
  upsertCardMediaAsset
} from "@/lib/cards/repository";
import { buildCardMediaFileName, validateCardMediaFile } from "@/lib/cards/media";
import { isTemplateId } from "@/lib/cards/templates";
import type { CardDraft, CardMediaAsset, CardMediaSlot } from "@/lib/cards/types";
import { validateContributionMessage } from "@/lib/contributions/validation";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type {
  FinalCardBlockId,
  FinalCardBlockOrder,
  FinalCardBlockSettings,
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout,
  FinalCardMessageSettings,
  FinalCardOptionalBlockId
} from "@/lib/final-card/types";
import { logger } from "@/lib/logger";

const optionalBlockIds: FinalCardOptionalBlockId[] = ["summary", "qualities", "quotes", "ai-summary"];
const managedBlockIds: FinalCardBlockId[] = ["hero", "summary", "qualities", "messages", "quotes", "ai-summary", "closing"];
const messageLayoutModes: FinalCardMessageLayoutMode[] = ["grid-2", "carousel-1", "carousel-2", "column-media"];
const mediaLayouts: FinalCardMessageMediaLayout[] = ["portrait", "landscape-pair"];
const mediaSlots: CardMediaSlot[] = ["portrait", "landscape-a", "landscape-b"];

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validateLength = (value: string, min: number, max: number) => value.length >= min && value.length <= max;
const validateDate = (value: string) => value.length === 0 || !Number.isNaN(Date.parse(value));

const revalidateCardSurfaces = (manageToken: string, publicSlug: string, finalSlug: string) => {
  revalidatePath(`/manage/${manageToken}`);
  revalidatePath(`/card/${publicSlug}`);
  revalidatePath(`/gift/${finalSlug}`);
  revalidatePath(`/gift/${finalSlug}/messages`);
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
    revalidatePath(`/manage/${manageToken}`);
  }
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
    revalidatePath(`/manage/${manageToken}`);
  }
}

export async function updateCardBasicsAction(
  _prevState: { ok: boolean; message: string },
  formData: FormData
) {
  const manageToken = String(formData.get("manageToken") ?? "");

  if (!manageToken) {
    return { ok: false, message: "Не удалось сохранить основу открытки." };
  }

  const card = await getCardDraftByManageToken(manageToken);
  if (!card) {
    return { ok: false, message: "Секретная ссылка управления больше не актуальна." };
  }

  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const fromLabel = String(formData.get("fromLabel") ?? "").trim();
  const occasionText = String(formData.get("occasionText") ?? "").trim();
  const organizerName = String(formData.get("organizerName") ?? "").trim();
  const organizerEmail = String(formData.get("organizerEmail") ?? "").trim();
  const eventDateValue = String(formData.get("eventDate") ?? "").trim();
  const descriptionValue = String(formData.get("description") ?? "").trim();
  const occasionValue = (String(formData.get("occasion") ?? "").trim() || card.occasion) as CardDraft["occasion"];

  if (!validateLength(recipientName, 2, 80)) {
    return { ok: false, message: "Укажите имя получателя длиной от 2 до 80 символов." };
  }

  if (!validateLength(fromLabel, 2, 80)) {
    return { ok: false, message: "Укажите, от кого открытка, длиной от 2 до 80 символов." };
  }

  if (!validateLength(occasionText, 2, 120)) {
    return { ok: false, message: "Коротко опишите повод или контекст поздравления." };
  }

  if (!validateLength(organizerName, 2, 80)) {
    return { ok: false, message: "Укажите имя организатора длиной от 2 до 80 символов." };
  }

  if (!isValidEmail(organizerEmail)) {
    return { ok: false, message: "Введите корректный email организатора." };
  }

  if (!validateDate(eventDateValue)) {
    return { ok: false, message: "Дата события выглядит некорректно." };
  }

  if (descriptionValue && !validateLength(descriptionValue, 10, 300)) {
    return { ok: false, message: "Описание должно быть от 10 до 300 символов." };
  }

  const updated = await updateCardDraftBasics(card.id, {
    recipientName,
    fromLabel,
    occasion: occasionValue,
    occasionText,
    organizerName,
    organizerEmail,
    eventDate: eventDateValue || null,
    description: descriptionValue || null
  });

  if (!updated) {
    return { ok: false, message: "Не удалось обновить основу открытки." };
  }

  logger.info("manage.card_basics_updated", "Card basics updated by organizer", {
    cardId: card.id,
    occasion: occasionValue
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);

  return { ok: true, message: "Основа открытки обновлена." };
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
    showAllLink: visibleContributions.length > layoutProfile.cardsPerPage
  };

  const updated = await updateCardFinalPresentationSettings(
    card.id,
    templateId,
    finalBlockSettings,
    finalBlockOrder.length > 0 ? (finalBlockOrder as FinalCardBlockOrder) : card.finalBlockOrder,
    finalMessageSettings
  );
  if (!updated) {
    return { ok: false, message: "Не удалось сохранить состав финального экрана." };
  }

  logger.info("manage.final_presentation_settings_updated", "Final presentation settings updated by organizer", {
    cardId: card.id,
    templateId,
    finalBlockSettings,
    finalMessageSettings
  });

  revalidateCardSurfaces(manageToken, card.publicSlug, card.finalSlug);

  return { ok: true, message: "Настройки финального экрана обновлены." };
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

    const fileName = buildCardMediaFileName(slot, file.name, file.type);
    const absolutePath = join(process.cwd(), "public", "uploads", "cards", card.id, fileName);
    const publicUrl = `/uploads/cards/${card.id}/${fileName}`;
    const now = new Date().toISOString();

    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

    const asset: CardMediaAsset = {
      id: existingAssetId || randomUUID(),
      cardId: card.id,
      slot,
      publicUrl,
      storagePath: absolutePath,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      captionTitle,
      captionSubtitle,
      createdAt: now,
      updatedAt: now
    };

    const existingSlotAsset = (await listCardMediaAssetsByCardId(card.id)).find((item) => item.slot === slot);
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
