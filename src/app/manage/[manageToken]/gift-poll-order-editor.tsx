"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { GiftPollWithOptions } from "@/lib/gift-polls/types";
import { cleanImportedDescription, sanitizeGiftPollText } from "@/lib/gift-polls/text-sanitization";
import { reorderGiftPollOptionsAction, type GiftPollFormState } from "./actions";
import { ConfirmationDialog } from "./confirmation-dialog";
import { useModalFocus } from "./use-modal-focus";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  poll: GiftPollWithOptions;
  onClose: () => void;
  onSaved: (message: string) => void;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  initialOrder: string[];
  moved: boolean;
};

const initialState: GiftPollFormState = { ok: false, message: "" };
const sameOrder = (left: string[], right: string[]) => left.length === right.length && left.every((id, index) => id === right[index]);
const priceWithCurrency = (value: string) => /₽|руб/i.test(value) ? value : `${value} ₽`;
const moveToIndex = (order: string[], id: string, rawIndex: number) => {
  const currentIndex = order.indexOf(id);
  if (currentIndex < 0) return order;
  const targetIndex = Math.max(0, Math.min(order.length - 1, rawIndex));
  if (currentIndex === targetIndex) return order;
  const next = [...order];
  next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, id);
  return next;
};

const GiftOptionPositionDialog = ({ title, count, position, error, onPositionChange, onMove, onMoveToStart, onMoveToEnd, onClose }: {
  title: string;
  count: number;
  position: string;
  error: string;
  onPositionChange: (value: string) => void;
  onMove: () => void;
  onMoveToStart: () => void;
  onMoveToEnd: () => void;
  onClose: () => void;
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(dialogRef, onClose);
  const canMove = Boolean(position) && Number(position) >= 1 && Number(position) <= count;
  return <div className={styles.orderMoveBackdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div ref={dialogRef} className={styles.orderMoveDialog} role="dialog" aria-modal="true" aria-labelledby="gift-order-move-title" tabIndex={-1}>
      <header><div><h3 id="gift-order-move-title">Переместить вариант</h3><p><strong>{title}</strong></p></div><button type="button" onClick={onClose} aria-label="Закрыть">×</button></header>
      <div className={styles.orderEditorQuickActions}>
        <button type="button" onClick={onMoveToStart}>В начало</button>
        <button type="button" onClick={onMoveToEnd}>В конец</button>
      </div>
      <label><span>Позиция от 1 до {count}</span><span className={styles.orderEditorInlineField}>
        <input type="number" inputMode="numeric" min={1} max={count} value={position} onChange={(event) => onPositionChange(event.target.value)} />
        <button type="button" disabled={!canMove} onClick={onMove}>Переместить</button>
      </span></label>
      {error ? <p className={styles.orderMoveError} role="alert">{error}</p> : null}
    </div>
  </div>;
};

export const GiftPollOrderEditor = ({ manageToken, poll, onClose, onSaved }: Props) => {
  const router = useRouter();
  const initialOrder = useMemo(() => poll.options.map((option) => option.id), [poll.options]);
  const byId = useMemo(() => new Map(poll.options.map((option) => [option.id, option])), [poll.options]);
  const [order, setOrder] = useState(initialOrder);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [keyboardMove, setKeyboardMove] = useState<{ id: string; initialOrder: string[] } | null>(null);
  const [activeMoveId, setActiveMoveId] = useState<string | null>(null);
  const [position, setPosition] = useState("");
  const [positionError, setPositionError] = useState("");
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const orderRef = useRef(order);
  const dragRef = useRef<DragState | null>(null);
  const draggedIdRef = useRef<string | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const removeListenersRef = useRef<(() => void) | null>(null);
  const moveOpenerRef = useRef<HTMLButtonElement | null>(null);
  const isDirty = !sameOrder(order, initialOrder);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const requestClose = () => {
    if (isDirty) setShowCloseConfirmation(true);
    else onClose();
  };

  const removeDragArtifacts = () => {
    removeListenersRef.current?.();
    previewRef.current?.remove();
    previewRef.current = null;
    dragRef.current = null;
    draggedIdRef.current = null;
    document.body.classList.remove(styles.orderDragInProgress);
    setDraggedId(null);
    setDropTargetId(null);
  };

  const finishDrag = (cancelled = false) => {
    const drag = dragRef.current;
    if (cancelled && drag) setOrder(drag.initialOrder);
    else if (drag?.moved && draggedIdRef.current) {
      setAnnouncement(`Вариант перемещён на позицию ${orderRef.current.indexOf(draggedIdRef.current) + 1}`);
    }
    removeDragArtifacts();
  };

  useModalFocus(dialogRef, () => {
    if (draggedIdRef.current) finishDrag(true);
    else if (activeMoveId) setActiveMoveId(null);
    else requestClose();
  });
  useEffect(() => () => removeDragArtifacts(), []);

  const applyMove = (id: string, index: number) => {
    const next = moveToIndex(orderRef.current, id, index);
    setOrder(next);
    setAnnouncement(`Вариант перемещён на позицию ${next.indexOf(id) + 1}`);
    setActiveMoveId(null);
    window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-gift-order-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const updateDrag = (event: PointerEvent) => {
    const drag = dragRef.current;
    const activeId = draggedIdRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !activeId) return;
    event.preventDefault();
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      drag.moved = true;
      previewRef.current?.classList.add(styles.orderDragPreviewActive);
      setDraggedId(activeId);
      if (event.pointerType === "touch" && "vibrate" in navigator) navigator.vibrate(8);
    }
    if (previewRef.current) previewRef.current.style.transform = `translate3d(${event.clientX - drag.offsetX}px, ${event.clientY - drag.offsetY}px, 0) scale(1.01)`;
    const target = document.elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest<HTMLElement>("[data-gift-order-id]"))
      .find((element) => element?.dataset.giftOrderId && element.dataset.giftOrderId !== activeId);
    const targetId = target?.dataset.giftOrderId;
    if (targetId && target) {
      const rect = target.getBoundingClientRect();
      const targetIndex = orderRef.current.indexOf(targetId) + (event.clientY >= rect.top + rect.height / 2 ? 1 : 0);
      const next = moveToIndex(orderRef.current, activeId, targetIndex > orderRef.current.indexOf(activeId) ? targetIndex - 1 : targetIndex);
      if (next !== orderRef.current) setOrder(next);
      setDropTargetId(targetId);
    }
    const list = listRef.current;
    if (!list) return;
    const bounds = list.getBoundingClientRect();
    const edge = Math.min(96, bounds.height * .22);
    if (event.clientY < bounds.top + edge) list.scrollTop -= Math.ceil(8 + ((bounds.top + edge - event.clientY) / edge) * 18);
    else if (event.clientY > bounds.bottom - edge) list.scrollTop += Math.ceil(8 + ((event.clientY - bounds.bottom + edge) / edge) * 18);
  };

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (event.button !== 0) return;
    const row = event.currentTarget.closest<HTMLElement>("[data-gift-order-id]");
    if (!row) return;
    event.preventDefault();
    const rect = row.getBoundingClientRect();
    const preview = row.cloneNode(true) as HTMLElement;
    preview.removeAttribute("data-gift-order-id");
    preview.setAttribute("aria-hidden", "true");
    preview.classList.add(styles.orderDragPreview);
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;
    document.body.appendChild(preview);
    document.body.classList.add(styles.orderDragInProgress);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, initialOrder: [...orderRef.current], moved: false };
    draggedIdRef.current = id;
    previewRef.current = preview;
    preview.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
    const handleMove = (pointerEvent: PointerEvent) => updateDrag(pointerEvent);
    const handleEnd = (pointerEvent: PointerEvent) => {
      if (dragRef.current?.pointerId !== pointerEvent.pointerId) return;
      finishDrag(pointerEvent.type === "pointercancel");
    };
    window.addEventListener("pointermove", handleMove, { capture: true, passive: false });
    window.addEventListener("pointerup", handleEnd, { capture: true });
    window.addEventListener("pointercancel", handleEnd, { capture: true });
    removeListenersRef.current = () => {
      window.removeEventListener("pointermove", handleMove, { capture: true });
      window.removeEventListener("pointerup", handleEnd, { capture: true });
      window.removeEventListener("pointercancel", handleEnd, { capture: true });
      removeListenersRef.current = null;
    };
  };

  const handleGripKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (keyboardMove?.id === id) {
        setKeyboardMove(null);
        setAnnouncement(`Вариант зафиксирован на позиции ${orderRef.current.indexOf(id) + 1}`);
      } else {
        setKeyboardMove({ id, initialOrder: [...orderRef.current] });
        setAnnouncement("Режим перемещения включён. Используйте стрелки вверх и вниз.");
      }
      return;
    }
    if (keyboardMove?.id !== id) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOrder(keyboardMove.initialOrder);
      setKeyboardMove(null);
      setAnnouncement("Перемещение отменено");
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const currentIndex = orderRef.current.indexOf(id);
    const nextIndex = currentIndex + (event.key === "ArrowUp" ? -1 : 1);
    if (nextIndex >= 0 && nextIndex < orderRef.current.length) {
      setOrder(moveToIndex(orderRef.current, id, nextIndex));
      setAnnouncement(`Позиция ${nextIndex + 1} из ${orderRef.current.length}`);
    }
  };

  const save = () => {
    setError("");
    const formData = new FormData();
    formData.set("manageToken", manageToken);
    formData.set("pollId", poll.id);
    initialOrder.forEach((id) => formData.append("baseOptionIds", id));
    orderRef.current.forEach((id) => formData.append("orderedOptionIds", id));
    startTransition(async () => {
      const result = await reorderGiftPollOptionsAction(initialState, formData);
      if (!result.ok) {
        setShowCloseConfirmation(false);
        setError(result.message || "Не удалось сохранить порядок вариантов.");
        if (/первый голос/i.test(result.message)) router.refresh();
        return;
      }
      router.refresh();
      onSaved(result.message || "Новый порядок вариантов сохранён.");
    });
  };

  const orderedOptions = order.map((id) => byId.get(id)).filter((option): option is GiftPollWithOptions["options"][number] => Boolean(option));
  const handleBackdrop = (event: MouseEvent<HTMLDivElement>) => event.target === event.currentTarget && requestClose();

  return createPortal(<div className={styles.orderEditorBackdrop} onMouseDown={handleBackdrop}>
    <div ref={dialogRef} className={`${styles.orderEditorDialog} ${styles.giftOrderEditorDialog}`} role="dialog" aria-modal="true" aria-labelledby="gift-order-editor-title" aria-hidden={showCloseConfirmation || activeMoveId ? "true" : undefined} tabIndex={-1}>
      <header className={styles.orderEditorHeader}><div><span>Выбор подарка</span><h2 id="gift-order-editor-title">Порядок вариантов</h2><p><span className={styles.orderEditorDesktopHint}>Перетаскивайте варианты за маркер или укажите точную позицию.</span><span className={styles.orderEditorMobileHint}>Зажмите маркер и перетащите вариант. Для дальнего перемещения укажите позицию.</span></p></div><button type="button" onClick={requestClose} aria-label="Закрыть редактор порядка">×</button></header>
      <div ref={listRef} className={styles.orderEditorList}>
        {orderedOptions.map((option, index) => <div key={option.id} data-gift-order-id={option.id} className={[styles.orderEditorRow, styles.giftOrderEditorRow, draggedId === option.id ? styles.orderEditorRowDragging : "", dropTargetId === option.id ? styles.orderEditorRowDropTarget : ""].filter(Boolean).join(" ")}>
          <button type="button" className={styles.orderEditorGrip} aria-label={`Изменить позицию варианта ${option.title}`} aria-pressed={keyboardMove?.id === option.id} onPointerDown={(event) => startDrag(event, option.id)} onKeyDown={(event) => handleGripKeyDown(event, option.id)}>≡</button>
          <span className={styles.orderEditorIndex}>{index + 1}</span>
          {option.imageUrl ? <img className={styles.giftOrderEditorImage} src={option.imageUrl} alt="" /> : <span className={styles.orderEditorAvatar} aria-hidden="true">🎁</span>}
          <div className={styles.orderEditorCopy}><strong>{sanitizeGiftPollText(option.title, 60)}</strong>{option.priceLabel ? <small>{priceWithCurrency(sanitizeGiftPollText(option.priceLabel, 30))}</small> : null}<span>{cleanImportedDescription(option.description, option.title) || "Без описания"}</span></div>
          <button type="button" className={styles.orderEditorMoveButton} aria-haspopup="dialog" onClick={(event) => { moveOpenerRef.current = event.currentTarget; setActiveMoveId(option.id); setPosition(""); setPositionError(""); }}>Переместить…</button>
        </div>)}
      </div>
      <footer className={styles.orderEditorFooter}>{error ? <span role="alert">{error}</span> : <span>{isDirty ? "Есть несохранённые изменения" : "Порядок не изменён"}</span>}<div><button type="button" className={styles.orderEditorCancel} onClick={requestClose} disabled={isPending}>Отмена</button><button type="button" className={styles.orderEditorSave} onClick={save} disabled={isPending || !isDirty} aria-busy={isPending}>{isPending ? "Сохраняем…" : "Сохранить порядок"}</button></div></footer>
    </div>
    {showCloseConfirmation ? <ConfirmationDialog title="Закрыть без сохранения?" description="Внесённые изменения будут потеряны." onDismiss={() => setShowCloseConfirmation(false)} actions={[
      { label: "Продолжить редактирование", tone: "secondary", onClick: () => setShowCloseConfirmation(false) },
      { label: "Выйти без сохранения", tone: "danger", onClick: onClose }
    ]} /> : null}
    {activeMoveId && byId.get(activeMoveId) ? <GiftOptionPositionDialog title={byId.get(activeMoveId)!.title} count={order.length} position={position} error={positionError} onClose={() => { setActiveMoveId(null); window.requestAnimationFrame(() => moveOpenerRef.current?.focus()); }} onPositionChange={(value) => { setPosition(value); const next = Number(value); setPositionError(value && (next < 1 || next > order.length) ? `Укажите позицию от 1 до ${order.length}.` : ""); }} onMoveToStart={() => applyMove(activeMoveId, 0)} onMoveToEnd={() => applyMove(activeMoveId, order.length - 1)} onMove={() => { const next = Number(position); if (!position || next < 1 || next > order.length) { setPositionError(`Укажите позицию от 1 до ${order.length}.`); return; } applyMove(activeMoveId, next - 1); }} /> : null}
    <span className={styles.visuallyHidden} aria-live="polite">{announcement}</span>
  </div>, document.body);
};
