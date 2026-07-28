"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CardMediaAsset } from "@/lib/cards/types";
import type { PublicCardShare, PublicCardSharePhoto, PublicShareQuality } from "@/lib/public-shares/types";
import { publishPublicShareAction, revokePublicShareAction, savePublicShareAction, type PublicShareFormState } from "./public-share-actions";
import styles from "./public-share-panel.module.css";

type Props = {
  finalSlug: string;
  defaultDisplayName: string | null;
  share: PublicCardShare | null;
  photos: PublicCardSharePhoto[];
  mediaAssets: CardMediaAsset[];
  phraseCandidates: string[];
  publicQualities: PublicShareQuality[];
  wasRevoked: boolean;
  publicSharePath: string | null;
};

const initialState: PublicShareFormState = { ok: false, message: "" };

const headlineLabels: Record<string, string> = {
  GIFTED_CARD: "Мне подарили открытку",
  THANK_YOU: "Спасибо за этот подарок",
  LOOK_WHAT_I_GOT: "Посмотрите, что мне подарили",
};

const plural = (count: number, forms: [string, string, string]) => {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return forms[2];
  if (mod10 > 1 && mod10 < 5) return forms[1];
  if (mod10 === 1) return forms[0];
  return forms[2];
};

const defaultPublicCaption = (asset: CardMediaAsset, savedCaption: string | undefined) =>
  savedCaption || asset.captionTitle || asset.captionSubtitle || "";

