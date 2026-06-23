"use client";

import { useActionState } from "react";
import type { CardMediaAsset, CardMediaSlot } from "@/lib/cards/types";
import { CARD_MEDIA_MAX_COUNT } from "@/lib/cards/media";
import type { FinalCardMessageMediaLayout } from "@/lib/final-card/types";
import { deleteCardMediaAction, saveCardMediaAction } from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  mediaAssets: CardMediaAsset[];
  mediaLayout: FinalCardMessageMediaLayout;
};

const initialState = {
  ok: false,
  message: ""
};

const messageSlotMap: Record<FinalCardMessageMediaLayout, CardMediaSlot[]> = {
  portrait: ["portrait"],
  "landscape-pair": ["landscape-a", "landscape-b"],
  "landscape-trio": ["landscape-a", "landscape-b", "landscape-c"]
};

const verticalSlots: CardMediaSlot[] = ["portrait"];
const memorySlots: CardMediaSlot[] = ["memory-a", "memory-b", "memory-c"];
const messageLandscapeSlots: CardMediaSlot[] = ["landscape-a", "landscape-b", "landscape-c"];
const horizontalSlots: CardMediaSlot[] = [...messageLandscapeSlots, ...memorySlots];

const slotLabels: Record<CardMediaSlot, string> = {
  portrait: "Вертикальное фото",
  "landscape-a": "Фото поздравлений 1",
  "landscape-b": "Фото поздравлений 2",
  "landscape-c": "Фото поздравлений 3",
  "memory-a": "Воспоминание 1",
  "memory-b": "Воспоминание 2",
  "memory-c": "Воспоминание 3"
};

const groupAssets = (assets: CardMediaAsset[], slots: CardMediaSlot[]) =>
  slots.map((slot) => assets.find((asset) => asset.slot === slot)).filter((asset): asset is CardMediaAsset => Boolean(asset));

const getNextEmptySlot = (assets: CardMediaAsset[], slots: CardMediaSlot[]) =>
  slots.find((slot) => !assets.some((asset) => asset.slot === slot));

const MediaAssetRow = ({ asset, manageToken }: { asset: CardMediaAsset; manageToken: string }) => {
  const [saveState, saveAction, savePending] = useActionState(saveCardMediaAction, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCardMediaAction, initialState);

  return (
    <article className={styles.mediaLibraryItem}>
      <div className={styles.mediaLibraryThumb}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.publicUrl} alt={asset.captionTitle || asset.captionSubtitle || slotLabels[asset.slot]} />
      </div>

      <div className={styles.mediaLibraryItemBody}>
        <div className={styles.mediaLibraryItemTop}>
          <strong>{slotLabels[asset.slot]}</strong>
          <span>{asset.mimeType.replace("image/", "").toUpperCase()}</span>
        </div>

        <form action={saveAction} className={styles.mediaLibraryInlineForm}>
          <input type="hidden" name="manageToken" value={manageToken} />
          <input type="hidden" name="slot" value={asset.slot} />
          <input type="hidden" name="assetId" value={asset.id} />
          <input
            name="captionTitle"
            defaultValue={asset.captionTitle}
            className={styles.contentPhotoInput}
            placeholder="Название"
            maxLength={60}
          />
          <input
            name="captionSubtitle"
            defaultValue={asset.captionSubtitle}
            className={styles.contentPhotoInput}
            placeholder="Описание"
            maxLength={120}
          />
          <div className={styles.mediaLibraryActions}>
            <input
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={styles.contentPhotoFileInput}
            />
            <button type="submit" className={styles.contentOutlineButton} disabled={savePending}>
              {savePending ? "Сохраняем..." : "Сохранить"}
            </button>
          </div>
          {saveState.message ? (
            <span className={saveState.ok ? styles.contentEditorSuccess : styles.contentEditorError}>{saveState.message}</span>
          ) : null}
        </form>

        <form action={deleteAction} className={styles.mediaLibraryDeleteForm}>
          <input type="hidden" name="manageToken" value={manageToken} />
          <input type="hidden" name="assetId" value={asset.id} />
          <button type="submit" className={styles.contentDeleteSecondaryButton} disabled={deletePending}>
            {deletePending ? "Удаляем..." : "Удалить"}
          </button>
          {deleteState.message ? (
            <span className={deleteState.ok ? styles.contentEditorSuccess : styles.contentEditorError}>{deleteState.message}</span>
          ) : null}
        </form>
      </div>
    </article>
  );
};

