"use client";

import { useActionState, useState } from "react";
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

type MediaFilter = "all" | "horizontal" | "vertical";

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
const allSlots: CardMediaSlot[] = [...messageLandscapeSlots, ...memorySlots, ...verticalSlots];

const slotLabels: Record<CardMediaSlot, string> = {
  portrait: "Рядом с поздравлениями (вертикальное)",
  "landscape-a": "Рядом с поздравлениями (1)",
  "landscape-b": "Рядом с поздравлениями (2)",
  "landscape-c": "Рядом с поздравлениями (3)",
  "memory-a": "Моменты (1)",
  "memory-b": "Моменты (2)",
  "memory-c": "Моменты (3)"
};

const slotHints: Record<CardMediaSlot, string> = {
  portrait: "Вертикальное фото рядом с поздравлениями",
  "landscape-a": "Рядом с поздравлениями",
  "landscape-b": "Рядом с поздравлениями",
  "landscape-c": "Рядом с поздравлениями",
  "memory-a": "Для блока «Моменты»",
  "memory-b": "Для блока «Моменты»",
  "memory-c": "Для блока «Моменты»"
};

const groupAssets = (assets: CardMediaAsset[], slots: CardMediaSlot[]) =>
  slots.map((slot) => assets.find((asset) => asset.slot === slot)).filter((asset): asset is CardMediaAsset => Boolean(asset));

const getFirstAvailableSlot = (assets: CardMediaAsset[], slots: CardMediaSlot[]) =>
  slots.find((slot) => !assets.some((asset) => asset.slot === slot));

const getSlotTypeLabel = (slot: CardMediaSlot) => (verticalSlots.includes(slot) ? "Вертикальное" : "Горизонтальное");

const SlotSelect = ({
  slots,
  defaultSlot,
  assets,
  hideOccupied = false
}: {
  slots: CardMediaSlot[];
  defaultSlot: CardMediaSlot;
  assets: CardMediaAsset[];
  hideOccupied?: boolean;
}) => {
  const hasOccupiedSlots = slots.some((slot) => assets.some((asset) => asset.slot === slot));

  return (
    <label className={styles.mediaLibrarySlotSelect}>
      <span>Использовать в блоке</span>
      <select name="slot" defaultValue={defaultSlot}>
        {slots.map((slot) => {
          const usedAsset = assets.find((asset) => asset.slot === slot);

          if (usedAsset && hideOccupied) {
            return null;
          }

          return (
            <option key={slot} value={slot}>
              {slotLabels[slot]}
              {usedAsset ? " (занято)" : ""}
            </option>
          );
        })}
      </select>
      {hasOccupiedSlots && !hideOccupied ? <small>Если выбрать занятое место, фото поменяются местами</small> : null}
    </label>
  );
};

