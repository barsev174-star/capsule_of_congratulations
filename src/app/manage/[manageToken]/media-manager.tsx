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

const formatFileSize = (sizeBytes: number) => `${(sizeBytes / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;

const getFileNameParts = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) return { base: fileName, extension: "" };
  return { base: fileName.slice(0, lastDotIndex), extension: fileName.slice(lastDotIndex) };
};

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
  name,
  label = "Использовать в блоке"
}: {
  options: SlotOption[];
  value: CardMediaSlot;
  assets: CardMediaAsset[];
  hideOccupied?: boolean;
  onChange?: (slot: CardMediaSlot) => void;
  name?: string;
  label?: string;
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
      <span>{label}</span>
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
  assets,
  onDeleted
}: {
  asset: CardMediaAsset;
  manageToken: string;
  availableSlots: CardMediaSlot[];
  assets: CardMediaAsset[];
  onDeleted?: () => void;
}) => {
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCardMediaAction, initialState);
  const [, startDeleteTransition] = useTransition();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [caption, setCaption] = useState(asset.captionTitle);
  const [slot, setSlot] = useState(asset.slot);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const submittedMediaKeyRef = useRef<string | null>(null);
  const mediaAutoSaveReadyRef = useRef(false);
  const saveFormId = `media-save-${asset.id}`;
  const currentMediaKey = `${caption}:${slot}`;
  const handleSaveAction = async (previousState: typeof initialState, formData: FormData) => {
    const result = await saveCardMediaAction(previousState, formData);
    if (result.ok) {
      setSaveStatus("saved");
      setIsDirty(false);
    } else {
      setSaveStatus("idle");
    }
    submittedMediaKeyRef.current = null;
    return result;
  };
  const [saveState, saveAction, savePending] = useActionState(handleSaveAction, initialState);

  useEffect(() => {
    if (!mediaAutoSaveReadyRef.current) {
      mediaAutoSaveReadyRef.current = true;
      return;
    }
    if (!isDirty || !formRef.current || savePending) return;
    if (submittedMediaKeyRef.current === currentMediaKey) return;

    const timeoutId = window.setTimeout(() => {
      if (!formRef.current || submittedMediaKeyRef.current === currentMediaKey) return;
      submittedMediaKeyRef.current = currentMediaKey;
      setSaveStatus("saving");
      formRef.current.requestSubmit();
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [currentMediaKey, isDirty, savePending]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const closeMenuOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeMenuOnOutsidePress);
    document.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsidePress);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (deleteState.ok) onDeleted?.();
  }, [deleteState.ok, onDeleted]);

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCaption(e.target.value);
    setIsDirty(true);
  };

  const handleSlotChange = (nextSlot: CardMediaSlot) => {
    setSlot(nextSlot);
    setIsDirty(true);
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.set("manageToken", manageToken);
    formData.set("assetId", asset.id);
    setIsMenuOpen(false);
    startDeleteTransition(() => deleteAction(formData));
  };

  return (
    <article id={`media-asset-${asset.id}`} tabIndex={-1} className={styles.mediaLibraryItem}>
      <div className={`${styles.mediaLibraryThumb} ${verticalSlots.includes(asset.slot) ? styles.mediaLibraryThumbVertical : ""}`}>
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
                maxLength={45}
              />
              <span className={styles.mediaLibraryCaptionHint}>
                <span>Для полароида лучше до двух строк</span>
                <strong>{caption.length} / 45</strong>
              </span>
            </label>
            <div className={styles.mediaLibrarySlotField}>
            <SlotDropdown
              options={availableSlots.map((slotItem) => {
                const usedAsset = assets.find((item) => item.slot === slotItem);
                return { slot: slotItem, isOccupied: Boolean(usedAsset) };
              })}
              value={slot}
              assets={assets.filter((item) => item.id !== asset.id)}
              onChange={handleSlotChange}
              name="slot"
              label="Разместить в блоке"
            />
              <span className={styles.mediaLibraryTypeBadge}>{getSlotTypeLabel(slot)}</span>
            </div>
            <div ref={menuRef} className={styles.mediaLibraryMenuWrap}>
              <button
                ref={menuTriggerRef}
                type="button"
                className={styles.contentIconButton}
                onClick={() => setIsMenuOpen((current) => !current)}
                aria-expanded={isMenuOpen}
                aria-controls={`media-menu-${asset.id}`}
                aria-label="Действия с фото"
              >
                ⋮
              </button>
              {isMenuOpen ? (
                <div id={`media-menu-${asset.id}`} className={styles.mediaLibraryMenu}>
                  <button type="button" className={styles.mediaLibraryMenuItem} onClick={handleDelete} disabled={deletePending}>
                    {deletePending ? "Удаляем..." : "Удалить фото"}
                  </button>
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
  defaultSlot,
  onSuccess
}: {
  manageToken: string;
  defaultSlot?: CardMediaSlot;
  onSuccess: () => void;
}) => {
  const [saveState, saveAction, savePending] = useActionState(saveCardMediaAction, initialState);
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const successHandledRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [caption, setCaption] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!saveState.ok || successHandledRef.current) return;
    successHandledRef.current = true;
    onSuccess();
  }, [onSuccess, saveState.ok]);

  if (!defaultSlot) {
    return <p className={styles.mediaLibraryFull}>Все доступные места заполнены. Можно заменить или удалить фото ниже.</p>;
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = file ? URL.createObjectURL(file) : null;
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setSelectedFile(file ?? null);
  };

  const handleRemoveFile = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      <p className={styles.mediaLibraryUploadTarget}>
        Фото будет добавлено в блок «Поздравления». Место можно изменить после загрузки.
      </p>
      <div className={styles.mediaLibraryFilePicker}>
        <input
          ref={fileInputRef}
          id="media-upload-file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={styles.mediaLibraryUploadFileInput}
          onChange={handleFileChange}
        />
        {!selectedFile ? <label htmlFor="media-upload-file" className={styles.mediaLibraryUploadFileButton}>Выбрать фото</label> : null}
        <span className={styles.mediaLibraryUploadFileHelp}>JPG, PNG или WebP · до 6 МБ</span>
      </div>
      {selectedFile ? (
        <div className={styles.mediaLibraryUploadContent}>
          <div className={styles.mediaLibrarySelectedFile}>
            {previewUrl ? (
              <div className={styles.mediaLibraryUploadPreview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Предварительный просмотр выбранного фото" />
              </div>
            ) : null}
            <p className={styles.mediaLibraryUploadFileStatus} title={selectedFile.name}>
              <span className={styles.mediaLibraryFileName} title={selectedFile.name}><span>{getFileNameParts(selectedFile.name).base}</span><b>{getFileNameParts(selectedFile.name).extension}</b></span> · {formatFileSize(selectedFile.size)}
            </p>
            <div className={styles.mediaLibraryFileActions}>
              <label htmlFor="media-upload-file" className={styles.mediaLibraryUploadFileButton}>Заменить</label>
              <button type="button" className={styles.mediaLibraryRemoveFileButton} onClick={handleRemoveFile}>Удалить</button>
            </div>
          </div>
          <div className={styles.mediaLibraryUploadFields}>
            <label className={styles.mediaLibraryUploadCaptionLabel}>
              <span>Подпись</span>
              <textarea name="captionTitle" value={caption} onChange={(event) => setCaption(event.target.value)} aria-describedby="media-upload-caption-counter" className={`${styles.contentPhotoInput} ${styles.mediaLibraryCaptionTextarea}`} placeholder="Например, Закат на море" rows={2} />
              <small>Подпись необязательна</small>
              <span id="media-upload-caption-counter" className={`${styles.mediaLibraryCaptionCounter} ${caption.length >= 40 ? styles.mediaLibraryCaptionCounterNearLimit : ""} ${caption.length > 45 ? styles.mediaLibraryCaptionCounterError : ""}`}>{caption.length} / 45</span>
            </label>
            {caption.length > 45 ? <span className={styles.contentEditorError}>Подпись длиннее 45 символов.</span> : null}
            <label className={styles.mediaRightsConsent}><input name="rightsConfirmed" type="checkbox" required checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /> <span>Подтверждаю, что имею право использовать загружаемые материалы и при необходимости получил согласие изображённых лиц.</span></label>
            <button type="submit" className={`${styles.contentPrimaryButton} ${styles.mediaLibraryUploadSubmit}`} disabled={!rightsConfirmed || caption.length > 45 || savePending}>
              {savePending ? "Добавляем фото…" : "Добавить фото"}
            </button>
          </div>
        </div>
      ) : null}
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
          <input name="captionTitle" className={styles.contentPhotoInput} placeholder="Название фото" maxLength={45} />
          <input name="captionSubtitle" className={styles.contentPhotoInput} placeholder="Короткое описание" maxLength={45} />
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
          <label className={styles.mediaRightsConsent}><input name="rightsConfirmed" type="checkbox" required /> <span>Подтверждаю право использовать загружаемые материалы и наличие необходимых согласий.</span></label>
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
  const addPhotoButtonRef = useRef<HTMLButtonElement>(null);
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
  const selectFilter = (nextFilter: MediaFilter, button: HTMLButtonElement) => {
    setMediaFilter(nextFilter);
    button.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  const focusAfterDelete = (nextAssetId?: string) => {
    window.requestAnimationFrame(() => {
      const nextCard = nextAssetId ? document.getElementById(`media-asset-${nextAssetId}`) : null;
      (nextCard ?? addPhotoButtonRef.current)?.focus();
    });
  };
  const filters = (
    <div className={`${styles.contentFilterRow} ${styles.mediaLibraryFilterRow}`}>
      <button type="button" aria-pressed={mediaFilter === "all"} className={`${styles.contentFilterPill} ${mediaFilter === "all" ? styles.contentFilterPillActive : ""}`} onClick={(event) => selectFilter("all", event.currentTarget)}>Все {mediaAssets.length}</button>
      <button type="button" aria-pressed={mediaFilter === "horizontal"} className={`${styles.contentFilterPill} ${mediaFilter === "horizontal" ? styles.contentFilterPillActive : ""}`} onClick={(event) => selectFilter("horizontal", event.currentTarget)}>Горизонтальные {horizontalMediaCount}</button>
      <button type="button" aria-pressed={mediaFilter === "vertical"} className={`${styles.contentFilterPill} ${mediaFilter === "vertical" ? styles.contentFilterPillActive : ""}`} onClick={(event) => selectFilter("vertical", event.currentTarget)}>Вертикальные {verticalMediaCount}</button>
    </div>
  );

  return (
    <section className={styles.mediaManagerStack}>
      <section className={`${styles.contentPhotoCard} ${styles.mediaLibraryUnifiedCard}`}>
        <div className={`${styles.contentPanelHeader} ${styles.mediaLibraryHeader}`}>
          <div className={styles.contentPanelTopRow}>
            <h2 className={styles.contentPanelTitle}>Фото открытки</h2>
            <div className={styles.contentToolbar}>
              <button
                ref={addPhotoButtonRef}
                type="button"
                className={`${styles.mediaLibraryUploadToggle} ${isUploadFormOpen ? styles.mediaLibraryUploadToggleActive : ""}`}
                onClick={() => setIsUploadFormOpen((current) => !current)}
                aria-expanded={isUploadFormOpen}
              >
                {isUploadFormOpen ? <><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6" /></svg>Свернуть форму</> : "+ Добавить фото"}
              </button>
            </div>
          </div>
          <p className={`${styles.contentPhotoHint} ${styles.mediaLibraryHint}`}>
            Добавляйте фото и выбирайте, где они появятся в открытке.
          </p>
        </div>

        {!isUploadFormOpen ? filters : null}

        {isUploadFormOpen ? (
          <div className={styles.mediaLibraryUploadCard}>
            <MediaUploadForm
              manageToken={manageToken}
              defaultSlot={defaultUploadSlot}
              onSuccess={() => {
                setMediaFilter("all");
                setIsUploadFormOpen(false);
              }}
            />
          </div>
        ) : null}

        {isUploadFormOpen ? filters : null}

        {visibleMediaAssets.length > 0 ? (
          <div className={styles.mediaLibraryList}>
            {visibleMediaAssets.map((asset, index) => (
              <MediaAssetRow key={`${asset.id}-${asset.slot}`} asset={asset} manageToken={manageToken} availableSlots={allSlots} assets={mediaAssets} onDeleted={() => focusAfterDelete(visibleMediaAssets[index + 1]?.id)} />
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
