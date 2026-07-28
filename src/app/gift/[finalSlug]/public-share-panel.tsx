"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
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
const defaultPublicCaption = (asset: CardMediaAsset, savedCaption: string | undefined) =>
  savedCaption || asset.captionTitle || asset.captionSubtitle || "";

export function PublicSharePanel({ finalSlug, defaultDisplayName, share, photos, mediaAssets, phraseCandidates, publicQualities, wasRevoked, publicSharePath }: Props) {
  const action = useMemo(() => savePublicShareAction.bind(null, finalSlug), [finalSlug]);
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  const [isVisibilityPending, startVisibilityTransition] = useTransition();
  const [visibilityMessage, setVisibilityMessage] = useState("");
  const [selectedPhrases, setSelectedPhrases] = useState(() => {
    const savedSelection = share?.publicPhrases.map((phrase) => phrase.text).filter((phrase) => phraseCandidates.includes(phrase)) ?? [];
    return savedSelection.length === 3 ? savedSelection : phraseCandidates.slice(0, 3);
  });
  const [selectedPhotoIds, setSelectedPhotoIds] = useState(() => photos.map((photo) => photo.cardMediaAssetId));
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

  return <section className={styles.shell}>
    <div className={styles.heading}><div><p>Публичная версия</p><h2>Похвастаться открыткой</h2><span>Личные поздравления и остальные фотографии останутся приватными.</span></div></div>
    {!share && wasRevoked ? <p className={styles.statusRevoked}>Публичная версия снята с публикации. При желании создайте новую.</p> : null}
    <form action={formAction} className={styles.form}>
      <label>Публичное имя<input name="displayName" defaultValue={share?.displayName ?? defaultDisplayName ?? ""} maxLength={60} /></label>
      <label>Заголовок<select name="headlinePreset" defaultValue={share?.headlinePreset ?? "GIFTED_CARD"}><option value="GIFTED_CARD">Мне подарили открытку</option><option value="THANK_YOU">Спасибо за этот подарок</option><option value="LOOK_WHAT_I_GOT">Посмотрите, что мне подарили</option></select></label>
      <fieldset><legend>Показывать на публичной странице</legend><label><input type="checkbox" name="showOccasion" defaultChecked={share?.showOccasion ?? true} /> Повод</label><label><input type="checkbox" name="showGreetingCount" defaultChecked={share?.showGreetingCount ?? true} /> Количество поздравлений</label><label><input type="checkbox" name="showPhotoCount" defaultChecked={share?.showPhotoCount ?? true} /> Количество фотографий</label></fieldset>
      <section className={styles.autoSection}><h3>За что меня ценят</h3><div className={styles.qualities}>{publicQualities.map((quality) => <span key={quality.id}>{quality.text}</span>)}</div></section>
      <fieldset className={styles.phraseFieldset}><legend>Лучшие фразы</legend><p>Выберите три фразы для публичной версии.</p><strong className={selectedPhrases.length === 3 ? styles.ready : styles.attention}>Выбрано: {selectedPhrases.length}/3</strong><div className={styles.phraseChoices}>{phraseCandidates.map((phrase, index) => <label className={`${styles.phraseChoice} ${selectedPhrases.includes(phrase) ? styles.phraseChoiceSelected : ""}`} key={phrase}><input type="checkbox" name="phraseText" value={phrase} checked={selectedPhrases.includes(phrase)} onChange={() => togglePhrase(phrase)} disabled={pending || (!selectedPhrases.includes(phrase) && selectedPhrases.length === 3)} /><span>{index < 3 ? "Выбрано организатором" : "Вариант"}</span><b>{phrase}</b></label>)}</div></fieldset>
      {mediaAssets.length > 0 ? <fieldset><legend>Публичные фотографии — до шести</legend><p>Выберите фото и при необходимости измените подписи.</p><strong className={styles.photoCount}>Выбрано: {selectedPhotoIds.length}/6</strong><div className={styles.photoGrid}>{mediaAssets.map((asset) => { const savedPhoto = photos.find((photo) => photo.cardMediaAssetId === asset.id); const isSelected = selectedPhotoIds.includes(asset.id); return <label className={styles.photo} key={asset.id}><input type="checkbox" name="photoAssetId" value={asset.id} checked={isSelected} onChange={() => togglePhoto(asset.id)} disabled={pending || (!isSelected && selectedPhotoIds.length === 6)} /><img src={asset.publicUrl} alt="Фото из открытки" /><span><input name={`caption:${asset.id}`} defaultValue={defaultPublicCaption(asset, savedPhoto?.publicCaption)} maxLength={120} placeholder="Короткая подпись" /></span></label>; })}</div><label className={styles.consent}><input type="checkbox" name="photoConsentAccepted" defaultChecked={photos.length > 0} /> Подтверждаю право на публикацию выбранных фотографий.</label></fieldset> : null}
      {state.message ? <p className={state.ok ? styles.success : styles.error}>{state.message}</p> : null}
      {visibilityMessage ? <p className={visibilityMessage.includes("не удалось") ? styles.error : styles.success}>{visibilityMessage}</p> : null}
      {state.shareUrl ? <p className={styles.success}>Ссылка: <a href={state.shareUrl} target="_blank" rel="noreferrer">Открыть публичную версию</a></p> : null}
      <div className={styles.actions}><button type="submit" disabled={pending || selectedPhrases.length !== 3}>{pending ? "Сохраняем…" : share ? "Сохранить изменения" : "Создать черновик"}</button>{share ? <Link className={styles.preview} href={`/gift/${finalSlug}/share/preview`}>Предпросмотреть черновик</Link> : null}{share?.status === "ACTIVE" && publicSharePath ? <Link className={styles.preview} href={publicSharePath} target="_blank">Открыть публичную версию</Link> : null}{share?.status === "DRAFT" ? <button type="button" disabled={isVisibilityPending || selectedPhrases.length !== 3} onClick={() => changeVisibility("publish")}>{isVisibilityPending ? "Публикуем…" : "Опубликовать"}</button> : null}{share?.status === "ACTIVE" ? <button type="button" className={styles.revoke} disabled={isVisibilityPending} onClick={() => changeVisibility("revoke")}>{isVisibilityPending ? "Снимаем с публикации…" : "Снять с публикации"}</button> : null}</div>
    </form>
  </section>;
}