const MediaAssetRow = ({
  asset,
  manageToken,
  availableSlots,
  assets
}: {
  asset: CardMediaAsset;
  manageToken: string;
  availableSlots: CardMediaSlot[];
  assets: CardMediaAsset[];
}) => {
  const [saveState, saveAction, savePending] = useActionState(saveCardMediaAction, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCardMediaAction, initialState);
  const saveFormId = `media-save-${asset.id}`;

  return (
    <article className={styles.mediaLibraryItem}>
      <div className={styles.mediaLibraryThumbStack}>
        <div className={styles.mediaLibraryThumb}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset.publicUrl} alt={asset.captionTitle || asset.captionSubtitle || slotLabels[asset.slot]} />
        </div>
        <span className={styles.mediaLibraryTypeBadge}>{getSlotTypeLabel(asset.slot)}</span>
      </div>

      <div className={styles.mediaLibraryItemBody}>
        <form id={saveFormId} action={saveAction} className={styles.mediaLibraryInlineForm}>
          <input type="hidden" name="manageToken" value={manageToken} />
          <input type="hidden" name="assetId" value={asset.id} />
          <input type="hidden" name="captionSubtitle" value="" />
          <label className={styles.mediaLibraryCaptionField}>
            <span>Подпись</span>
            <input
              name="captionTitle"
              defaultValue={asset.captionTitle}
              className={styles.contentPhotoInput}
              placeholder="Подпись"
              maxLength={60}
            />
          </label>
          <SlotSelect slots={availableSlots} defaultSlot={asset.slot} assets={assets.filter((item) => item.id !== asset.id)} />
          {saveState.message ? (
            <span className={saveState.ok ? styles.contentEditorSuccess : styles.contentEditorError}>{saveState.message}</span>
          ) : null}
        </form>

        <div className={styles.mediaLibraryActions}>
          <button type="submit" form={saveFormId} className={styles.contentOutlineButton} disabled={savePending}>
            {savePending ? "Сохраняем..." : "Сохранить"}
          </button>
          <form action={deleteAction} className={styles.mediaLibraryDeleteForm}>
            <input type="hidden" name="manageToken" value={manageToken} />
            <input type="hidden" name="assetId" value={asset.id} />
            <button type="submit" className={styles.contentDeleteSecondaryButton} disabled={deletePending}>
              {deletePending ? "Удаляем..." : "Удалить"}
            </button>
          </form>
        </div>
        {deleteState.message ? (
          <span className={deleteState.ok ? styles.contentEditorSuccess : styles.contentEditorError}>{deleteState.message}</span>
        ) : null}
      </div>
    </article>
  );
};

const MediaUploadForm = ({
  manageToken,
  assets,
  defaultSlot
}: {
  manageToken: string;
  assets: CardMediaAsset[];
  defaultSlot?: CardMediaSlot;
}) => {
  const [saveState, saveAction, savePending] = useActionState(saveCardMediaAction, initialState);

  if (!defaultSlot) {
    return <p className={styles.mediaLibraryFull}>Все доступные места заполнены. Можно заменить или удалить фото ниже.</p>;
  }

  return (
    <details className={styles.mediaLibraryUploadDisclosure}>
      <summary className={styles.mediaLibraryUploadButton}>Загрузить фото</summary>
      <form action={saveAction} className={styles.mediaLibraryUploadForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <input type="hidden" name="assetId" value="" />
      <input type="hidden" name="captionSubtitle" value="" />
      <input name="captionTitle" className={styles.contentPhotoInput} placeholder="Подпись" maxLength={60} />
      <SlotSelect slots={allSlots} defaultSlot={defaultSlot} assets={assets} hideOccupied />
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
    </details>
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
  const defaultUploadSlot = getFirstAvailableSlot(assets, slots);
  const missingCount = Math.max(requiredCount - addedAssets.length, 0);
  const counterText =
    requiredCount > 0
      ? `${missingCount > 0 ? "Нужно" : "Готово"} ${Math.min(addedAssets.length, requiredCount)} из ${requiredCount}`
      : addedAssets.length > 0
        ? `${addedAssets.length} добавлено`
        : "Не требуется сейчас";

  return (
    <section
      className={`${styles.contentPhotoCard} ${requiredCount === 0 ? styles.contentPhotoCardOptional : ""} ${
        requiredCount > 0 && missingCount === 0 ? styles.contentPhotoCardComplete : ""
      }`}
    >
      <div className={styles.mediaLibraryHeader}>
        <div>
          <h2 className={styles.contentRailTitle}>{title}</h2>
          <p className={styles.contentPhotoHint}>{hint}</p>
        </div>
        <span
          className={`${styles.mediaLibraryCounter} ${missingCount > 0 ? styles.mediaLibraryCounterWarning : ""} ${
            requiredCount === 0 ? styles.mediaLibraryCounterOptional : ""
          }`}
        >
          {counterText}
        </span>
      </div>

      {defaultUploadSlot ? (
        <form action={saveAction} className={styles.mediaLibraryUploadForm}>
          <input type="hidden" name="manageToken" value={manageToken} />
          <input type="hidden" name="assetId" value="" />
          <SlotSelect slots={slots} defaultSlot={defaultUploadSlot} assets={assets} />
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
            <MediaAssetRow key={asset.id} asset={asset} manageToken={manageToken} availableSlots={allSlots} assets={assets} />
          ))}
        </div>
      ) : (
        <p className={styles.mediaLibraryEmpty}>Фото пока не добавлены.</p>
      )}
    </section>
  );
};

