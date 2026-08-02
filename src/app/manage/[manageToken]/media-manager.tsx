"use client";

import { useEffect, useId, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CardMediaAsset, CardMediaSlot } from "@/lib/cards/types";
import {
  canStartPhotoPointerDrag,
  getActivePhotoSlots,
  getCropStyle,
  getSlotBlock,
  getSlotLabel,
  getSlotOrientation,
  getSlotPosition,
  moveAssetsBetweenSlots,
  moveCropByPointer,
  normalizeCrop
} from "@/lib/cards/media-slots";
import type { FinalCardMessageMediaLayout } from "@/lib/final-card/types";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import { compressImageFile } from "@/lib/media/image-compression";
import { deleteCardMediaAction, saveCardMediaAction, updateCardMomentsEnabledAction } from "./actions";
import { ConfirmationDialog } from "./confirmation-dialog";
import { useModalFocus } from "./use-modal-focus";
import styles from "./manage-page.module.css";

type Props = {
  cardId: string;
  manageToken: string;
  mediaAssets: CardMediaAsset[];
  mediaLayout: FinalCardMessageMediaLayout;
  messagePhotosEnabled: boolean;
  initialMomentsEnabled: boolean;
};

type EditorMode = "add" | "edit" | "replace" | "move";
type EditorState = {
  mode: EditorMode;
  slot: CardMediaSlot;
  asset?: CardMediaAsset;
  file?: File;
  previewUrl: string;
  imageWidth: number | null;
  imageHeight: number | null;
  sourceSlot?: CardMediaSlot;
  targetWasOccupied?: boolean;
};

type PhotoMoveUndo = {
  assetBefore: CardMediaAsset;
  targetSlot: CardMediaSlot;
};

type PhotoPointerDrag = {
  pointerId: number;
  asset: CardMediaAsset;
  sourceSlot: CardMediaSlot;
  targetSlot: CardMediaSlot | null;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  activated: boolean;
};

const getLayoutLabel = (layout: FinalCardMessageMediaLayout) => {
  if (layout === "portrait") return "1 вертикальное фото";
  if (layout === "landscape-pair") return "2 горизонтальных фото";
  return "3 горизонтальных фото";
};

const getDeviceType = () => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop";

