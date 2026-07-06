"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { CardMediaAsset, CardMediaSlot } from "@/lib/cards/types";
import { CARD_MEDIA_MAX_COUNT } from "@/lib/cards/media";
import type { FinalCardMessageMediaLayout } from "@/lib/final-card/types";
import { compressImageFile } from "@/lib/media/image-compression";
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

const slotBaseLabels: Record<CardMediaSlot, string> = {
  portrait: "Вертикальное фото",
  "landscape-a": "Поздравления (1)",
  "landscape-b": "Поздравления (2)",
  "landscape-c": "Поздравления (3)",
  "memory-a": "Моменты (1)",
  "memory-b": "Моменты (2)",
  "memory-c": "Моменты (3)"
};

const groupAssets = (assets: CardMediaAsset[], slots: CardMediaSlot[]) =>
  slots.map((slot) => assets.find((asset) => asset.slot === slot)).filter((asset): asset is CardMediaAsset => Boolean(asset));

const getFirstAvailableSlot = (assets: CardMediaAsset[], slots: CardMediaSlot[]) =>
  slots.find((slot) => !assets.some((asset) => asset.slot === slot));

const getSlotTypeLabel = (slot: CardMediaSlot) => (verticalSlots.includes(slot) ? "Вертикальное" : "Горизонтальное");

type SlotOption = {
  slot: CardMediaSlot;
  isOccupied: boolean;
};