export const MediaManager = ({ manageToken, mediaAssets, mediaLayout }: Props) => {
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const messageSlots = messageSlotMap[mediaLayout];
  const requiredVertical = messageSlots.filter((slot) => verticalSlots.includes(slot)).length;
  const requiredHorizontal = messageSlots.filter((slot) => messageLandscapeSlots.includes(slot)).length + memorySlots.length;
  const defaultUploadSlot = getFirstAvailableSlot(mediaAssets, allSlots);
  const sortedMediaAssets = [...mediaAssets].sort((left, right) => {
    const slotDiff = allSlots.indexOf(left.slot) - allSlots.indexOf(right.slot);
    return slotDiff || left.createdAt.localeCompare(right.createdAt);
  });
  const horizontalMediaCount = mediaAssets.filter((asset) => horizontalSlots.includes(asset.slot)).length;
  const verticalMediaCount = mediaAssets.filter((asset) => verticalSlots.includes(asset.slot)).length;
  const visibleMediaAssets = sortedMediaAssets.filter((asset) => {
    if (mediaFilter === "horizontal") {
      return horizontalSlots.includes(asset.slot);
    }

    if (mediaFilter === "vertical") {
      return verticalSlots.includes(asset.slot);
    }

    return true;
  });

  return (
    <section className={styles.mediaManagerStack}>
      <section className={`${styles.contentPhotoCard} ${styles.mediaLibraryUnifiedCard}`}>
        <div className={`${styles.contentPanelHeader} ${styles.mediaLibraryHeader}`}>
          <div className={styles.contentPanelTopRow}>
            <h2 className={styles.contentPanelTitle}>Фото открытки</h2>
            <div className={styles.contentToolbar}>
              <MediaUploadForm manageToken={manageToken} assets={mediaAssets} defaultSlot={defaultUploadSlot} />
            </div>
          </div>
          <p className={`${styles.contentPhotoHint} ${styles.mediaLibraryHint}`}>
            Добавляйте фото и выбирайте, где они появятся в открытке.
          </p>
        </div>

        <div className={`${styles.contentFilterRow} ${styles.mediaLibraryFilterRow}`}>
          <button
            type="button"
            className={`${styles.contentFilterPill} ${mediaFilter === "all" ? styles.contentFilterPillActive : ""}`}
            onClick={() => setMediaFilter("all")}
          >
            Все {mediaAssets.length}
          </button>
          <button
            type="button"
            className={`${styles.contentFilterPill} ${mediaFilter === "horizontal" ? styles.contentFilterPillActive : ""}`}
            onClick={() => setMediaFilter("horizontal")}
          >
            Горизонтальные {horizontalMediaCount}
          </button>
          <button
            type="button"
            className={`${styles.contentFilterPill} ${mediaFilter === "vertical" ? styles.contentFilterPillActive : ""}`}
            onClick={() => setMediaFilter("vertical")}
          >
            Вертикальные {verticalMediaCount}
          </button>
        </div>

        {visibleMediaAssets.length > 0 ? (
          <div className={styles.mediaLibraryList}>
            {visibleMediaAssets.map((asset) => (
              <MediaAssetRow key={asset.id} asset={asset} manageToken={manageToken} availableSlots={allSlots} assets={mediaAssets} />
            ))}
          </div>
        ) : (
          <p className={styles.mediaLibraryEmpty}>Фото пока не добавлены.</p>
        )}
      </section>

      {false ? (
        <>
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
        </>
      ) : null}
    </section>
  );
};