export function PublicSharePanel({ finalSlug, defaultDisplayName, share, photos, mediaAssets, phraseCandidates, publicQualities, wasRevoked, publicSharePath }: Props) {
  const action = useMemo(() => savePublicShareAction.bind(null, finalSlug), [finalSlug]);
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isVisibilityPending, startVisibilityTransition] = useTransition();
  const [visibilityMessage, setVisibilityMessage] = useState("");
  const [displayName, setDisplayName] = useState(share?.displayName ?? defaultDisplayName ?? "");
  const [headlinePreset, setHeadlinePreset] = useState<string>(share?.headlinePreset ?? "GIFTED_CARD");
  const [showOccasion, setShowOccasion] = useState(share?.showOccasion ?? true);
  const [showGreetingCount, setShowGreetingCount] = useState(share?.showGreetingCount ?? true);
  const [showPhotoCount, setShowPhotoCount] = useState(share?.showPhotoCount ?? true);
  const [photoConsent, setPhotoConsent] = useState(photos.length > 0);
  const [selectedPhrases, setSelectedPhrases] = useState(() => {
    const savedSelection = share?.publicPhrases.map((phrase) => phrase.text).filter((phrase) => phraseCandidates.includes(phrase)) ?? [];
    return savedSelection.length === 3 ? savedSelection : phraseCandidates.slice(0, 3);
  });
  const [selectedPhotoIds, setSelectedPhotoIds] = useState(() => photos.map((photo) => photo.cardMediaAssetId));
  const [previewRequested, setPreviewRequested] = useState(false);
  const savedPhotoIdsKey = photos.map((photo) => photo.cardMediaAssetId).join(",");
  useEffect(() => {
    setSelectedPhotoIds(photos.map((photo) => photo.cardMediaAssetId));
  }, [savedPhotoIdsKey]);
  const togglePhrase = (phrase: string) => setSelectedPhrases((current) => current.includes(phrase) ? current.filter((item) => item !== phrase) : current.length === 3 ? current : [...current, phrase]);
  const togglePhoto = (photoId: string) => setSelectedPhotoIds((current) => current.includes(photoId) ? current.filter((id) => id !== photoId) : current.length === 6 ? current : [...current, photoId]);
  const changeVisibility = (operation: "publish" | "revoke") => {
    setVisibilityMessage("");
    startVisibilityTransition(async () => {
      const result = operation === "publish" ? await publishPublicShareAction(finalSlug) : await revokePublicShareAction(finalSlug);
      setVisibilityMessage(result.message);
      router.refresh();
    });
  };
  const openExactPreview = () => {
    setVisibilityMessage("");
    setPreviewRequested(true);
    formRef.current?.requestSubmit();
  };
  useEffect(() => {
    if (!previewRequested || pending) return;
    setPreviewRequested(false);
    if (state.ok) router.push(`/gift/${finalSlug}/share/preview`);
  }, [previewRequested, pending, state, finalSlug, router]);

  const selectedPhotoAssets = selectedPhotoIds
    .map((photoId) => mediaAssets.find((asset) => asset.id === photoId))
    .filter((asset): asset is CardMediaAsset => Boolean(asset));
  const visibleCounters = [
    showOccasion ? "Повод" : null,
    showGreetingCount ? "Количество поздравлений" : null,
    showPhotoCount ? "Количество фотографий" : null,
  ].filter((label): label is string => Boolean(label));

  return (
    <section className={styles.shell}>
      {!share && wasRevoked ? <p className={styles.statusRevoked}>Публичная версия снята с публикации. При желании создайте новую.</p> : null}
      <div className={styles.layout}>
        <form action={formAction} className={styles.form} ref={formRef}>
          <label>Публичное имя<input name="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} /></label>
          <label>Заголовок<select name="headlinePreset" value={headlinePreset} onChange={(event) => setHeadlinePreset(event.target.value)}><option value="GIFTED_CARD">Мне подарили открытку</option><option value="THANK_YOU">Спасибо за этот подарок</option><option value="LOOK_WHAT_I_GOT">Посмотрите, что мне подарили</option></select></label>
          <fieldset><legend>Показывать на публичной странице</legend><label><input type="checkbox" name="showOccasion" checked={showOccasion} onChange={(event) => setShowOccasion(event.target.checked)} /> Повод</label><label><input type="checkbox" name="showGreetingCount" checked={showGreetingCount} onChange={(event) => setShowGreetingCount(event.target.checked)} /> Количество поздравлений</label><label><input type="checkbox" name="showPhotoCount" checked={showPhotoCount} onChange={(event) => setShowPhotoCount(event.target.checked)} /> Количество фотографий</label></fieldset>
          <section className={styles.autoSection}><h3>За что меня ценят</h3><div className={styles.qualities}>{publicQualities.map((quality) => <span key={quality.id}>{quality.text}</span>)}</div></section>
          <fieldset className={styles.phraseFieldset}><legend>Лучшие фразы</legend><p>Выберите три фразы для публичной версии.</p><strong className={selectedPhrases.length === 3 ? styles.ready : styles.attention}>Выбрано: {selectedPhrases.length}/3</strong><div className={styles.phraseChoices}>{phraseCandidates.map((phrase, index) => <label className={`${styles.phraseChoice} ${selectedPhrases.includes(phrase) ? styles.phraseChoiceSelected : ""}`} key={phrase}><input type="checkbox" name="phraseText" value={phrase} checked={selectedPhrases.includes(phrase)} onChange={() => togglePhrase(phrase)} disabled={pending || (!selectedPhrases.includes(phrase) && selectedPhrases.length === 3)} /><span>{index < 3 ? "Выбрано организатором" : "Вариант"}</span><b>{phrase}</b></label>)}</div></fieldset>
          {mediaAssets.length > 0 ? <fieldset><legend>Публичные фотографии — до шести</legend><p>Выберите фото и при необходимости измените подписи.</p><strong className={styles.photoCount}>Выбрано: {selectedPhotoIds.length}/6</strong><div className={styles.photoGrid}>{mediaAssets.map((asset) => { const savedPhoto = photos.find((photo) => photo.cardMediaAssetId === asset.id); const isSelected = selectedPhotoIds.includes(asset.id); return <label className={styles.photo} key={asset.id}><input type="checkbox" name="photoAssetId" value={asset.id} checked={isSelected} onChange={() => togglePhoto(asset.id)} disabled={pending || (!isSelected && selectedPhotoIds.length === 6)} /><img src={asset.publicUrl} alt="Фото из открытки" /><span><input name={`caption:${asset.id}`} defaultValue={defaultPublicCaption(asset, savedPhoto?.publicCaption)} maxLength={120} placeholder="Короткая подпись" /></span></label>; })}</div><label className={styles.consent}><input type="checkbox" name="photoConsentAccepted" checked={photoConsent} onChange={(event) => setPhotoConsent(event.target.checked)} /> Подтверждаю право на публикацию выбранных фотографий.</label></fieldset> : null}
          {state.message ? <p className={state.ok ? styles.success : styles.error}>{state.message}</p> : null}
          {visibilityMessage ? <p className={visibilityMessage.includes("не удалось") ? styles.error : styles.success}>{visibilityMessage}</p> : null}
          {state.shareUrl ? <p className={styles.success}>Ссылка: <a href={state.shareUrl} target="_blank" rel="noreferrer">Открыть публичную версию</a></p> : null}
          <div className={styles.actions}><button type="submit" disabled={pending || selectedPhrases.length !== 3}>{pending ? "Сохраняем…" : share ? "Сохранить изменения" : "Создать черновик"}</button>{share ? <Link className={styles.preview} href={`/gift/${finalSlug}/share/preview`}>Предпросмотреть черновик</Link> : null}{share?.status === "ACTIVE" && publicSharePath ? <Link className={styles.preview} href={publicSharePath} target="_blank">Открыть публичную версию</Link> : null}{share?.status === "DRAFT" ? <button type="button" disabled={isVisibilityPending || selectedPhrases.length !== 3} onClick={() => changeVisibility("publish")}>{isVisibilityPending ? "Публикуем…" : "Опубликовать"}</button> : null}{share?.status === "ACTIVE" ? <button type="button" className={styles.revoke} disabled={isVisibilityPending} onClick={() => changeVisibility("revoke")}>{isVisibilityPending ? "Снимаем с публикации…" : "Снять с публикации"}</button> : null}</div>
        </form>
        <aside className={styles.summary} aria-label="Что будет опубликовано">
          <div>
            <h3 className={styles.summaryTitle}>Что будет опубликовано</h3>
            <p className={styles.summaryHint}>Только выбранные элементы появятся на публичной странице.</p>
          </div>
          <section className={styles.summaryBlock}>
            <h4>Имя на странице</h4>
            <p>{displayName.trim() || "—"}</p>
          </section>
          <section className={styles.summaryBlock}>
            <h4>Заголовок</h4>
            <p>{headlineLabels[headlinePreset] ?? headlineLabels.GIFTED_CARD}</p>
          </section>
          <section className={styles.summaryBlock}>
            <h4>Что показываем</h4>
            {visibleCounters.length > 0 ? (
              <ul className={styles.summaryList}>{visibleCounters.map((label) => <li key={label}><span aria-hidden="true" className={styles.summaryCheck}>✓</span>{label}</li>)}</ul>
            ) : <p className={styles.summaryMuted}>Все счётчики скрыты</p>}
          </section>
          <section className={styles.summaryBlock}>
            <h4>За что меня ценят</h4>
            <p>{publicQualities.length} {plural(publicQualities.length, ["качество", "качества", "качеств"])}</p>
          </section>
          <section className={styles.summaryBlock}>
            <h4>Особенно тёплые слова</h4>
            {selectedPhrases.length > 0 ? (
              <>
                <p>{selectedPhrases.length} {plural(selectedPhrases.length, ["фраза", "фразы", "фраз"])} в выбранном порядке</p>
                <ol className={styles.summaryPhrases}>{selectedPhrases.map((phrase) => <li key={phrase}>{phrase}</li>)}</ol>
              </>
            ) : <p className={styles.summaryMuted}>Фразы не выбраны</p>}
          </section>
          {mediaAssets.length > 0 ? (
            <section className={styles.summaryBlock}>
              <h4>Публичные фотографии</h4>
              <p>{selectedPhotoIds.length} из 6</p>
              {selectedPhotoAssets.length > 0 ? (
                <ol className={styles.summaryPhotos}>{selectedPhotoAssets.map((asset, index) => <li key={asset.id}><img src={asset.publicUrl} alt="" /><span aria-hidden="true">{index + 1}</span></li>)}</ol>
              ) : null}
            </section>
          ) : null}
          <section className={styles.summaryBlock}>
            <h4>Подтверждение</h4>
            <p className={photoConsent ? undefined : styles.summaryMuted}>{photoConsent ? "Право на публикацию подтверждено" : "Право на публикацию не подтверждено"}</p>
          </section>
          <div className={styles.summaryPreview}>
            <button type="button" onClick={openExactPreview} disabled={pending || selectedPhrases.length !== 3}>{pending && previewRequested ? "Сохраняем черновик…" : "Открыть точный предпросмотр"}</button>
            <p>Вы увидите открытку так, как её увидят другие.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