const formatFileSize = (size: number) => `${(size / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;

const replaceOrAddPhoto = (assets: CardMediaAsset[], next: CardMediaAsset) => [
  ...assets.filter((asset) => asset.id !== next.id && asset.slot !== next.slot),
  next
];

const PhotoPreview = ({ asset, alt }: { asset: CardMediaAsset; alt: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={asset.publicUrl}
    alt={alt}
    draggable={false}
    onDragStart={(event) => event.preventDefault()}
    style={getCropStyle(asset)}
  />
);

const PhotoSlotCard = ({
  slot,
  asset,
  onAdd,
  onEdit,
  onReplace,
  onMove,
  onDelete,
  onPointerDragStart,
  isDragging,
  isDisplacedTarget,
  isDropTarget,
  isRecentlyUpdated
}: {
  slot: CardMediaSlot;
  asset?: CardMediaAsset;
  onAdd: (slot: CardMediaSlot) => void;
  onEdit: (asset: CardMediaAsset) => void;
  onReplace: (asset: CardMediaAsset) => void;
  onMove: (asset: CardMediaAsset) => void;
  onDelete: (asset: CardMediaAsset) => void;
  onPointerDragStart: (event: ReactPointerEvent<HTMLButtonElement>, asset: CardMediaAsset, slot: CardMediaSlot) => void;
  isDragging: boolean;
  isDisplacedTarget: boolean;
  isDropTarget: boolean;
  isRecentlyUpdated: boolean;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("keydown", closeOnEscape, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("keydown", closeOnEscape, true);
    };
  }, [menuOpen]);

  if (!asset) {
    return (
      <button
        type="button"
        data-photo-slot={slot}
        className={`${styles.photoSlotCard} ${styles.photoSlotEmpty} ${getSlotOrientation(slot) === "vertical" ? styles.photoSlotVertical : ""} ${isDropTarget ? styles.photoSlotDropTarget : ""} ${isRecentlyUpdated ? styles.photoSlotRecentlyUpdated : ""}`}
        onClick={() => onAdd(slot)}
        aria-label={`Добавить фото, позиция ${getSlotPosition(slot)}`}
      >
        <span className={styles.photoSlotPlus} aria-hidden="true">+</span>
        <span className={styles.photoEmptyCopy}>
          <strong>Добавить фото</strong>
          <span>Позиция {getSlotPosition(slot)}</span>
          <small>{getSlotOrientation(slot) === "vertical" ? "Вертикальное фото" : "Горизонтальное фото"}</small>
        </span>
      </button>
    );
  }

  return (
    <article
      data-photo-slot={slot}
      className={`${styles.photoSlotCard} ${styles.photoSlotFilled} ${menuOpen ? styles.photoSlotMenuOpen : ""} ${getSlotOrientation(slot) === "vertical" ? styles.photoSlotVertical : ""} ${isDragging ? styles.photoSlotPointerDragging : ""} ${isDisplacedTarget ? styles.photoSlotDisplacedTarget : ""} ${isDropTarget ? styles.photoSlotDropTarget : ""} ${isRecentlyUpdated ? styles.photoSlotRecentlyUpdated : ""}`}
      aria-label={getSlotLabel(slot)}
    >
      <button
        type="button"
        className={styles.photoSlotImageButton}
        aria-label={`${getSlotLabel(slot)}. ${asset.captionTitle || "Без подписи"}. Настроить фото.`}
        onPointerDown={(event) => onPointerDragStart(event, asset, slot)}
        onDragStart={(event) => event.preventDefault()}
        onClick={() => onEdit(asset)}
      >
        <span className={styles.photoSlotImageFrame}>
          <PhotoPreview asset={asset} alt={asset.captionTitle || `Фото, позиция ${getSlotPosition(slot)}`} />
        </span>
        <span className={styles.photoSlotPosition}>Позиция {getSlotPosition(slot)}</span>
        <span className={styles.photoSlotText}>
          <span className={styles.photoSlotCaption}>{asset.captionTitle || "Без подписи"}</span>
          {getSlotOrientation(slot) === "vertical" ? <small>Вертикальное фото</small> : null}
        </span>
      </button>
      <div ref={menuRef} className={styles.photoSlotMenuWrap}>
        <button
          type="button"
          className={styles.photoSlotMenuButton}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => { event.stopPropagation(); setMenuOpen((value) => !value); }}
          aria-label={`Действия с фото, ${getSlotLabel(slot)}`}
          aria-expanded={menuOpen}
        >
          ⋮
        </button>
        {menuOpen ? (
          <div className={styles.photoSlotMenu} role="menu">
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(asset); }}>Настроить фото</button>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onReplace(asset); }}>Заменить изображение</button>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onMove(asset); }}>Переместить в другой слот</button>
            <button type="button" role="menuitem" className={styles.photoSlotMenuDanger} onClick={() => { setMenuOpen(false); onDelete(asset); }}>Удалить фото</button>
          </div>
        ) : null}
      </div>
    </article>
  );
};

const MoveDialog = ({ asset, assets, availableSlots, onClose, onSelect }: {
  asset: CardMediaAsset;
  assets: CardMediaAsset[];
  availableSlots: CardMediaSlot[];
  onClose: () => void;
  onSelect: (slot: CardMediaSlot) => void;
}) => {
  const dialogRef = useRef<HTMLElement>(null);
  useModalFocus(dialogRef, onClose);

  return createPortal(
  <div className={styles.photoDialogBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className={styles.photoMoveDialog} role="dialog" aria-modal="true" aria-labelledby="photo-move-title" tabIndex={-1}>
      <div className={styles.photoDialogHeader}>
        <div>
          <h2 id="photo-move-title">Переместить фото</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Закрыть">×</button>
      </div>
      <div className={styles.photoMoveBody}>
        <div className={styles.photoMoveAssetSummary}>
          <span className={styles.photoMoveAssetThumb}><PhotoPreview asset={asset} alt="" /></span>
          <span>
            <small>Перемещаемое фото</small>
            <strong>{getSlotLabel(asset.slot)}</strong>
            <span>{asset.captionTitle || "Без подписи"}</span>
          </span>
        </div>
        <p className={styles.photoMoveDescription}>Выберите новое место. Если оно занято, фотографии поменяются местами.</p>
        {(["greetings", "moments"] as const).map((block) => (
          <div key={block} className={styles.photoMoveGroup}>
            <h3>{block === "greetings" ? "Поздравления" : "Моменты"}</h3>
            <div className={styles.photoMoveGrid}>
              {availableSlots.filter((slot) => getSlotBlock(slot) === block).map((slot) => {
                const occupied = assets.find((item) => item.slot === slot);
                const needsCrop = getSlotOrientation(slot) !== getSlotOrientation(asset.slot);
                const stateLabel = slot === asset.slot
                  ? "Текущее место"
                  : needsCrop
                    ? "Переместить и настроить"
                    : occupied
                      ? "Поменять местами"
                      : "Переместить сюда";
                return (
                  <button
                    type="button"
                    key={slot}
                    className={slot === asset.slot ? styles.photoMoveTargetActive : ""}
                    disabled={slot === asset.slot}
                    onClick={() => onSelect(slot)}
                    aria-label={`${getSlotLabel(slot)}. ${stateLabel}`}
                  >
                    <span className={styles.photoMoveThumb}>
                      {occupied ? <PhotoPreview asset={occupied} alt="" /> : <span aria-hidden="true">+</span>}
                    </span>
                    <span className={styles.photoMoveCopy}>
                      <span>{block === "greetings" ? "Поздравления" : "Моменты"}</span>
                      <strong>Позиция {getSlotPosition(slot)}</strong>
                      <small>{occupied?.captionTitle || "Без подписи"}</small>
                    </span>
                    <em>{stateLabel}</em>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>,
  document.body
  );
};

const PhotoEditor = ({ manageToken, state, onClose, onSaved, onFailed, onReplace, onDelete }: {
  manageToken: string;
  state: EditorState;
  onClose: () => void;
  onSaved: (message: string, asset?: CardMediaAsset, moved?: boolean) => void;
  onFailed: () => void;
  onReplace: (asset: CardMediaAsset) => void;
  onDelete: (asset: CardMediaAsset) => void;
}) => {
  const initialCrop = normalizeCrop(state.mode === "move" ? {
    x: 50,
    y: 50,
    zoom: 1
  } : {
    x: state.asset?.cropX ?? 50,
    y: state.asset?.cropY ?? 50,
    zoom: state.asset?.cropZoom ?? 1
  });
  const initialCaption = state.asset?.captionTitle ?? "";
  const [caption, setCaption] = useState(state.asset?.captionTitle ?? "");
  const [rightsConfirmed, setRightsConfirmed] = useState(!state.file);
  const [crop, setCrop] = useState(initialCrop);
  const [error, setError] = useState("");
  const [cropDragging, setCropDragging] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [pending, startTransition] = useTransition();
  const historyGuardId = useId();
  const dirtyRef = useRef(false);
  const closeRef = useRef(onClose);
  const historyCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    viewportWidth: number;
    viewportHeight: number;
    crop: { x: number; y: number; zoom: number };
  } | null>(null);
  const removeCropListenersRef = useRef<(() => void) | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const isDirty = Boolean(state.file)
    || state.mode === "move"
    || caption !== initialCaption
    || crop.x !== initialCrop.x
    || crop.y !== initialCrop.y
    || crop.zoom !== initialCrop.zoom
    || Boolean(state.file && rightsConfirmed);
  const captionTooLong = caption.length > 45;
  const cropValid = Number.isFinite(crop.x) && Number.isFinite(crop.y) && Number.isFinite(crop.zoom);
  const disabledReason = !state.previewUrl
    ? "Выберите изображение."
    : state.file && !rightsConfirmed
      ? "Подтвердите права на изображение."
      : captionTooLong
        ? "Сделайте подпись короче — не более 45 символов."
        : !cropValid
          ? "Настройте кадрирование фотографии."
          : "";
  const submitDisabled = pending || Boolean(disabledReason);
  const requestClose = () => {
    if (pending) return;
    if (isDirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };

  useModalFocus(dialogRef, requestClose);

  useEffect(() => {
    dirtyRef.current = isDirty;
    closeRef.current = onClose;
  }, [isDirty, onClose]);

  useEffect(() => {
    const guardId = historyGuardId;
    if (historyCleanupTimerRef.current) {
      clearTimeout(historyCleanupTimerRef.current);
      historyCleanupTimerRef.current = null;
    }
    if (window.history.state?.photoEditorGuard !== guardId) {
      window.history.pushState({ ...window.history.state, photoEditorGuard: guardId }, "", window.location.href);
    }
    const handleBack = () => {
      if (dirtyRef.current) {
        window.history.pushState({ ...window.history.state, photoEditorGuard: guardId }, "", window.location.href);
        setConfirmClose(true);
        return;
      }
      closeRef.current();
    };
    window.addEventListener("popstate", handleBack);
    return () => {
      window.removeEventListener("popstate", handleBack);
      historyCleanupTimerRef.current = setTimeout(() => {
        if (window.history.state?.photoEditorGuard === guardId) window.history.back();
        historyCleanupTimerRef.current = null;
      }, 0);
    };
  }, [historyGuardId]);

  const stopCropDrag = () => {
    removeCropListenersRef.current?.();
    removeCropListenersRef.current = null;
    dragRef.current = null;
    setCropDragging(false);
  };

  useEffect(() => () => {
    removeCropListenersRef.current?.();
    removeCropListenersRef.current = null;
    dragRef.current = null;
  }, []);

  const startCropDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      viewportWidth: rect.width,
      viewportHeight: rect.height,
      crop
    };
    setCropDragging(true);

    const handleMove = (pointerEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== pointerEvent.pointerId) return;
      pointerEvent.preventDefault();
      setCrop(moveCropByPointer(
        drag.crop,
        pointerEvent.clientX - drag.startX,
        pointerEvent.clientY - drag.startY,
        drag.viewportWidth,
        drag.viewportHeight
      ));
    };
    const handleEnd = (pointerEvent: PointerEvent) => {
      if (dragRef.current?.pointerId !== pointerEvent.pointerId) return;
      pointerEvent.preventDefault();
      stopCropDrag();
    };
    const handleBlur = () => stopCropDrag();

    window.addEventListener("pointermove", handleMove, { capture: true, passive: false });
    window.addEventListener("pointerup", handleEnd, { capture: true });
    window.addEventListener("pointercancel", handleEnd, { capture: true });
    window.addEventListener("blur", handleBlur);
    removeCropListenersRef.current = () => {
      window.removeEventListener("pointermove", handleMove, { capture: true });
      window.removeEventListener("pointerup", handleEnd, { capture: true });
      window.removeEventListener("pointercancel", handleEnd, { capture: true });
      window.removeEventListener("blur", handleBlur);
    };
  };

  const submit = () => {
    if (submitDisabled) return;
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("manageToken", manageToken);
      formData.set("slot", state.slot);
      formData.set("assetId", state.asset?.id ?? "");
      formData.set("captionTitle", caption);
      formData.set("captionSubtitle", "");
      formData.set("cropX", String(crop.x));
      formData.set("cropY", String(crop.y));
      formData.set("cropZoom", String(crop.zoom));
      formData.set("imageWidth", String(state.imageWidth ?? state.asset?.imageWidth ?? 0));
      formData.set("imageHeight", String(state.imageHeight ?? state.asset?.imageHeight ?? 0));
      if (state.file) {
        let uploadFile = state.file;
        try { uploadFile = await compressImageFile(state.file); } catch { /* keep original */ }
        formData.set("file", uploadFile);
        if (rightsConfirmed) formData.set("rightsConfirmed", "on");
      }
      const result = await saveCardMediaAction({ ok: false, message: "" }, formData);
      if (!result.ok) {
        setError("Не удалось сохранить изменения. Попробуйте ещё раз.");
        onFailed();
        return;
      }
      const returnedAsset = "asset" in result ? result.asset : undefined;
      const nextAsset = returnedAsset ?? (state.asset ? {
        ...state.asset,
        slot: state.slot,
        captionTitle: caption,
        cropX: crop.x,
        cropY: crop.y,
        cropZoom: crop.zoom
      } : undefined);
      onSaved(result.message, nextAsset, state.mode === "move");
    });
  };

  const editorPortal = createPortal(
    <div className={styles.photoDialogBackdrop} role="presentation" onPointerDown={(event) => event.target === event.currentTarget && requestClose()}>
      <section ref={dialogRef} className={styles.photoEditorDialog} role="dialog" aria-modal="true" aria-labelledby="photo-editor-title" tabIndex={-1}>
        <div className={styles.photoDialogHeader}>
          <div>
            <h2 id="photo-editor-title">{state.mode === "add" ? "Добавить фото" : state.mode === "replace" ? "Заменить изображение" : state.mode === "move" ? "Переместить и настроить" : "Настроить фото"}</h2>
            <p>{getSlotLabel(state.slot)} · {getSlotOrientation(state.slot) === "horizontal" ? "горизонтальная рамка" : "вертикальная рамка"}</p>
          </div>
          <button type="button" onClick={requestClose} aria-label="Закрыть">×</button>
        </div>

        <div className={styles.photoEditorBody}>
          <div className={styles.photoCropPanel}>
            <div
              className={`${styles.photoCropViewport} ${getSlotOrientation(state.slot) === "vertical" ? styles.photoCropVertical : ""} ${cropDragging ? styles.photoCropDragging : ""}`}
              onPointerDown={startCropDrag}
              aria-label="Удерживайте фото и перемещайте его внутри рамки"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img onDragStart={(event) => event.preventDefault()} src={state.previewUrl} alt="Предварительный просмотр" style={{ objectPosition: `${crop.x}% ${crop.y}%`, transform: `scale(${crop.zoom})`, transformOrigin: `${crop.x}% ${crop.y}%` }} />
            </div>
            <p>Сначала настройте масштаб. Затем переместите фото внутри рамки. Сохранится выбранная композиция.</p>
            <label className={styles.photoZoomControl}>
              <span>Масштаб</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={crop.zoom}
                onInput={(event) => {
                  const nextZoom = Number(event.currentTarget.value);
                  setCrop((value) => ({ ...value, zoom: nextZoom }));
                }}
              />
              <strong>{Math.round(crop.zoom * 100)}%</strong>
            </label>
            <p className={styles.photoFileMeta}>{state.file ? state.file.name : state.asset?.fileName} · {formatFileSize(state.file?.size ?? state.asset?.sizeBytes ?? 0)}</p>
            {state.asset ? (
              <div className={styles.photoEditorSecondaryActions}>
                <button type="button" onClick={() => onReplace(state.asset!)}>Заменить изображение</button>
                <button type="button" className={styles.photoEditorDeleteAction} onClick={() => onDelete(state.asset!)}>Удалить фото</button>
              </div>
            ) : null}
          </div>

          <div className={styles.photoEditorFields}>
            <label>
              <span>Подпись</span>
              <textarea value={caption} onChange={(event) => setCaption(event.target.value)} aria-invalid={captionTooLong} aria-describedby={captionTooLong ? "photo-caption-error" : undefined} rows={3} placeholder="Например, Закат у моря" />
              <small className={captionTooLong ? styles.photoCaptionCountError : ""}><span>Подпись необязательна</span><strong>{caption.length} / 45</strong></small>
              {captionTooLong ? <span id="photo-caption-error" className={styles.photoFieldError}>Сократите подпись до 45 символов.</span> : null}
            </label>
            {state.file ? (
              <label className={styles.photoRightsConsent}>
                <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} />
                <span>Подтверждаю, что имею право использовать загружаемые материалы и при необходимости получил согласие изображённых лиц.</span>
              </label>
            ) : null}
            {error ? <p className={styles.photoEditorError} role="alert">{error}</p> : null}
          </div>
        </div>
        <div className={styles.photoEditorActions}>
          {disabledReason ? <p className={styles.photoEditorDisabledReason} role="status">{disabledReason}</p> : null}
          <button type="button" className={styles.photoSecondaryButton} onClick={requestClose}>Отмена</button>
          <button type="button" className={styles.photoPrimaryButton} disabled={submitDisabled} onClick={submit}>
            {pending ? "Сохраняем…" : state.mode === "add" ? "Добавить фото" : "Сохранить"}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );

  return (
    <>
      {editorPortal}
      {confirmClose ? (
        <ConfirmationDialog
          title="Изменения не сохранены"
          description="Закрыть редактор и отменить изменения?"
          onDismiss={() => setConfirmClose(false)}
          actions={[
            { label: "Продолжить редактирование", tone: "secondary", onClick: () => setConfirmClose(false) },
            { label: "Закрыть без сохранения", tone: "danger", onClick: onClose }
          ]}
        />
      ) : null}
    </>
  );
};

export const MediaManager = ({ cardId, manageToken, mediaAssets, mediaLayout, messagePhotosEnabled, initialMomentsEnabled }: Props) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileRequestRef = useRef<{ slot: CardMediaSlot; mode: "add" | "replace"; asset?: CardMediaAsset } | null>(null);
  const activePhotoDragRef = useRef<PhotoPointerDrag | null>(null);
  const photoDragPreviewRef = useRef<HTMLElement | null>(null);
  const displacedPhotoPreviewRef = useRef<HTMLElement | null>(null);
  const removePhotoDragListenersRef = useRef<(() => void) | null>(null);
  const suppressPhotoClickRef = useRef(false);
  const suppressPhotoClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentSlotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [assets, setAssets] = useState(mediaAssets);
  const [momentsEnabled, setMomentsEnabled] = useState(initialMomentsEnabled);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [movingAsset, setMovingAsset] = useState<CardMediaAsset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<CardMediaAsset | null>(null);
  const [toast, setToast] = useState("");
  const [lastMove, setLastMove] = useState<PhotoMoveUndo | null>(null);
  const [draggedAssetId, setDraggedAssetId] = useState<string | null>(null);
  const [photoDropTarget, setPhotoDropTarget] = useState<CardMediaSlot | null>(null);
  const [recentlyUpdatedSlots, setRecentlyUpdatedSlots] = useState<CardMediaSlot[]>([]);
  const [momentsPending, startMomentsTransition] = useTransition();
  const [movePending, startMoveTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast("");
      setLastMove(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const highlightSlots = (...slots: CardMediaSlot[]) => {
    if (recentSlotTimerRef.current) clearTimeout(recentSlotTimerRef.current);
    setRecentlyUpdatedSlots(Array.from(new Set(slots)));
    recentSlotTimerRef.current = setTimeout(() => {
      setRecentlyUpdatedSlots([]);
      recentSlotTimerRef.current = null;
    }, 1400);
  };

  const { messageSlots: activeMessageSlots, memorySlots: activeMemorySlots } = getActivePhotoSlots({
    mediaLayout,
    messagePhotosEnabled,
    momentsEnabled
  });
  const messageFilled = activeMessageSlots.filter((slot) => assets.some((asset) => asset.slot === slot)).length;
  const memoryFilled = activeMemorySlots.filter((slot) => assets.some((asset) => asset.slot === slot)).length;
  const totalRequiredCount = activeMessageSlots.length + activeMemorySlots.length;
  const usedPhotoCount = messageFilled + memoryFilled;
  const allRequiredFilled = totalRequiredCount > 0 && usedPhotoCount === totalRequiredCount;
  const missingRequiredCount = totalRequiredCount - usedPhotoCount;
  const activeMessageSlotSet = new Set(activeMessageSlots);
  const inactivePhotoCount = assets.filter((asset) =>
    getSlotBlock(asset.slot) === "greetings" && !activeMessageSlotSet.has(asset.slot)
  ).length;

  const trackPhotoEvent = (event: Parameters<typeof sendClientTelemetry>[0], slot?: CardMediaSlot) => {
    sendClientTelemetry(event, {
      cardId,
      block: slot ? getSlotBlock(slot) : "moments",
      slot: slot ?? "",
      layout: messagePhotosEnabled ? mediaLayout : "none",
      deviceType: getDeviceType()
    });
  };

  const requestFile = (slot: CardMediaSlot, mode: "add" | "replace", asset?: CardMediaAsset) => {
    fileRequestRef.current = { slot, mode, asset };
    if (mode === "add") trackPhotoEvent("photo_slot_opened", slot);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const openSelectedFile = (file: File) => {
    const request = fileRequestRef.current;
    if (!request) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      trackPhotoEvent("photo_upload_failed", request.slot);
      setToast("Неподдерживаемый формат. Поддерживаются JPG, PNG и WebP.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      trackPhotoEvent("photo_upload_failed", request.slot);
      setToast("Файл слишком большой. Размер файла превышает 6 МБ. Выберите другое фото.");
      return;
    }
    trackPhotoEvent("photo_upload_started", request.slot);
    const previewUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setEditor({
      mode: request.mode,
      slot: request.slot,
      asset: request.asset,
      file,
      previewUrl,
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight
    });
    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      trackPhotoEvent("photo_upload_failed", request.slot);
      setToast("Не удалось загрузить фото. Попробуйте ещё раз.");
    };
    image.src = previewUrl;
  };

  const closeEditor = () => {
    if (editor?.file && editor.previewUrl.startsWith("blob:")) URL.revokeObjectURL(editor.previewUrl);
    setEditor(null);
  };

  const finishEditor = (_message: string, savedAsset?: CardMediaAsset, moved?: boolean) => {
    const completedEditor = editor;
    if (savedAsset) {
      setAssets((items) => {
        const positioned = moved ? moveAssetsBetweenSlots(items, savedAsset.id, savedAsset.slot) : items;
        return replaceOrAddPhoto(positioned, savedAsset);
      });
    }
    if (moved && completedEditor?.asset && completedEditor.sourceSlot) {
      setLastMove({ assetBefore: { ...completedEditor.asset, slot: completedEditor.sourceSlot }, targetSlot: completedEditor.slot });
    }
    if (completedEditor) {
      if (completedEditor.mode === "add") trackPhotoEvent("photo_upload_completed", completedEditor.slot);
      if (completedEditor.mode === "replace") {
        trackPhotoEvent("photo_upload_completed", completedEditor.slot);
        trackPhotoEvent("photo_replaced", completedEditor.slot);
      }
      if (completedEditor.mode === "move") trackPhotoEvent("photo_moved", completedEditor.slot);
      if (completedEditor.mode === "edit" && savedAsset && savedAsset.captionTitle !== completedEditor.asset?.captionTitle) {
        trackPhotoEvent("photo_caption_updated", completedEditor.slot);
      }
      highlightSlots(...(completedEditor.sourceSlot ? [completedEditor.sourceSlot, completedEditor.slot] : [completedEditor.slot]));
    }
    closeEditor();
    setToast(completedEditor?.mode === "add"
      ? "Фото добавлено"
      : completedEditor?.mode === "move"
        ? completedEditor.targetWasOccupied ? "Фотографии поменяны местами" : "Фото перемещено"
        : "Изменения сохранены");
    router.refresh();
  };

  const moveAsset = (asset: CardMediaAsset, targetSlot: CardMediaSlot) => {
    setMovingAsset(null);
    const targetWasOccupied = assets.some((item) => item.slot === targetSlot && item.id !== asset.id);
    if (getSlotOrientation(asset.slot) !== getSlotOrientation(targetSlot)) {
      setEditor({ mode: "move", slot: targetSlot, sourceSlot: asset.slot, targetWasOccupied, asset, previewUrl: asset.publicUrl, imageWidth: asset.imageWidth ?? null, imageHeight: asset.imageHeight ?? null });
      return;
    }
    const previous = assets;
    setAssets(moveAssetsBetweenSlots(assets, asset.id, targetSlot));
    startMoveTransition(async () => {
      const formData = new FormData();
      formData.set("manageToken", manageToken);
      formData.set("assetId", asset.id);
      formData.set("slot", targetSlot);
      formData.set("captionTitle", asset.captionTitle);
      formData.set("captionSubtitle", asset.captionSubtitle);
      formData.set("cropX", String(asset.cropX ?? 50));
      formData.set("cropY", String(asset.cropY ?? 50));
      formData.set("cropZoom", String(asset.cropZoom ?? 1));
      const result = await saveCardMediaAction({ ok: false, message: "" }, formData);
      if (!result.ok) {
        setAssets(previous);
        setToast("Не удалось сохранить изменения. Попробуйте ещё раз.");
        return;
      }
      setLastMove({ assetBefore: asset, targetSlot });
      trackPhotoEvent("photo_moved", targetSlot);
      highlightSlots(asset.slot, targetSlot);
      setToast(targetWasOccupied ? "Фотографии поменяны местами" : "Фото перемещено");
      router.refresh();
    });
  };

  const undoLastMove = () => {
    if (!lastMove || movePending) return;
    const currentAsset = assets.find((asset) => asset.id === lastMove.assetBefore.id);
    if (!currentAsset) return;
    const previous = assets;
    const restored = moveAssetsBetweenSlots(assets, currentAsset.id, lastMove.assetBefore.slot)
      .map((asset) => asset.id === currentAsset.id ? { ...asset, ...lastMove.assetBefore } : asset);
    setAssets(restored);
    setLastMove(null);
    startMoveTransition(async () => {
      const formData = new FormData();
      formData.set("manageToken", manageToken);
      formData.set("assetId", currentAsset.id);
      formData.set("slot", lastMove.assetBefore.slot);
      formData.set("captionTitle", lastMove.assetBefore.captionTitle);
      formData.set("captionSubtitle", lastMove.assetBefore.captionSubtitle);
      formData.set("cropX", String(lastMove.assetBefore.cropX ?? 50));
      formData.set("cropY", String(lastMove.assetBefore.cropY ?? 50));
      formData.set("cropZoom", String(lastMove.assetBefore.cropZoom ?? 1));
      const result = await saveCardMediaAction({ ok: false, message: "" }, formData);
      if (!result.ok) {
        setAssets(previous);
        setToast("Не удалось отменить перемещение. Текущее расположение сохранено.");
        return;
      }
      setToast("Перемещение отменено");
      router.refresh();
    });
  };

  const positionPhotoDragPreview = (clientX: number, clientY: number) => {
    const preview = photoDragPreviewRef.current;
    const drag = activePhotoDragRef.current;
    if (!preview || !drag) return;
    preview.style.transform = `translate3d(${clientX - drag.offsetX}px, ${clientY - drag.offsetY}px, 0) scale(1.01)`;
  };

  const suppressNextPhotoClick = () => {
    suppressPhotoClickRef.current = true;
    if (suppressPhotoClickTimerRef.current) clearTimeout(suppressPhotoClickTimerRef.current);
    if (recentSlotTimerRef.current) clearTimeout(recentSlotTimerRef.current);
    suppressPhotoClickTimerRef.current = setTimeout(() => {
      suppressPhotoClickRef.current = false;
      suppressPhotoClickTimerRef.current = null;
    }, 400);
  };

  const activatePhotoDrag = (drag: PhotoPointerDrag, clientX: number, clientY: number) => {
    if (activePhotoDragRef.current !== drag || drag.activated) return;
    drag.activated = true;
    photoDragPreviewRef.current?.classList.add(styles.photoDragPreviewActive);
    document.body.classList.add(styles.photoDragInProgress);
    setDraggedAssetId(drag.asset.id);
    positionPhotoDragPreview(clientX, clientY);
  };

  const removeDisplacedPreview = () => {
    displacedPhotoPreviewRef.current?.remove();
    displacedPhotoPreviewRef.current = null;
  };

  const animateOccupiedPhotoToSource = (targetSlot: CardMediaSlot | null, sourceSlot: CardMediaSlot) => {
    removeDisplacedPreview();
    if (!targetSlot || !assets.some((asset) => asset.slot === targetSlot)) return;
    const source = document.querySelector<HTMLElement>(`[data-photo-slot="${sourceSlot}"]`);
    const target = document.querySelector<HTMLElement>(`[data-photo-slot="${targetSlot}"]`);
    if (!source || !target) return;

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const preview = target.cloneNode(true) as HTMLElement;
    preview.removeAttribute("data-photo-slot");
    preview.setAttribute("aria-hidden", "true");
    preview.classList.remove(styles.photoSlotDropTarget, styles.photoSlotDisplacedTarget);
    preview.classList.add(styles.photoDisplacedPreview);
    preview.style.width = `${targetRect.width}px`;
    preview.style.height = `${targetRect.height}px`;
    preview.style.transform = `translate3d(${targetRect.left}px, ${targetRect.top}px, 0)`;
    preview.style.setProperty("--photo-displaced-scale-x", String(sourceRect.width / Math.max(1, targetRect.width)));
    preview.style.setProperty("--photo-displaced-scale-y", String(sourceRect.height / Math.max(1, targetRect.height)));
    document.body.appendChild(preview);
    displacedPhotoPreviewRef.current = preview;
    window.requestAnimationFrame(() => {
      if (displacedPhotoPreviewRef.current !== preview) return;
      preview.style.transform = `translate3d(${sourceRect.left}px, ${sourceRect.top}px, 0) scale(var(--photo-displaced-scale-x), var(--photo-displaced-scale-y))`;
    });
  };

  const removePhotoDragArtifacts = () => {
    removePhotoDragListenersRef.current?.();
    removePhotoDragListenersRef.current = null;
    photoDragPreviewRef.current?.remove();
    photoDragPreviewRef.current = null;
    removeDisplacedPreview();
    activePhotoDragRef.current = null;
    document.body.classList.remove(styles.photoDragInProgress);
    setDraggedAssetId(null);
    setPhotoDropTarget(null);
  };

  const finishPhotoDrag = (cancelled = false) => {
    const drag = activePhotoDragRef.current;
    if (!drag) return;
    const targetSlot = !cancelled && drag.activated ? drag.targetSlot : null;
    if (drag.activated) suppressNextPhotoClick();
    removePhotoDragArtifacts();
    if (targetSlot && targetSlot !== drag.sourceSlot) moveAsset(drag.asset, targetSlot);
  };

  const updatePhotoPointerDrag = (event: PointerEvent) => {
    const drag = activePhotoDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);

    if (!drag.activated) {
      if (distance < 6) return;
      activatePhotoDrag(drag, event.clientX, event.clientY);
    }

    event.preventDefault();
    positionPhotoDragPreview(event.clientX, event.clientY);
    const target = document
      .elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest<HTMLElement>("[data-photo-slot]"))
      .find(Boolean);
    const nextTarget = target?.dataset.photoSlot as CardMediaSlot | undefined;
    const resolvedTarget = nextTarget && nextTarget !== drag.sourceSlot ? nextTarget : null;
    if (drag.targetSlot !== resolvedTarget) {
      animateOccupiedPhotoToSource(resolvedTarget, drag.sourceSlot);
      drag.targetSlot = resolvedTarget;
      setPhotoDropTarget(resolvedTarget);
    }

    const scrollThreshold = 84;
    if (event.clientY < scrollThreshold) window.scrollBy({ top: -12 });
    else if (event.clientY > window.innerHeight - scrollThreshold) window.scrollBy({ top: 12 });
  };

  const startPhotoPointerDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    asset: CardMediaAsset,
    slot: CardMediaSlot
  ) => {
    if (!canStartPhotoPointerDrag(event.pointerType, event.button, movePending)) return;
    const card = event.currentTarget.closest<HTMLElement>("[data-photo-slot]");
    if (!card) return;
    removePhotoDragArtifacts();

    const rect = card.getBoundingClientRect();
    const preview = card.cloneNode(true) as HTMLElement;
    preview.removeAttribute("data-photo-slot");
    preview.setAttribute("aria-hidden", "true");
    preview.classList.add(styles.photoDragPreview);
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;
    document.body.appendChild(preview);
    photoDragPreviewRef.current = preview;

    const drag: PhotoPointerDrag = {
      pointerId: event.pointerId,
      asset,
      sourceSlot: slot,
      targetSlot: null,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      activated: false
    };
    activePhotoDragRef.current = drag;
    positionPhotoDragPreview(event.clientX, event.clientY);

    const handleMove = (pointerEvent: PointerEvent) => updatePhotoPointerDrag(pointerEvent);
    const handleEnd = (pointerEvent: PointerEvent) => {
      if (activePhotoDragRef.current?.pointerId !== pointerEvent.pointerId) return;
      if (activePhotoDragRef.current.activated) pointerEvent.preventDefault();
      finishPhotoDrag(pointerEvent.type === "pointercancel");
    };
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") finishPhotoDrag(true);
    };
    const handleNativeDragStart = (dragEvent: DragEvent) => dragEvent.preventDefault();
    const handleWindowBlur = () => finishPhotoDrag(true);

    window.addEventListener("pointermove", handleMove, { capture: true, passive: false });
    window.addEventListener("pointerup", handleEnd, { capture: true });
    window.addEventListener("pointercancel", handleEnd, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("dragstart", handleNativeDragStart, { capture: true });
    window.addEventListener("blur", handleWindowBlur);
    removePhotoDragListenersRef.current = () => {
      window.removeEventListener("pointermove", handleMove, { capture: true });
      window.removeEventListener("pointerup", handleEnd, { capture: true });
      window.removeEventListener("pointercancel", handleEnd, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("dragstart", handleNativeDragStart, { capture: true });
      window.removeEventListener("blur", handleWindowBlur);
    };
  };

  useEffect(() => () => {
    removePhotoDragListenersRef.current?.();
    photoDragPreviewRef.current?.remove();
    displacedPhotoPreviewRef.current?.remove();
    if (suppressPhotoClickTimerRef.current) clearTimeout(suppressPhotoClickTimerRef.current);
    document.body.classList.remove(styles.photoDragInProgress);
  }, []);

  const removeAsset = (asset: CardMediaAsset) => {
    startDeleteTransition(async () => {
      const formData = new FormData();
      formData.set("manageToken", manageToken);
      formData.set("assetId", asset.id);
      const result = await deleteCardMediaAction({ ok: false, message: "" }, formData);
      if (!result.ok) {
        setToast("Не удалось сохранить изменения. Попробуйте ещё раз.");
        return;
      }
      setAssets((items) => items.filter((item) => item.id !== asset.id));
      setEditor((current) => current?.asset?.id === asset.id ? null : current);
      setDeleteAsset(null);
      trackPhotoEvent("photo_deleted", asset.slot);
      highlightSlots(asset.slot);
      setToast("Фото удалено");
      router.refresh();
    });
  };

  const enableMoments = () => {
    if (momentsPending || momentsEnabled) return;
    startMomentsTransition(async () => {
      const result = await updateCardMomentsEnabledAction(manageToken, true);
      if (!result.ok) {
        setToast("Не удалось добавить блок «Моменты». Попробуйте ещё раз.");
        return;
      }
      setMomentsEnabled(true);
      trackPhotoEvent("moments_enabled_from_photos");
      setToast("Блок «Моменты» добавлен в открытку.");
      router.refresh();
    });
  };

  const renderSlots = (slots: CardMediaSlot[]) => (
    <div className={`${styles.photoSlotsGrid} ${slots.length === 1 ? styles.photoSlotsSingle : slots.length === 2 ? styles.photoSlotsPair : ""}`}>
      {slots.map((slot) => (
        <PhotoSlotCard
          key={slot}
          slot={slot}
          asset={assets.find((asset) => asset.slot === slot)}
          onAdd={(nextSlot) => {
            // The ref is read only after the child dispatches a real click event.
            // eslint-disable-next-line react-hooks/refs
            if (!suppressPhotoClickRef.current) requestFile(nextSlot, "add");
          }}
          onEdit={(asset) => {
            if (suppressPhotoClickRef.current) return;
            setEditor({ mode: "edit", slot: asset.slot, asset, previewUrl: asset.publicUrl, imageWidth: asset.imageWidth ?? null, imageHeight: asset.imageHeight ?? null });
          }}
          onReplace={(asset) => {
            requestFile(asset.slot, "replace", asset);
            closeEditor();
          }}
          onMove={setMovingAsset}
          onDelete={setDeleteAsset}
          onPointerDragStart={startPhotoPointerDrag}
          isDragging={Boolean(assets.find((asset) => asset.slot === slot)?.id === draggedAssetId)}
          isDisplacedTarget={Boolean(photoDropTarget === slot && assets.some((asset) => asset.slot === slot))}
          isDropTarget={photoDropTarget === slot}
          isRecentlyUpdated={recentlyUpdatedSlots.includes(slot)}
        />
      ))}
    </div>
  );

  return (
    <section className={styles.photoWorkspace} aria-busy={momentsPending || movePending || deletePending}>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => event.target.files?.[0] && openSelectedFile(event.target.files[0])} />

      <header className={styles.photoWorkspaceHeader}>
        <div>
          <h2>Фото открытки</h2>
          <p>Добавляйте фото сразу в нужные места открытки.</p>
        </div>
        <div className={styles.photoCounters} aria-label="Заполнение фотографий">
          <span><strong>Поздравления</strong> {messagePhotosEnabled ? `${messageFilled} из ${activeMessageSlots.length}` : "Без фото"}</span>
          <span><strong>Моменты</strong> {momentsEnabled ? `${memoryFilled} из 3` : "Выключены"}</span>
          <span><strong>Используется</strong> {usedPhotoCount} фото</span>
        </div>
        {totalRequiredCount === 0
          ? <p className={styles.photoNeutralStatus}>Фото не используются в текущем оформлении</p>
          : allRequiredFilled
          ? <p className={styles.photoCompleteStatus}>✓ Все необходимые фото добавлены</p>
          : <p className={styles.photoIncompleteStatus}>Осталось добавить {missingRequiredCount} фото</p>}
      </header>

      <section id="congratulations-photos" className={styles.photoBlock}>
        <div className={styles.photoBlockHeader}>
          <div>
            <div className={styles.photoBlockTitleRow}>
              <h3 data-focus-heading>Поздравления</h3>
              {messagePhotosEnabled ? <strong>{messageFilled} из {activeMessageSlots.length}</strong> : null}
            </div>
            {messagePhotosEnabled ? (
              <>
                <p>Выбрано оформление: {getLayoutLabel(mediaLayout)}</p>
                <Link
                  href={`/manage/${manageToken}?tab=design#congratulations-layout`}
                  className={styles.photoCompositionLink}
                  onClick={() => trackPhotoEvent("photo_layout_edit_clicked")}
                >
                  Изменить оформление
                </Link>
              </>
            ) : null}
          </div>
        </div>
        {messagePhotosEnabled ? (
          <>
            {inactivePhotoCount > 0 ? <p className={styles.photoInactiveNotice}><span aria-hidden="true">ⓘ</span> Фото других вариантов сохранены и вернутся при обратном переключении.</p> : null}
            {renderSlots(activeMessageSlots)}
          </>
        ) : (
          <div className={styles.photoCompositionEmptyState}>
            <p>В выбранном оформлении фотографии рядом с поздравлениями не используются.</p>
            <Link
              href={`/manage/${manageToken}?tab=design#congratulations-layout`}
              className={styles.photoCompositionLink}
              onClick={() => trackPhotoEvent("photo_layout_edit_clicked")}
            >
              Выбрать вид с фотографиями
            </Link>
          </div>
        )}
      </section>

      <section id="moments-photos" className={styles.photoBlock}>
        <div className={styles.photoBlockHeader}>
          <div>
            <div className={styles.photoBlockTitleRow}>
              <h3 data-focus-heading>Моменты</h3>
              {momentsEnabled ? <strong>{memoryFilled} из 3</strong> : null}
            </div>
            {momentsEnabled ? <p>Три атмосферных фото с короткими подписями.</p> : null}
          </div>
        </div>
        {momentsEnabled ? renderSlots(activeMemorySlots) : (
          <div className={styles.photoMomentsDisabled}>
            <p>Раздел не включён в открытку. Для него используются три атмосферных фотографии.</p>
            <button type="button" className={styles.photoCompositionButton} disabled={momentsPending} onClick={enableMoments}>
              {momentsPending ? "Добавляем…" : "Включить «Моменты»"}
            </button>
          </div>
        )}
      </section>

      <p className={styles.photoWorkspaceHint}>ⓘ Нажмите фото, чтобы настроить кадр. Заменить, переместить или удалить его можно через меню ⋯</p>
      <p className={`${styles.photoWorkspaceHint} ${styles.photoDesktopHint}`}>На компьютере порядок также можно изменить перетаскиванием.</p>

      {editor ? (
        <PhotoEditor
          manageToken={manageToken}
          state={editor}
          onClose={closeEditor}
          onSaved={finishEditor}
          onFailed={() => {
            if (editor.file) trackPhotoEvent("photo_upload_failed", editor.slot);
            if (editor.mode === "move") setToast("Не удалось сохранить изменения. Попробуйте ещё раз.");
          }}
          onReplace={(asset) => requestFile(asset.slot, "replace", asset)}
          onDelete={setDeleteAsset}
        />
      ) : null}
      {movingAsset ? (
        <MoveDialog
          asset={movingAsset}
          assets={assets}
          availableSlots={[...activeMessageSlots, ...activeMemorySlots]}
          onClose={() => setMovingAsset(null)}
          onSelect={(slot) => moveAsset(movingAsset, slot)}
        />
      ) : null}
      {deleteAsset ? (
        <ConfirmationDialog
          title="Удалить фото?"
          description="Фотография будет удалена из этого слота. Это действие нельзя отменить."
          onDismiss={() => setDeleteAsset(null)}
          actions={[
            { label: "Отмена", tone: "secondary", onClick: () => setDeleteAsset(null) },
            { label: deletePending ? "Удаляем…" : "Удалить фото", tone: "danger", disabled: deletePending, onClick: () => removeAsset(deleteAsset) }
          ]}
        />
      ) : null}
      {toast ? (
        <div className={styles.photoToast} role="status">
          <span>{toast}</span>
          {lastMove ? <button type="button" onClick={undoLastMove} disabled={movePending}>Отменить</button> : null}
        </div>
      ) : null}
    </section>
  );
};
