import { randomUUID } from "node:crypto";
import { getCardDraftById, listCardMediaAssetsByCardId, listContributionsByCardId } from "@/lib/cards/repository";
import { getGiftLifecycleByFinalSlug } from "@/lib/cards/lifecycle-repository";
import { getGiftPath } from "@/lib/routes/card-links";
import { getAiCardInsight } from "@/lib/ai/repository";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";
import { dispatchTemplateRenderer, type TemplateRendererDispatch } from "@/lib/templates/dispatcher";
import { createPublicSharePhotoDerivative, deletePublicSharePhotoDerivative } from "./media-storage";
import { activatePublicShare, createPublicShare, getAccessiblePublicShareByTokenHash, getActivePublicShareByCardId, getPublicShareDraftOrActiveByCardId, getPublicShareById, getPublicSharePhoto, hasRevokedPublicShareByCardId, listPublicSharePhotos, replacePublicSharePhotos, revokePublicShare, updatePublicShare } from "./repository";
import { createPublicShareToken, hashPublicShareToken } from "./tokens";
import { buildUniversalPublicSharePayload, buildUniversalPublicViewModel, toUniversalPhotoCrop } from "./universal";
import type { PublicCardShare, PublicCardSharePhoto, PublicShareEditorInput, PublicSharePayload } from "./types";
import type { CardDraft, CardMediaAsset, Contribution } from "@/lib/cards/types";

export const PUBLIC_PHOTO_CONSENT_VERSION = "public-photo-consent-v1";
const publicSharePhotoSlots = new Set(["landscape-a", "landscape-b", "landscape-c", "memory-a", "memory-b", "memory-c"]);
const PUBLIC_SHARE_PHOTO_LIMIT = 3;

const clean = (value: string | null | undefined, max: number) => value?.trim().slice(0, max) || null;
const firstName = (value: string) => value.trim().split(/\s+/)[0]?.slice(0, 60) || null;
const getFinalCardPhotoCount = (
  card: Parameters<typeof buildFinalCardViewModel>[0],
  contributions: Parameters<typeof buildFinalCardViewModel>[1],
  mediaAssets: Parameters<typeof buildFinalCardViewModel>[2]
) => {
  const model = buildFinalCardViewModel(card, contributions, mediaAssets);
  return new Set([
    ...model.messageMediaAssets.map((asset) => asset.id),
    ...model.memoryMediaAssets.map((asset) => asset.id)
  ]).size;
};

const getRendererDispatch = (card: CardDraft) => card.templateId
  ? dispatchTemplateRenderer(String(card.templateId))
  : null;

const getPublicPhotoCount = (
  dispatch: TemplateRendererDispatch,
  card: CardDraft,
  contributions: Contribution[],
  mediaAssets: CardMediaAsset[]
) => dispatch.kind === "legacy"
  ? getFinalCardPhotoCount(card, contributions, mediaAssets)
  : new Set(mediaAssets.map((asset) => asset.id)).size;