const MediaLibraryGroup = ({
  title,
  hint,
  manageToken,
  assets,
  slots,
  requiredCount
}: {
  title: string;
  hint: string;
  manageToken: string;
  assets: CardMediaAsset[];
  slots: CardMediaSlot[];
  requiredCount: number;
}) => {
  const [saveState, saveAction, savePending] = useActionState(saveCardMediaAction, initialState);
  const addedAssets = groupAssets(assets, slots);
  const nextEmptySlot = getNextEmptySlot(assets, slots);
  const missingCount = Math.max(requiredCount - addedAssets.length, 0);

  return (
    <section className={styles.contentPhotoCard}>
      <div className={styles.mediaLibraryHeader}>
        <div>
          <h2 className={styles.contentRailTitle}>{title}</h2>
          <p className={styles.contentPhotoHint}>{hint}</p>
        </div>
        <span className={`${styles.mediaLibraryCounter} ${missingCount > 0 ? styles.mediaLibraryCounterWarning : ""}`}>
          Нужно {requiredCount} / добавлено {addedAssets.length}
        </span>
      </div>

      {nextEmptySlot ? (
        <form action={saveAction} className={styles.mediaLibraryUploadForm}>
          <input type="hidden" name="manageToken" value={manageToken} />
          <input type="hidden" name="slot" value={nextEmptySlot} />
          <input type="hidden" name="assetId" value="" />
          <input name="captionTitle" className={styles.contentPhotoInput} placeholder="Название фото" maxLength={60} />
          <input name="captionSubtitle" className={styles.contentPhotoInput} placeholder="Короткое описание" maxLength={120} />
          <div className={styles.mediaLibraryActions}>
            <input
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={styles.contentPhotoFileInput}
            />
            <button type="submit" className={styles.contentOutlineButton} disabled={savePending}>
              {savePending ? "Загружаем..." : "Добавить фото"}
            </button>
          </div>
          {saveState.message ? (
            <span className={saveState.ok ? styles.contentEditorSuccess : styles.contentEditorError}>{saveState.message}</span>
          ) : null}
        </form>
      ) : (
        <p className={styles.mediaLibraryFull}>Все доступные места заполнены. Можно заменить любое фото ниже.</p>
      )}

      {addedAssets.length > 0 ? (
        <div className={styles.mediaLibraryList}>
          {addedAssets.map((asset) => (
            <MediaAssetRow key={asset.id} asset={asset} manageToken={manageToken} />
          ))}
        </div>
      ) : (
        <p className={styles.mediaLibraryEmpty}>Фото пока не добавлены.</p>
      )}
    </section>
  );
};

export const MediaManager = ({ manageToken, mediaAssets, mediaLayout }: Props) => {
  const messageSlots = messageSlotMap[mediaLayout];
  const requiredVertical = messageSlots.filter((slot) => verticalSlots.includes(slot)).length;
  const requiredHorizontal = messageSlots.filter((slot) => messageLandscapeSlots.includes(slot)).length + memorySlots.length;

  return (
    <section className={styles.mediaManagerStack}>
      <MediaLibraryGroup
        title="Горизонтальные фото"
        hint={`Общая библиотека для блока «Колонка + фото» и «Моменты». Всего в открытке можно использовать до ${CARD_MEDIA_MAX_COUNT} фото.`}
        manageToken={manageToken}
        assets={mediaAssets}
        slots={horizontalSlots}
        requiredCount={requiredHorizontal}
      />
      <MediaLibraryGroup
        title="Вертикальные фото"
        hint="Нужны, если в поздравлениях выбран вариант с одним вертикальным фото."
        manageToken={manageToken}
        assets={mediaAssets}
        slots={verticalSlots}
        requiredCount={requiredVertical}
      />
    </section>
  );
};
