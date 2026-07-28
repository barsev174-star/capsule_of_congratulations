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
  const [captions, setCaptions] = useState<Record<string, string>>(() => Object.fromEntries(
    mediaAssets.map((asset) => [asset.id, defaultPublicCaption(asset, photos.find((photo) => photo.cardMediaAssetId === asset.id)?.publicCaption)])
  ));
  const [selectedPhrases, setSelectedPhrases] = useState(() => {
    const savedSelection = share?.publicPhrases.map((phrase) => phrase.text).filter((phrase) => phraseCandidates.includes(phrase)) ?? [];
    return savedSelection.length === 3 ? savedSelection : phraseCandidates.slice(0, 3);
  });
  const [selectedPhotoIds, setSelectedPhotoIds] = useState(() => photos.map((photo) => photo.cardMediaAssetId).slice(0, 3));
  const [previewRequested, setPreviewRequested] = useState(false);
  const [publishRequested, setPublishRequested] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const savedPhotoIdsKey = photos.map((photo) => photo.cardMediaAssetId).join(",");
  useEffect(() => {
    setSelectedPhotoIds(photos.map((photo) => photo.cardMediaAssetId).slice(0, 3));
  }, [savedPhotoIdsKey]);
  const togglePhrase = (phrase: string) => {
    if (pending) return;
    setSelectedPhrases((current) => current.includes(phrase) ? current.filter((item) => item !== phrase) : current.length === 3 ? current : [...current, phrase]);
  };
  const handlePhraseKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, phrase: string) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      togglePhrase(phrase);
    }
  };
  const togglePhoto = (photoId: string) => {
    if (pending) return;
    setSelectedPhotoIds((current) => current.includes(photoId) ? current.filter((id) => id !== photoId) : current.length === 3 ? current : [...current, photoId]);
  };
  const handlePhotoKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, photoId: string) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      togglePhoto(photoId);
    }
  };
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
  const startPublish = () => {
    setVisibilityMessage("");
    if (!share || hasUnsavedChanges) {
      setPublishRequested(true);
      formRef.current?.requestSubmit();
      return;
    }
    changeVisibility("publish");
  };
  useEffect(() => {
    if (!publishRequested || pending) return;
    setPublishRequested(false);
    if (state.ok) changeVisibility("publish");
  }, [publishRequested, pending, state]);
  useEffect(() => {
    if (!revokeDialogOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRevokeDialogOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [revokeDialogOpen]);

  const formSignature = useMemo(() => JSON.stringify({
    displayName: displayName.trim(),
    headlinePreset,
    showOccasion,
    showGreetingCount,
    showPhotoCount,
    photoConsent,
    phrases: selectedPhrases,
    photos: selectedPhotoIds,
    captions: selectedPhotoIds.map((photoId) => captions[photoId]?.trim() ?? ""),
  }), [displayName, headlinePreset, showOccasion, showGreetingCount, showPhotoCount, photoConsent, selectedPhrases, selectedPhotoIds, captions]);
  const [savedSignature, setSavedSignature] = useState(formSignature);
  const submittedSignatureRef = useRef(formSignature);
  useEffect(() => {
    if (!pending && state.ok) setSavedSignature(submittedSignatureRef.current);
  }, [pending, state]);

  const isActive = share?.status === "ACTIVE";
  const isDraft = share?.status === "DRAFT";
  const hasUnsavedChanges = formSignature !== savedSignature;
  const consentError = selectedPhotoIds.length > 0 && !photoConsent;
  const validationBlocked = pending || selectedPhrases.length !== 3 || consentError;
  const saveDisabled = validationBlocked || (share !== null && !hasUnsavedChanges);
  const publishPending = publishRequested || isVisibilityPending;
  const previewLabel = isActive ? "Посмотреть изменения" : "Посмотреть перед публикацией";
  const publicLinkLabel = hasUnsavedChanges ? "Открыть опубликованную страницу" : "Открыть публичную страницу";
  const saveStatusText = pending
    ? "Сохраняем…"
    : isVisibilityPending
      ? "Обновляем…"
      : isActive && hasUnsavedChanges
        ? "Есть неопубликованные изменения"
        : hasUnsavedChanges
          ? "Есть несохранённые изменения"
          : share
            ? "Все изменения сохранены"
            : "Черновик ещё не сохранён";

  const selectedPhotoAssets = selectedPhotoIds
    .map((photoId) => mediaAssets.find((asset) => asset.id === photoId))
    .filter((asset): asset is CardMediaAsset => Boolean(asset));
  const visibleCounters = [
    showOccasion ? "Повод" : null,
    showGreetingCount ? "Количество поздравлений" : null,
    showPhotoCount ? "Количество фотографий" : null,
  ].filter((label): label is string => Boolean(label));

  const publishButton = isDraft ? (
    <button type="button" className={styles.publishButton} disabled={publishPending || selectedPhrases.length !== 3 || consentError} onClick={startPublish}>
      {publishPending ? "Публикуем…" : "Опубликовать публичную страницу"}
    </button>
  ) : null;
  const revokeButton = isActive ? (
    <button type="button" className={styles.revoke} disabled={isVisibilityPending} onClick={() => setRevokeDialogOpen(true)}>
      {isVisibilityPending ? "Отключаем…" : "Отключить публичную страницу"}
    </button>
  ) : null;

  return (
    <section className={styles.shell}>
      {!share && wasRevoked ? <p className={styles.statusRevoked}>Публичная страница отключена. При желании создайте новую — у неё будет новая ссылка.</p> : null}
      <div className={styles.layout}>
        <form action={formAction} className={styles.form} ref={formRef} onSubmit={() => { submittedSignatureRef.current = formSignature; }}>
          <section className={styles.card} aria-labelledby="share-section-basics">
            <header className={styles.cardHeader}><span className={styles.cardNumber} aria-hidden="true">1</span><h3 id="share-section-basics">Основные сведения</h3></header>
            <div className={styles.fieldGrid}>
              <label>Публичное имя<input name="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} /><span className={styles.fieldHint}>Так вас увидят на публичной странице.</span></label>
              <label>Заголовок на странице<select name="headlinePreset" value={headlinePreset} onChange={(event) => setHeadlinePreset(event.target.value)}><option value="GIFTED_CARD">Мне подарили открытку</option><option value="THANK_YOU">Спасибо за этот подарок</option><option value="LOOK_WHAT_I_GOT">Посмотрите, что мне подарили</option></select><span className={styles.fieldHint}>Короткая фраза над открыткой.</span></label>
            </div>
            <div className={styles.counterGroup}>
              <p className={styles.counterGroupLabel}>Что показывать на публичной странице</p>
              <div className={styles.counterCards}>
                <label className={`${styles.counterCard} ${showOccasion ? styles.counterCardSelected : ""}`}>
                  <input className={styles.visuallyHidden} type="checkbox" name="showOccasion" checked={showOccasion} onChange={(event) => setShowOccasion(event.target.checked)} />
                  <span className={styles.counterIcon} aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-1.5 0-3-1.3-3-3s3-3 3 3c0-3 3-4.5 3-3s-1.5 3-3 3"/></svg></span>
                  <span>Повод</span>
                  <span className={styles.counterCheck} aria-hidden="true">✓</span>
                </label>
                <label className={`${styles.counterCard} ${showGreetingCount ? styles.counterCardSelected : ""}`}>
                  <input className={styles.visuallyHidden} type="checkbox" name="showGreetingCount" checked={showGreetingCount} onChange={(event) => setShowGreetingCount(event.target.checked)} />
                  <span className={styles.counterIcon} aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z"/></svg></span>
                  <span>Количество поздравлений</span>
                  <span className={styles.counterCheck} aria-hidden="true">✓</span>
                </label>
                <label className={`${styles.counterCard} ${showPhotoCount ? styles.counterCardSelected : ""}`}>
                  <input className={styles.visuallyHidden} type="checkbox" name="showPhotoCount" checked={showPhotoCount} onChange={(event) => setShowPhotoCount(event.target.checked)} />
                  <span className={styles.counterIcon} aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 3 3 4-4 4 4"/></svg></span>
                  <span>Количество фотографий</span>
                  <span className={styles.counterCheck} aria-hidden="true">✓</span>
                </label>
              </div>
            </div>
          </section>
          <section className={styles.card} aria-labelledby="share-section-qualities">
            <header className={styles.cardHeader}><span className={styles.cardNumber} aria-hidden="true">2</span><h3 id="share-section-qualities">За что меня ценят</h3></header>
            <p className={styles.cardHint}>Эти качества появятся на публичной странице.</p>
            <div className={styles.qualities}>{publicQualities.map((quality) => <span key={quality.id}>{quality.text}</span>)}</div>
            {publicQualities.length > 0 ? <p className={styles.cardNote}>На публичной странице будут показаны эти {publicQualities.length} {plural(publicQualities.length, ["качество", "качества", "качеств"])}.</p> : null}
          </section>
          <section className={styles.card} aria-labelledby="share-section-phrases">
            <header className={styles.cardHeader}><span className={styles.cardNumber} aria-hidden="true">3</span><h3 id="share-section-phrases">Особенно тёплые слова</h3></header>
            <p className={styles.cardHint}>Выберите три фразы. Фразы появятся в том порядке, в котором вы их выберете.</p>
            <strong className={selectedPhrases.length === 3 ? styles.ready : styles.attention}>Выбрано: {selectedPhrases.length}/3</strong>
            <div className={styles.phraseChoices}>
              {phraseCandidates.map((phrase, index) => {
                const orderIndex = selectedPhrases.indexOf(phrase);
                const isSelected = orderIndex !== -1;
                const selectionFull = selectedPhrases.length === 3;
                return (
                  <div
                    key={phrase}
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-disabled={!isSelected && selectionFull}
                    aria-label={phrase}
                    tabIndex={0}
                    className={`${styles.phraseChoice} ${isSelected ? styles.phraseChoiceSelected : ""}`}
                    onClick={() => togglePhrase(phrase)}
                    onKeyDown={(event) => handlePhraseKeyDown(event, phrase)}
                  >
                    <div className={styles.phraseTop}>
                      {isSelected ? <span className={styles.orderBadge} aria-label={`Порядок на странице: ${orderIndex + 1}`}>{orderIndex + 1}</span> : null}
                      {index < 3 ? <span className={styles.organizerBadge}>Рекомендовано организатором</span> : null}
                    </div>
                    <span className={styles.phraseText}>{phrase}</span>
                  </div>
                );
              })}
            </div>
            {selectedPhrases.map((phrase) => <input key={phrase} type="hidden" name="phraseText" value={phrase} />)}
          </section>
          {mediaAssets.length > 0 ? (
            <section className={styles.card} aria-labelledby="share-section-photos">
              <header className={styles.cardHeader}><span className={styles.cardNumber} aria-hidden="true">4</span><h3 id="share-section-photos">Публичные фотографии</h3></header>
              <p className={styles.cardHint}>Выберите до трёх фотографий. Они появятся в том порядке, в котором вы их выберете. При необходимости измените подписи.</p>
              <strong className={selectedPhotoIds.length === 3 ? styles.ready : styles.photoCount}>Выбрано фото: {selectedPhotoIds.length} из 3</strong>
              <div className={styles.photoGrid}>
                {mediaAssets.map((asset) => {
                  const orderIndex = selectedPhotoIds.indexOf(asset.id);
                  const isSelected = orderIndex !== -1;
                  const selectionFull = selectedPhotoIds.length === 3;
                  return (
                    <div
                      key={asset.id}
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-disabled={!isSelected && selectionFull}
                      aria-label={isSelected ? `Фотография из открытки, выбрана, порядок ${orderIndex + 1}` : "Фотография из открытки"}
                      tabIndex={0}
                      className={`${styles.photo} ${isSelected ? styles.photoSelected : ""}`}
                      onClick={() => togglePhoto(asset.id)}
                      onKeyDown={(event) => handlePhotoKeyDown(event, asset.id)}
                    >
                      <span className={styles.photoImageWrap}>
                        <img src={asset.publicUrl} alt="" />
                        {isSelected ? <span className={styles.photoOrderBadge} aria-hidden="true">{orderIndex + 1}</span> : null}
                      </span>
                      <input
                        className={styles.photoCaption}
                        name={`caption:${asset.id}`}
                        value={captions[asset.id] ?? ""}
                        onChange={(event) => setCaptions((current) => ({ ...current, [asset.id]: event.target.value }))}
                        maxLength={120}
                        placeholder="Добавьте короткую подпись"
                        aria-label="Подпись к фотографии"
                        onClick={(event) => event.stopPropagation()}
                      />
                    </div>
                  );
                })}
              </div>
              {selectedPhotoIds.map((photoId) => <input key={photoId} type="hidden" name="photoAssetId" value={photoId} />)}
            </section>
          ) : null}
          {mediaAssets.length > 0 && selectedPhotoIds.length > 0 ? (
            <section className={styles.card} aria-labelledby="share-section-consent">
              <header className={styles.cardHeader}><span className={styles.cardNumber} aria-hidden="true">5</span><h3 id="share-section-consent">Разрешение на публикацию фотографий</h3></header>
              <p className={styles.cardHint}>Выбранные фотографии смогут увидеть все, у кого есть ссылка на публичную страницу.</p>
              <label className={styles.consent}>
                <input type="checkbox" name="photoConsentAccepted" checked={photoConsent} onChange={(event) => setPhotoConsent(event.target.checked)} aria-invalid={consentError} aria-describedby={consentError ? "photo-consent-error" : undefined} />
                <span>Я подтверждаю, что могу разрешить публичное использование выбранных фотографий.</span>
              </label>
              {consentError ? <p className={styles.consentError} id="photo-consent-error">Без подтверждения нельзя сохранить публичные фотографии.</p> : null}
            </section>
          ) : null}
          {state.message ? <p className={state.ok ? styles.success : styles.error}>{state.message}</p> : null}
          {visibilityMessage ? <p className={visibilityMessage.includes("не удалось") ? styles.error : styles.success}>{visibilityMessage}</p> : null}
          {state.shareUrl ? <p className={styles.success}>Ссылка: <a href={state.shareUrl} target="_blank" rel="noreferrer">Открыть публичную страницу</a></p> : null}
          <div className={styles.mobileActions}>
            {isActive && hasUnsavedChanges && publicSharePath ? <Link className={styles.secondary} href={publicSharePath} target="_blank">Открыть опубликованную страницу</Link> : null}
            {publishButton}
            {revokeButton}
          </div>
          <div className={styles.actionBar}>
            <div className={styles.actionBarInner}>
              <p className={`${styles.saveStatus} ${hasUnsavedChanges ? styles.saveStatusDirty : ""}`} role="status">{saveStatusText}</p>
              <div className={styles.actionButtons}>
                <button type="submit" disabled={saveDisabled}>{pending ? "Сохраняем…" : share ? "Сохранить изменения" : "Создать черновик"}</button>
                {!isActive || hasUnsavedChanges ? (
                  <button type="button" className={styles.secondary} onClick={openExactPreview} disabled={validationBlocked}>
                    <span className={styles.labelFull}>{pending && previewRequested ? "Сохраняем черновик…" : previewLabel}</span>
                    <span className={styles.labelShort}>{pending && previewRequested ? "Сохраняем…" : isActive ? "Посмотреть изменения" : "Посмотреть"}</span>
                  </button>
                ) : null}
                {isActive && publicSharePath ? (
                  <Link className={`${hasUnsavedChanges ? styles.secondary : ""} ${hasUnsavedChanges ? styles.hideOnMobile : ""}`} href={publicSharePath} target="_blank">{publicLinkLabel}</Link>
                ) : null}
                <span className={styles.desktopExtras}>
                  {publishButton}
                  {revokeButton}
                </span>
              </div>
            </div>
          </div>
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
                <ol className={styles.summaryPhrases}>
                  {selectedPhrases.map((phrase, phraseIndex) => (
                    <li key={phrase}>
                      <span className={styles.summaryPhraseNumber} aria-hidden="true">{phraseIndex + 1}</span>
                      <span className={styles.summaryPhraseText}>{phrase}</span>
                    </li>
                  ))}
                </ol>
              </>
            ) : <p className={styles.summaryMuted}>Фразы не выбраны</p>}
          </section>
          {mediaAssets.length > 0 ? (
            <section className={styles.summaryBlock}>
              <h4>Публичные фотографии</h4>
              <p>Выбрано фото: {selectedPhotoIds.length} из 3</p>
              {selectedPhotoAssets.length > 0 ? (
                <ol className={styles.summaryPhotos}>{selectedPhotoAssets.map((asset, index) => <li key={asset.id}><img src={asset.publicUrl} alt="" /><span aria-hidden="true">{index + 1}</span></li>)}</ol>
              ) : null}
            </section>
          ) : null}
          {mediaAssets.length > 0 ? (
            <section className={styles.summaryBlock}>
              <h4>Подтверждение</h4>
              <p className={photoConsent ? undefined : styles.summaryMuted}>{photoConsent ? "Право на публикацию подтверждено" : "Право на публикацию не подтверждено"}</p>
            </section>
          ) : null}
          <div className={styles.summaryPreview}>
            {!isActive ? (
              <>
                <button type="button" onClick={openExactPreview} disabled={validationBlocked}>{pending && previewRequested ? "Сохраняем черновик…" : "Посмотреть перед публикацией"}</button>
                <p>Страница ещё не опубликована. Вы увидите её такой, какой она станет после публикации.</p>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <p className={styles.summaryStatusNote}>Есть неопубликованные изменения</p>
                <button type="button" onClick={openExactPreview} disabled={validationBlocked}>{pending && previewRequested ? "Сохраняем черновик…" : "Посмотреть изменения"}</button>
                {publicSharePath ? <Link className={styles.summarySecondary} href={publicSharePath} target="_blank">Открыть опубликованную страницу</Link> : null}
                <p>Предпросмотр покажет текущие изменения. Опубликованная страница пока выглядит по-прежнему.</p>
              </>
            ) : (
              <>
                {publicSharePath ? <Link className={styles.summaryPrimary} href={publicSharePath} target="_blank">Открыть публичную страницу</Link> : null}
                <p>Так страницу сейчас видят все, у кого есть ссылка.</p>
              </>
            )}
          </div>
        </aside>
      </div>
      {revokeDialogOpen ? (
        <div className={styles.dialogOverlay} onClick={() => { if (!isVisibilityPending) setRevokeDialogOpen(false); }}>
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="revoke-dialog-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="revoke-dialog-title">Отключить публичную страницу?</h3>
            <p>Ссылка перестанет открываться. Позже публичную страницу можно будет создать снова, но у неё будет новая ссылка.</p>
            <div className={styles.dialogActions}>
              <button type="button" className={styles.dialogCancel} autoFocus disabled={isVisibilityPending} onClick={() => setRevokeDialogOpen(false)}>Оставить включённой</button>
              <button type="button" className={styles.dialogDanger} disabled={isVisibilityPending} onClick={() => { setRevokeDialogOpen(false); changeVisibility("revoke"); }}>{isVisibilityPending ? "Отключаем…" : "Отключить страницу"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