const buildUniversalPayload = ({
  token,
  previewFinalSlug,
  dispatch,
  card,
  share,
  contributions,
  photos,
  mediaAssets,
  fullCardPhotoCount
}: {
  token?: string;
  previewFinalSlug?: string;
  dispatch: Extract<TemplateRendererDispatch, { kind: "universal-v1" }>;
  card: CardDraft;
  share: PublicCardShare;
  contributions: Contribution[];
  photos: PublicCardSharePhoto[];
  mediaAssets: CardMediaAsset[];
  fullCardPhotoCount: number;
}) => {
  const assetById = new Map(mediaAssets.map((asset) => [asset.id, asset]));
  return buildUniversalPublicSharePayload({
    templateId: dispatch.registration.id,
    displayName: share.displayName || firstName(card.recipientName) || card.recipientName,
    headlinePreset: share.headlinePreset,
    showOccasion: share.showOccasion,
    showEventDate: share.showEventDate,
    showGreetingCount: share.showGreetingCount,
    showPhotoCount: share.showPhotoCount,
    occasionText: card.occasionText,
    eventDate: card.eventDate,
    fromLabel: card.fromLabel,
    greetingCount: contributions.length,
    photoCount: fullCardPhotoCount,
    qualities: share.publicQualities.map((item) => item.text),
    phrases: share.publicPhrases.map((item) => item.text),
    photos: photos.flatMap((photo) => {
      const asset = assetById.get(photo.cardMediaAssetId);
      if (!asset || !publicSharePhotoSlots.has(asset.slot)) return [];
      const url = token
        ? `/share/${encodeURIComponent(token)}/photo/${photo.id}`
        : `/gift/${encodeURIComponent(previewFinalSlug ?? "")}/share/preview/photo/${photo.id}`;
      return [{
        id: photo.id,
        url,
        width: asset.imageWidth ?? 1600,
        height: asset.imageHeight ?? 1200,
        caption: photo.publicCaption || asset.captionSubtitle || asset.captionTitle,
        crop: toUniversalPhotoCrop(asset)
      }];
    })
  });
};

const validateInput = (input: PublicShareEditorInput) => {
  if (input.publicQualities.length > 5) throw new Error("Можно показать не более пяти качеств.");
  if (input.publicPhrases.length !== 3) throw new Error("Выберите ровно три тёплые фразы.");
  if (input.photoAssetIds.length > PUBLIC_SHARE_PHOTO_LIMIT) throw new Error("Можно показать не более трёх фотографий.");
  if (input.photoAssetIds.length > 0 && !input.photoConsentAccepted) throw new Error("Подтвердите право на публичное использование выбранных фотографий.");
};

const normalizeInput = (input: PublicShareEditorInput): PublicShareEditorInput => ({
  ...input,
  displayName: clean(input.displayName, 60),
  publicSummary: clean(input.publicSummary, 560),
  publicQualities: input.publicQualities.slice(0, 5).map((item) => ({ id: item.id || randomUUID(), text: clean(item.text, 45) || "" })).filter((item) => item.text),
  publicPhrases: input.publicPhrases.slice(0, 3).map((item) => ({ id: item.id || randomUUID(), text: clean(item.text, 180) || "" })).filter((item) => item.text),
  photoAssetIds: [...new Set(input.photoAssetIds)].slice(0, PUBLIC_SHARE_PHOTO_LIMIT)
});

export const getPublicShareEditor = async (finalSlug: string) => {
  const lifecycle = await getGiftLifecycleByFinalSlug(finalSlug);
  if (!lifecycle) return null;
  const card = await getCardDraftById(lifecycle.id);
  if (!card) return null;
  const share = await getPublicShareDraftOrActiveByCardId(card.id);
  const [allPhotos, mediaAssets, contributions, quotesInsight, qualitiesInsight, wasRevoked] = await Promise.all([
    share ? listPublicSharePhotos(share.id) : Promise.resolve([]),
    listCardMediaAssetsByCardId(card.id),
    listContributionsByCardId(card.id),
    getAiCardInsight(card.id, "quotes"),
    getAiCardInsight(card.id, "qualities"),
    share ? Promise.resolve(false) : hasRevokedPublicShareByCardId(card.id)
  ]);
  const dispatch = getRendererDispatch(card);
  if (!dispatch) return null;
  const finalCard = dispatch.kind === "legacy" ? buildFinalCardViewModel(card, contributions, mediaAssets, {
    qualities: qualitiesInsight?.items.map((item) => item.text)
  }) : null;
  const hasMomentsBlock = dispatch.kind === "universal-v1"
    ? dispatch.registration.profile.public.blocks.includes("memories")
    : finalCard!.blocks.some((block) => block.id === "memories");
  const publicMediaAssets = hasMomentsBlock ? mediaAssets.filter((asset) => publicSharePhotoSlots.has(asset.slot)) : [];
  const publicMediaAssetIds = new Set(publicMediaAssets.map((asset) => asset.id));
  const photos = allPhotos.filter((photo) => publicMediaAssetIds.has(photo.cardMediaAssetId));
  const phraseCandidates = quotesInsight?.items.map((item) => item.text).slice(0, 6) ?? [];
  const qualityTexts = dispatch.kind === "legacy"
    ? finalCard!.qualities
    : qualitiesInsight?.items.map((item) => item.text).slice(0, 5) ?? [];
  const publicQualities = qualityTexts.map((text, index) => ({ id: `quality-${index}`, text }));
  return { card, share, photos, mediaAssets: publicMediaAssets, phraseCandidates, publicQualities, wasRevoked, publicSharePath: share?.status === "ACTIVE" ? getPublicSharePath(createPublicShareToken(share.id)) : null, defaultDisplayName: firstName(card.recipientName), hasEventDate: Boolean(card.eventDate), requiresThreePhotos: dispatch.kind === "universal-v1" };
};