const SlotDropdown = ({
  options,
  value,
  assets,
  hideOccupied = false,
  onChange,
  name
}: {
  options: SlotOption[];
  value: CardMediaSlot;
  assets: CardMediaAsset[];
  hideOccupied?: boolean;
  onChange?: (slot: CardMediaSlot) => void;
  name?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isSelectedOccupied = assets.some((asset) => asset.slot === value);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (slot: CardMediaSlot) => {
    setIsOpen(false);
    if (slot !== value) {
      onChange?.(slot);
    }
  };

  const getOptionLabel = (slot: CardMediaSlot, isOccupied: boolean) =>
    isOccupied ? `${slotBaseLabels[slot]} — поменять местами` : slotBaseLabels[slot];

  return (
    <div ref={wrapperRef} className={`${styles.mediaLibrarySlotSelect} ${isOpen ? styles.mediaLibrarySlotSelectOpen : ""}`}>
      <span>Использовать в блоке</span>
      <input type="hidden" name={name} value={value} />
      <div className={styles.mediaLibrarySlotTriggerWrap}>
        <button
          type="button"
          className={`${styles.mediaLibrarySlotTrigger} ${isOpen ? styles.mediaLibrarySlotTriggerOpen : ""}`}
          onClick={() => setIsOpen((current) => !current)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span>{slotBaseLabels[value]}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {isOpen ? (
          <ul className={styles.mediaLibrarySlotDropdown} role="listbox">
            {options
              .filter((option) => !(option.isOccupied && hideOccupied))
              .map((option) => (
                <li key={option.slot} role="option" aria-selected={option.slot === value}>
                  <button
                    type="button"
                    className={`${styles.mediaLibrarySlotOption} ${option.slot === value ? styles.mediaLibrarySlotOptionSelected : ""}`}
                    onClick={() => handleSelect(option.slot)}
                  >
                    <span className={styles.mediaLibrarySlotOptionLabel}>{getOptionLabel(option.slot, option.isOccupied)}</span>
                  </button>
                </li>
              ))}
          </ul>
        ) : null}
      </div>
      {isSelectedOccupied && !isOpen ? (
        <small className={styles.mediaLibrarySlotSwapHint}>Фото поменяются местами</small>
      ) : null}
    </div>
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [caption, setCaption] = useState(asset.captionTitle);
  const [slot, setSlot] = useState(asset.slot);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const submittedMediaKeyRef = useRef<string | null>(null);
  const mediaAutoSaveReadyRef = useRef(false);
  const lastMediaAutoSaveAtRef = useRef(0);
  const saveFormId = `media-save-${asset.id}`;
  const currentMediaKey = `${caption}:${slot}`;

  useEffect(() => {
    if (!mediaAutoSaveReadyRef.current) {
      mediaAutoSaveReadyRef.current = true;
      return;
    }
    if (!isDirty || !formRef.current || savePending) return;
    if (submittedMediaKeyRef.current === currentMediaKey) return;
    const now = Date.now();
    if (now - lastMediaAutoSaveAtRef.current < 800) return;
    lastMediaAutoSaveAtRef.current = now;
    submittedMediaKeyRef.current = currentMediaKey;
    setSaveStatus("saving");
    formRef.current.requestSubmit();
  }, [currentMediaKey, isDirty, savePending]);

  useEffect(() => {
    if (saveState.ok) {
      setSaveStatus("saved");
      setIsDirty(false);
      submittedMediaKeyRef.current = null;
    } else if (saveState.message && !savePending) {
      setSaveStatus("idle");
      submittedMediaKeyRef.current = null;
    }
  }, [savePending, saveState]);

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCaption(e.target.value);
    setIsDirty(true);
  };

  const handleSlotChange = (nextSlot: CardMediaSlot) => {
    setSlot(nextSlot);
    setIsDirty(true);
  };

  return (
    <article className={styles.mediaLibraryItem}>
      <div className={styles.mediaLibraryThumb}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.publicUrl} alt={caption || asset.captionSubtitle || slotBaseLabels[asset.slot]} />
      </div>

      <div className={styles.mediaLibraryItemBody}>
        <form ref={formRef} id={saveFormId} action={saveAction} className={styles.mediaLibraryInlineForm}>
          <input type="hidden" name="manageToken" value={manageToken} />
          <input type="hidden" name="assetId" value={asset.id} />
          <input type="hidden" name="captionSubtitle" value="" />
          <div className={styles.mediaLibraryItemFields}>
            <label className={styles.mediaLibraryCaptionField}>
              <span>Подпись</span>
              <input
                name="captionTitle"
                value={caption}
                onChange={handleCaptionChange}
                className={styles.contentPhotoInput}
                placeholder="Например, Закат на море"
                maxLength={60}
              />
              <span className={styles.mediaLibraryTypeBadge}>{getSlotTypeLabel(asset.slot)}</span>
            </label>
            <SlotDropdown
              options={availableSlots.map((slotItem) => {
                const usedAsset = assets.find((item) => item.slot === slotItem);
                return { slot: slotItem, isOccupied: Boolean(usedAsset) };
              })}
              value={slot}
              assets={assets.filter((item) => item.id !== asset.id)}
              onChange={handleSlotChange}
              name="slot"
            />
            <div className={styles.mediaLibraryMenuWrap}>
              <button
                type="button"
                className={styles.contentIconButton}
                onClick={() => setIsMenuOpen((current) => !current)}
                aria-expanded={isMenuOpen}
                aria-label="Действия с фото"
              >
                ⋮
              </button>
              {isMenuOpen ? (
                <div className={styles.mediaLibraryMenu}>
                  <form action={deleteAction} className={styles.mediaLibraryDeleteForm}>
                    <input type="hidden" name="manageToken" value={manageToken} />
                    <input type="hidden" name="assetId" value={asset.id} />
                    <button type="submit" className={styles.mediaLibraryMenuItem} disabled={deletePending}>
                      {deletePending ? "Удаляем..." : "Удалить"}
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
          {saveState.message ? (
            <span className={saveState.ok ? styles.contentEditorSuccess : styles.contentEditorError}>{saveState.message}</span>
          ) : null}
          <span className={styles.mediaAutoSaveStatus}>
            {savePending || saveStatus === "saving"
              ? "Сохраняем..."
              : saveStatus === "saved"
                ? "Изменения сохранены"
                : null}
          </span>
        </form>
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
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState("");

  if (!defaultSlot) {
    return <p className={styles.mediaLibraryFull}>Все доступные места заполнены. Можно заменить или удалить фото ниже.</p>;
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFileName(file ? file.name : "");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");

    if (file instanceof File && file.size > 0) {
      try {
        const compressed = await compressImageFile(file);
        formData.set("file", compressed);
      } catch {
        // Leave original file if compression fails.
      }
    }

    startTransition(() => {
      saveAction(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.mediaLibraryUploadForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <input type="hidden" name="assetId" value="" />
      <input type="hidden" name="captionSubtitle" value="" />
      <label className={styles.mediaLibraryUploadCaptionLabel}>
        <span>Подпись</span>
        <input name="captionTitle" className={styles.contentPhotoInput} placeholder="Например, Закат на море" maxLength={60} />
      </label>
      <SlotDropdown
        options={allSlots.map((slotItem) => {
          const usedAsset = assets.find((item) => item.slot === slotItem);
          return { slot: slotItem, isOccupied: Boolean(usedAsset) };
        })}
        value={defaultSlot}
        assets={assets}
        hideOccupied
        name="slot"
      />
      <div className={styles.mediaLibraryUploadActions}>
        <input
          ref={fileInputRef}
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={styles.mediaLibraryUploadFileInput}
          onChange={handleFileChange}
        />
        <button
          type="button"
          className={styles.mediaLibraryUploadFileButton}
          onClick={() => fileInputRef.current?.click()}
        >
          Выберите файл
        </button>
        <span className={styles.mediaLibraryUploadFileStatus}>{selectedFileName || "Файл не выбран"}</span>
        <button type="submit" className={styles.contentPrimaryButton} disabled={savePending}>
          {savePending ? "Загружаем..." : "Добавить фото"}
        </button>
      </div>
      {saveState.message ? (
        <span className={saveState.ok ? styles.contentEditorSuccess : styles.contentEditorError}>{saveState.message}</span>
      ) : null}
    </form>
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
  const [, startTransition] = useTransition();
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
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const file = formData.get("file");

            if (file instanceof File && file.size > 0) {
              try {
                const compressed = await compressImageFile(file);
                formData.set("file", compressed);
              } catch {
                // Leave original file if compression fails.
              }
            }

            startTransition(() => {
              saveAction(formData);
            });
          }}
          className={styles.mediaLibraryUploadForm}
        >
          <input type="hidden" name="manageToken" value={manageToken} />
          <input type="hidden" name="assetId" value="" />
          <SlotDropdown
            options={slots.map((slotItem) => {
              const usedAsset = assets.find((item) => item.slot === slotItem);
              return { slot: slotItem, isOccupied: Boolean(usedAsset) };
            })}
            value={defaultUploadSlot}
            assets={assets}
            hideOccupied
            name="slot"
          />
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
            <MediaAssetRow key={`${asset.id}-${asset.slot}`} asset={asset} manageToken={manageToken} availableSlots={allSlots} assets={assets} />
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
  const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);
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
              <button
                type="button"
                className={`${styles.mediaLibraryUploadToggle} ${isUploadFormOpen ? styles.mediaLibraryUploadToggleActive : ""}`}
                onClick={() => setIsUploadFormOpen((current) => !current)}
              >
                {isUploadFormOpen ? "Скрыть форму" : "Загрузить фото"}
              </button>
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

        {isUploadFormOpen ? (
          <div className={styles.mediaLibraryUploadCard}>
            <MediaUploadForm manageToken={manageToken} assets={mediaAssets} defaultSlot={defaultUploadSlot} />
          </div>
        ) : null}

        {visibleMediaAssets.length > 0 ? (
          <div className={styles.mediaLibraryList}>
            {visibleMediaAssets.map((asset) => (
              <MediaAssetRow key={`${asset.id}-${asset.slot}`} asset={asset} manageToken={manageToken} availableSlots={allSlots} assets={mediaAssets} />
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