export const savePublicShare = async (finalSlug: string, submitted: PublicShareEditorInput) => {
  const editor = await getPublicShareEditor(finalSlug);
  if (!editor) throw new Error("Публичная версия доступна только для переданной открытки с действующим доступом.");
  validateInput(submitted);
  const input = normalizeInput(submitted);
  if (editor.requiresThreePhotos && input.photoAssetIds.length !== 0 && input.photoAssetIds.length !== 3) {
    throw new Error("Для блока «Моменты» выберите ровно три фотографии или не публикуйте ни одной.");
  }
  const allowedPhrases = new Set(editor.phraseCandidates);
  if (input.publicPhrases.some((phrase) => !allowedPhrases.has(phrase.text))) {
    throw new Error("Можно выбрать только варианты из раздела «Лучшие фразы».");
  }
  const createdShareId = editor.share ? null : randomUUID();
  const dispatch = getRendererDispatch(editor.card);
  if (!dispatch) throw new Error("Шаблон публичной версии не зарегистрирован.");
  const share = editor.share ?? await createPublicShare({ id: createdShareId!, cardId: editor.card.id, tokenHash: null, displayName: editor.defaultDisplayName, payloadVersion: dispatch.kind === "universal-v1" ? 2 : 1 });
  const nextShare: PublicCardShare = {
    ...share, payloadVersion: dispatch.kind === "universal-v1" ? 2 : 1, displayName: input.displayName, headlinePreset: input.headlinePreset, showOccasion: input.showOccasion, showEventDate: input.showEventDate,
    showGreetingCount: input.showGreetingCount, showPhotoCount: input.showPhotoCount,
    publicSummary: null, publicQualities: editor.publicQualities, publicPhrases: input.publicPhrases,
    photoConsentVersion: input.photoAssetIds.length ? PUBLIC_PHOTO_CONSENT_VERSION : null,
    photoConsentAcceptedAt: input.photoAssetIds.length ? new Date().toISOString() : null
  };
  const allowedAssets = new Map(editor.mediaAssets.map((asset) => [asset.id, asset]));
  const selectedAssets = input.photoAssetIds.map((id) => allowedAssets.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (selectedAssets.length !== input.photoAssetIds.length) throw new Error("Одна из выбранных фотографий больше недоступна.");
  const existingByAssetId = new Map(editor.photos.map((photo) => [photo.cardMediaAssetId, photo]));
  const publicCaptionLimit = dispatch.kind === "universal-v1" ? 45 : 120;
  const createdPaths: string[] = [];
  try {
    const photoRows = [];
    for (const [sortOrder, asset] of selectedAssets.entries()) {
      const existing = existingByAssetId.get(asset.id);
      if (existing) {
        photoRows.push({ ...existing, publicShareId: share.id, sortOrder, publicCaption: clean(input.photoCaptions[asset.id], publicCaptionLimit) || "" });
      } else {
        const derivative = await createPublicSharePhotoDerivative({
          publicShareId: share.id,
          sourceStoragePath: asset.storagePath,
          sourceFileName: asset.fileName,
          mimeType: asset.mimeType,
          normalizeOrientation: dispatch.kind === "universal-v1"
        });
        createdPaths.push(derivative.storagePath);
        photoRows.push({ publicShareId: share.id, cardMediaAssetId: asset.id, ...derivative, mimeType: asset.mimeType, sortOrder, publicCaption: clean(input.photoCaptions[asset.id], publicCaptionLimit) || "" });
      }
    }
    const [savedShare] = await Promise.all([updatePublicShare(nextShare), replacePublicSharePhotos(share.id, photoRows)]);
    if (!savedShare) throw new Error("Не удалось сохранить публичную версию.");
    const retained = new Set(photoRows.map((photo) => photo.storagePath));
    await Promise.all(editor.photos.filter((photo) => !retained.has(photo.storagePath)).map((photo) => deletePublicSharePhotoDerivative(photo.storagePath)));
    return { share: savedShare, token: savedShare.tokenHash ? createPublicShareToken(savedShare.id) : null };
  } catch (error) {
    await Promise.all(createdPaths.map(deletePublicSharePhotoDerivative));
    throw error;
  }
};

export const revokePublicShareForFinalSlug = async (finalSlug: string) => {
  const editor = await getPublicShareEditor(finalSlug);
  if (!editor?.share) return null;
  const [revoked] = await Promise.all([revokePublicShare(editor.share.id), ...editor.photos.map((photo) => deletePublicSharePhotoDerivative(photo.storagePath))]);
  return revoked;
};

export const publishPublicShareForFinalSlug = async (finalSlug: string) => {
  const editor = await getPublicShareEditor(finalSlug);
  if (!editor?.share) throw new Error("Сначала сохраните настройки публичной версии.");
  if (editor.share.status === "ACTIVE") return { share: editor.share, token: createPublicShareToken(editor.share.id) };
  if (editor.publicQualities.length === 0) {
    throw new Error("Перед публикацией сформируйте качества в разделе «За что меня ценят» финальной открытки.");
  }
  if (editor.share.publicPhrases.length !== 3) throw new Error("Для публикации выберите ровно три тёплые фразы.");
  const token = createPublicShareToken(editor.share.id);
  const share = await activatePublicShare(editor.share.id, hashPublicShareToken(token));
  if (!share) throw new Error("Не удалось опубликовать публичную версию.");
  return { share, token };
};

export const revokePublicShareForCardId = async (cardId: string) => {
  const share = await getActivePublicShareByCardId(cardId);
  if (!share) return null;
  const photos = await listPublicSharePhotos(share.id);
  const [revoked] = await Promise.all([revokePublicShare(share.id), ...photos.map((photo) => deletePublicSharePhotoDerivative(photo.storagePath))]);
  return revoked;
};

export const getPublicSharePayload = async (token: string): Promise<PublicSharePayload | null> => {
  const share = await getAccessiblePublicShareByTokenHash(hashPublicShareToken(token));
  if (!share) return null;
  const card = await getCardDraftById(share.cardId);
  if (!card) return null;
  const dispatch = getRendererDispatch(card);
  if (!dispatch) return null;
  const [photos, contributions, allMediaAssets] = await Promise.all([listPublicSharePhotos(share.id), listContributionsByCardId(card.id), listCardMediaAssetsByCardId(card.id)]);
  // Paper exports should show the same total as the public card. Route keeps
  // its established export counter unchanged while its layout remains frozen.
  const photoCount = dispatch.kind === "legacy" && card.templateId === "paper-birthday" ? getFinalCardPhotoCount(card, contributions, allMediaAssets) : allMediaAssets.length;
  if (dispatch.kind === "universal-v1") {
    return buildUniversalPayload({ token, dispatch, card, share, contributions, photos, mediaAssets: allMediaAssets, fullCardPhotoCount: getPublicPhotoCount(dispatch, card, contributions, allMediaAssets) });
  }
  return {
    version: 1,
    share: { displayName: share.displayName, headlinePreset: share.headlinePreset, showOccasion: share.showOccasion, showGreetingCount: share.showGreetingCount, showPhotoCount: share.showPhotoCount },
    card: { templateId: dispatch.registration.id, occasionText: share.showOccasion ? card.occasionText : null, fromLabel: card.fromLabel, greetingCount: share.showGreetingCount ? contributions.length : 0, photoCount: share.showPhotoCount ? photoCount : 0 },
    summary: share.publicSummary, qualities: share.publicQualities.map((item) => item.text), phrases: share.publicPhrases.map((item) => item.text),
    photos: photos.map((photo) => ({ id: photo.id, url: `/share/${encodeURIComponent(token)}/photo/${photo.id}`, caption: photo.publicCaption }))
  };
};

export const getPublicSharePresentation = async (token: string) => {
  const share = await getAccessiblePublicShareByTokenHash(hashPublicShareToken(token));
  if (!share) return null;
  const card = await getCardDraftById(share.cardId);
  if (!card) return null;
  const dispatch = getRendererDispatch(card);
  if (!dispatch) return null;
  const [photos, contributions, mediaAssets] = await Promise.all([
    listPublicSharePhotos(share.id),
    listContributionsByCardId(card.id),
    listCardMediaAssetsByCardId(card.id)
  ]);
  const assetById = new Map(mediaAssets.map((asset) => [asset.id, asset]));
  const publicMediaAssets = photos.flatMap((photo) => {
    const asset = assetById.get(photo.cardMediaAssetId);
    if (!asset || !publicSharePhotoSlots.has(asset.slot)) return [];
    const caption = photo.publicCaption || asset.captionSubtitle || asset.captionTitle;
    return [{
      ...asset,
      publicUrl: `/share/${encodeURIComponent(token)}/photo/${photo.id}`,
      captionTitle: caption,
      captionSubtitle: caption
    }];
  });
  const fullCardPhotoCount = getPublicPhotoCount(dispatch, card, contributions, mediaAssets);
  if (dispatch.kind === "universal-v1") {
    const payload = buildUniversalPayload({ token, dispatch, card, share, contributions, photos, mediaAssets, fullCardPhotoCount });
    return {
      kind: "universal-v1" as const,
      dispatch,
      publicName: share.showPublicName ? share.displayName : null,
      model: buildUniversalPublicViewModel(payload, dispatch.registration.profile),
      greetingCount: share.showGreetingCount ? contributions.length : null,
      photoCount: share.showPhotoCount ? mediaAssets.length : null
    };
  }
  const baseModel = buildFinalCardViewModel(card, contributions, publicMediaAssets, {
    qualities: share.publicQualities.map((item) => item.text),
    quotes: share.publicPhrases.map((item) => item.text)
  });
  const publicBlocks = baseModel.blocks.filter((block) => ["hero", "qualities", "quotes"].includes(block.id) || (block.id === "memories" && publicMediaAssets.length > 0));
  return {
    kind: "legacy" as const,
    dispatch,
    publicName: share.showPublicName ? share.displayName : null,
    model: {
      ...baseModel,
      recipientName: share.displayName || firstName(card.recipientName) || card.recipientName,
      occasionLabel: share.showOccasion ? card.occasionText : "",
      participantCount: share.showGreetingCount ? contributions.length : 0,
      publicPhotoCount: share.showPhotoCount && fullCardPhotoCount > 0 ? fullCardPhotoCount : null,
      publicFullCardHasPhotos: fullCardPhotoCount > 0,
      qualities: share.publicQualities.map((item) => item.text),
      quotes: share.publicPhrases.map((item) => item.text),
      mediaAssets: publicMediaAssets,
      messageMediaAssets: [],
      memoryMediaAssets: publicMediaAssets,
      blocks: publicBlocks
    },
    greetingCount: share.showGreetingCount ? contributions.length : null,
    photoCount: share.showPhotoCount ? mediaAssets.length : null
  };
};

/**
 * Builds the same public-card model as the live share, but resolves only the
 * current owner's draft and uses a private preview-photo route.  It never
 * exposes a public token or original media URL to the preview page.
 */
export const getPublicShareDraftPreviewPresentation = async (finalSlug: string) => {
  const editor = await getPublicShareEditor(finalSlug);
  if (!editor?.share) return null;

  const { card, share } = editor;
  const dispatch = getRendererDispatch(card);
  if (!dispatch) return null;
  const contributions = await listContributionsByCardId(card.id);
  const assetById = new Map(editor.mediaAssets.map((asset) => [asset.id, asset]));
  const publicMediaAssets = editor.photos.flatMap((photo) => {
    const asset = assetById.get(photo.cardMediaAssetId);
    if (!asset || !publicSharePhotoSlots.has(asset.slot)) return [];
    const caption = photo.publicCaption || asset.captionSubtitle || asset.captionTitle;
    return [{
      ...asset,
      publicUrl: `/gift/${encodeURIComponent(finalSlug)}/share/preview/photo/${photo.id}`,
      captionTitle: caption,
      captionSubtitle: caption
    }];
  });
  const fullCardPhotoCount = getPublicPhotoCount(dispatch, card, contributions, editor.mediaAssets);
  if (dispatch.kind === "universal-v1") {
    const payload = buildUniversalPayload({ previewFinalSlug: finalSlug, dispatch, card, share, contributions, photos: editor.photos, mediaAssets: editor.mediaAssets, fullCardPhotoCount });
    return {
      kind: "universal-v1" as const,
      dispatch,
      publicName: share.showPublicName ? share.displayName : null,
      model: buildUniversalPublicViewModel(payload, dispatch.registration.profile)
    };
  }
  const baseModel = buildFinalCardViewModel(card, contributions, publicMediaAssets, {
    qualities: share.publicQualities.map((item) => item.text),
    quotes: share.publicPhrases.map((item) => item.text)
  });
  const publicBlocks = baseModel.blocks.filter((block) => ["hero", "qualities", "quotes"].includes(block.id) || (block.id === "memories" && publicMediaAssets.length > 0));

  return {
    kind: "legacy" as const,
    dispatch,
    publicName: share.showPublicName ? share.displayName : null,
    model: {
      ...baseModel,
      // FinalCard does not use this field in public modes. Keep the private
      // route credential out of the rendered preview model regardless.
      finalSlug: "",
      recipientName: share.displayName || firstName(card.recipientName) || card.recipientName,
      occasionLabel: share.showOccasion ? card.occasionText : "",
      participantCount: share.showGreetingCount ? contributions.length : 0,
      publicPhotoCount: share.showPhotoCount && fullCardPhotoCount > 0 ? fullCardPhotoCount : null,
      publicFullCardHasPhotos: fullCardPhotoCount > 0,
      qualities: share.publicQualities.map((item) => item.text),
      quotes: share.publicPhrases.map((item) => item.text),
      mediaAssets: publicMediaAssets,
      messageMediaAssets: [],
      memoryMediaAssets: publicMediaAssets,
      blocks: publicBlocks
    }
  };
};

export const getPublicSharePhotoForToken = async (token: string, photoId: string) => {
  const share = await getAccessiblePublicShareByTokenHash(hashPublicShareToken(token));
  return share ? getPublicSharePhoto(share.id, photoId) : null;
};

export const getPublicSharePath = (token: string) => `/share/${encodeURIComponent(token)}`;
export const getPublicShareEditorPath = (finalSlug: string) => getGiftPath(finalSlug);
