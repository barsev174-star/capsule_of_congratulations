"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Contribution } from "@/lib/cards/types";
import { reorderContributionsAction } from "./actions";
import { ConfirmationDialog } from "./confirmation-dialog";
import styles from "./manage-page.module.css";
import { useModalFocus } from "./use-modal-focus";
import { moveContributionIdRelative, moveContributionIdToIndex } from "./congratulations-model";

type Props = {
  contributions: Contribution[];
  mainGreetingContributionId: string | null;
  manageToken: string;
  onClose: () => void;
  onSaved: () => void;
};

type DropTarget = { id: string; position: "before" | "after" };
type PointerDrag = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  initialOrder: string[];
  startX: number;
  startY: number;
  hasMoved: boolean;
};

type LastMove = { previousOrder: string[]; movedId: string; position: number };

const initialState = { ok: false, message: "" };

type MoveDialogProps = {
  contribution: Contribution;
  count: number;
  position: string;
  error: string;
  canMove: boolean;
  onPositionChange: (value: string) => void;
  onMove: () => void;
  onMoveToStart: () => void;
  onMoveToEnd: () => void;
  onClose: () => void;
};

const MovePositionDialog = ({ contribution, count, position, error, canMove, onPositionChange, onMove, onMoveToStart, onMoveToEnd, onClose }: MoveDialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(dialogRef, onClose);

  return (
    <div className={styles.orderMoveBackdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} className={styles.orderMoveDialog} role="dialog" aria-modal="true" aria-labelledby="order-move-title" tabIndex={-1}>
        <header>
          <div>
            <h3 id="order-move-title">Переместить поздравление</h3>
            <p><strong>{contribution.authorName}</strong> · {contribution.message}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть">×</button>
        </header>
        <div className={styles.orderEditorQuickActions}>
          <button type="button" onClick={onMoveToStart}>В начало</button>
          <button type="button" onClick={onMoveToEnd}>В конец</button>
        </div>
        <label>
          <span>Позиция от 1 до {count}</span>
          <span className={styles.orderEditorInlineField}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={count}
              value={position}
              aria-invalid={Boolean(error)}
              onChange={(event) => onPositionChange(event.target.value.replace(/\D/g, ""))}
              autoFocus
            />
            <button type="button" onClick={onMove} disabled={!canMove}>Переместить</button>
          </span>
          {error ? <span className={styles.orderMoveError} role="alert">{error}</span> : null}
        </label>
      </div>
    </div>
  );
};

export const ContributionOrderEditor = ({ contributions, mainGreetingContributionId, manageToken, onClose, onSaved }: Props) => {
  const router = useRouter();
  const reorderableContributions = useMemo(
    () => contributions.filter((item) => item.status === "visible" && item.id !== mainGreetingContributionId),
    [contributions, mainGreetingContributionId]
  );
  const initialOrder = useMemo(() => reorderableContributions.map((item) => item.id), [reorderableContributions]);
  const [order, setOrder] = useState(() => initialOrder);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [activeMoveId, setActiveMoveId] = useState<string | null>(null);
  const [position, setPosition] = useState("");
  const [positionError, setPositionError] = useState("");
  const [error, setError] = useState("");
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [keyboardMove, setKeyboardMove] = useState<{ id: string; initialOrder: string[] } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const draggedIdRef = useRef<string | null>(null);
  const dropTargetRef = useRef<DropTarget | null>(null);
  const activePointerDragRef = useRef<PointerDrag | null>(null);
  const dragPreviewRef = useRef<HTMLElement | null>(null);
  const removePointerListenersRef = useRef<(() => void) | null>(null);
  const positionsBeforeReorderRef = useRef<Map<string, DOMRect> | null>(null);
  const moveOpenerRef = useRef<HTMLButtonElement | null>(null);
  const initialKey = initialOrder.join(":");
  const isDirty = order.join(":") !== initialKey;
  const orderRef = useRef(order);
  const byId = useMemo(() => new Map(reorderableContributions.map((item) => [item.id, item])), [reorderableContributions]);
  const ordered = useMemo(
    () => order.map((id) => byId.get(id)).filter((item): item is Contribution => Boolean(item)),
    [byId, order]
  );

  useLayoutEffect(() => {
    orderRef.current = order;
  }, [order]);

  const requestClose = () => {
    if (showCloseConfirmation) return;
    if (isDirty) setShowCloseConfirmation(true);
    else onClose();
  };

  const closeMoveDialog = () => {
    setActiveMoveId(null);
    window.requestAnimationFrame(() => moveOpenerRef.current?.focus());
  };

  const removeDragArtifacts = () => {
    removePointerListenersRef.current?.();
    dragPreviewRef.current?.remove();
    dragPreviewRef.current = null;
    activePointerDragRef.current = null;
    draggedIdRef.current = null;
    dropTargetRef.current = null;
    positionsBeforeReorderRef.current = null;
    document.body.classList.remove(styles.orderDragInProgress);
    setDraggedId(null);
    setDropTarget(null);
  };

  const finishDragging = (restoreInitialDragOrder = false) => {
    const drag = activePointerDragRef.current;
    if (restoreInitialDragOrder && drag) setOrder(drag.initialOrder);
    else if (drag?.hasMoved && draggedIdRef.current) {
      const movedId = draggedIdRef.current;
      const nextPosition = orderRef.current.indexOf(movedId) + 1;
      setLastMove({ previousOrder: drag.initialOrder, movedId, position: nextPosition });
      setAnnouncement(`Поздравление перемещено на позицию ${nextPosition}`);
    }
    removeDragArtifacts();
  };

  useModalFocus(dialogRef, () => {
    if (draggedIdRef.current) finishDragging(true);
    else if (activeMoveId) closeMoveDialog();
    else requestClose();
  });

  useEffect(() => () => removeDragArtifacts(), []);

  useEffect(() => {
    if (!lastMove) return;
    const timer = window.setTimeout(() => setLastMove(null), 3000);
    return () => window.clearTimeout(timer);
  }, [lastMove]);

  useLayoutEffect(() => {
    const previousPositions = positionsBeforeReorderRef.current;
    positionsBeforeReorderRef.current = null;
    if (!draggedId || !previousPositions || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    for (const [id, previousRect] of previousPositions) {
      if (id === draggedId) continue;
      const element = listRef.current?.querySelector<HTMLElement>(`[data-order-id="${id}"]`);
      if (!element) continue;
      const nextRect = element.getBoundingClientRect();
      const deltaY = previousRect.top - nextRect.top;
      if (!deltaY) continue;
      element.animate(
        [{ transform: `translate3d(0, ${deltaY}px, 0)` }, { transform: "translate3d(0, 0, 0)" }],
        { duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }
      );
    }
  }, [order, draggedId]);

  const moveToIndex = (id: string, rawIndex: number) => {
    const previousOrder = [...orderRef.current];
    const nextOrder = moveContributionIdToIndex(previousOrder, id, rawIndex);
    setOrder(nextOrder);
    const nextPosition = nextOrder.indexOf(id) + 1;
    setLastMove({ previousOrder, movedId: id, position: nextPosition });
    setAnnouncement(`Поздравление перемещено на позицию ${nextPosition}`);
    setActiveMoveId(null);
    window.requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-order-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const snapshotPositions = () => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-order-id]") ?? [];
    positionsBeforeReorderRef.current = new Map(
      Array.from(rows).map((row) => [row.dataset.orderId ?? "", row.getBoundingClientRect()])
    );
  };

  const moveDuringDrag = (targetId: string, position: "before" | "after") => {
    const activeId = draggedIdRef.current;
    if (!activeId || activeId === targetId) return;
    snapshotPositions();
    setOrder((current) => {
      const next = moveContributionIdRelative(current, activeId, targetId, position);
      if (next === current) positionsBeforeReorderRef.current = null;
      return next;
    });
    const nextTarget = { id: targetId, position };
    dropTargetRef.current = nextTarget;
    setDropTarget(nextTarget);
  };

  const positionDragPreview = (clientX: number, clientY: number) => {
    const preview = dragPreviewRef.current;
    const drag = activePointerDragRef.current;
    if (!preview || !drag) return;
    preview.style.transform = `translate3d(${clientX - drag.offsetX}px, ${clientY - drag.offsetY}px, 0) scale(1.01)`;
  };

  const updatePointerDrag = (event: PointerEvent) => {
    const drag = activePointerDragRef.current;
    const activeId = draggedIdRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !activeId) return;
    event.preventDefault();
    if (!drag.hasMoved) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      drag.hasMoved = true;
      dragPreviewRef.current?.classList.add(styles.orderDragPreviewActive);
      setDraggedId(activeId);
      if (event.pointerType === "touch" && "vibrate" in navigator) navigator.vibrate(8);
    }
    positionDragPreview(event.clientX, event.clientY);

    const target = document
      .elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest<HTMLElement>("[data-order-id]"))
      .find((element) => element && element.dataset.orderId !== activeId);

    if (target?.dataset.orderId) {
      const rect = target.getBoundingClientRect();
      const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
      const currentTarget = dropTargetRef.current;
      if (currentTarget?.id !== target.dataset.orderId || currentTarget.position !== position) {
        moveDuringDrag(target.dataset.orderId, position);
      }
    }

    const list = listRef.current;
    if (!list) return;
    const listRect = list.getBoundingClientRect();
    const edge = Math.min(96, listRect.height * .22);
    if (event.clientY < listRect.top + edge) {
      const ratio = Math.min(1, (listRect.top + edge - event.clientY) / edge);
      list.scrollTop -= Math.ceil(5 + ratio * 20);
    } else if (event.clientY > listRect.bottom - edge) {
      const ratio = Math.min(1, (event.clientY - (listRect.bottom - edge)) / edge);
      list.scrollTop += Math.ceil(5 + ratio * 20);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (event.button !== 0) return;
    const row = event.currentTarget.closest<HTMLElement>("[data-order-id]");
    if (!row) return;
    event.preventDefault();

    const rect = row.getBoundingClientRect();
    const preview = row.cloneNode(true) as HTMLElement;
    preview.removeAttribute("data-order-id");
    preview.setAttribute("aria-hidden", "true");
    preview.classList.add(styles.orderDragPreview);
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;
    document.body.appendChild(preview);
    document.body.classList.add(styles.orderDragInProgress);

    activePointerDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      initialOrder: [...orderRef.current],
      startX: event.clientX,
      startY: event.clientY,
      hasMoved: false
    };
    draggedIdRef.current = id;
    dragPreviewRef.current = preview;
    positionDragPreview(event.clientX, event.clientY);

    const handleMove = (pointerEvent: PointerEvent) => updatePointerDrag(pointerEvent);
    const handleEnd = (pointerEvent: PointerEvent) => {
      if (activePointerDragRef.current?.pointerId !== pointerEvent.pointerId) return;
      pointerEvent.preventDefault();
      finishDragging(pointerEvent.type === "pointercancel");
    };
    window.addEventListener("pointermove", handleMove, { capture: true, passive: false });
    window.addEventListener("pointerup", handleEnd, { capture: true });
    window.addEventListener("pointercancel", handleEnd, { capture: true });
    removePointerListenersRef.current = () => {
      window.removeEventListener("pointermove", handleMove, { capture: true });
      window.removeEventListener("pointerup", handleEnd, { capture: true });
      window.removeEventListener("pointercancel", handleEnd, { capture: true });
      removePointerListenersRef.current = null;
    };
  };

  const handleGripKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (keyboardMove?.id === id) {
        const nextPosition = orderRef.current.indexOf(id) + 1;
        setLastMove({ previousOrder: keyboardMove.initialOrder, movedId: id, position: nextPosition });
        setAnnouncement(`Поздравление перемещено на позицию ${nextPosition}`);
        setKeyboardMove(null);
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
    if (nextIndex < 0 || nextIndex >= orderRef.current.length) return;
    snapshotPositions();
    const nextOrder = moveContributionIdToIndex(orderRef.current, id, nextIndex);
    setOrder(nextOrder);
    setAnnouncement(`Позиция ${nextIndex + 1} из ${nextOrder.length}`);
  };

  const save = () => {
    setError("");
    const formData = new FormData();
    formData.set("manageToken", manageToken);
    initialOrder.forEach((id) => formData.append("baseContributionIds", id));
    order.forEach((id) => formData.append("orderedContributionIds", id));
    startTransition(async () => {
      const result = await reorderContributionsAction(initialState, formData);
      if (!result.ok) {
        setError(result.message || "Не удалось сохранить порядок. Проверьте соединение и попробуйте ещё раз.");
        return;
      }
      router.refresh();
      onSaved();
    });
  };

  const handleBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) requestClose();
  };

  return createPortal(
    <div className={styles.orderEditorBackdrop} onMouseDown={handleBackdrop}>
      <div
        ref={dialogRef}
        className={styles.orderEditorDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-editor-title"
        aria-hidden={showCloseConfirmation || activeMoveId ? "true" : undefined}
        tabIndex={-1}
      >
        <header className={styles.orderEditorHeader}>
          <div>
            <span>Порядок в открытке</span>
            <h2 id="order-editor-title">Порядок поздравлений</h2>
            <p>
              <span className={styles.orderEditorDesktopHint}>Перетаскивайте поздравления за маркер или сразу укажите нужную позицию.</span>
              <span className={styles.orderEditorMobileHint}>Зажмите маркер и перетащите поздравление. Для дальнего перемещения можно сразу указать позицию.</span>
            </p>
          </div>
          <button type="button" onClick={requestClose} aria-label="Закрыть режим порядка">×</button>
        </header>

        <div ref={listRef} className={styles.orderEditorList}>
          {ordered.map((contribution, index) => (
            <div
              key={contribution.id}
              data-order-id={contribution.id}
              className={[
                styles.orderEditorRow,
                draggedId === contribution.id ? styles.orderEditorRowDragging : "",
                dropTarget?.id === contribution.id ? styles.orderEditorRowDropTarget : "",
                lastMove?.movedId === contribution.id ? styles.orderEditorRowHighlighted : ""
              ].filter(Boolean).join(" ")}
            >
              <button
                type="button"
                className={styles.orderEditorGrip}
                aria-label={`Изменить позицию поздравления ${contribution.authorName}`}
                aria-pressed={keyboardMove?.id === contribution.id}
                onPointerDown={(event) => handlePointerDown(event, contribution.id)}
                onKeyDown={(event) => handleGripKeyDown(event, contribution.id)}
              >
                ≡
              </button>
              <span className={styles.orderEditorIndex}>{index + 1}</span>
              <span className={styles.orderEditorAvatar} aria-hidden="true">
                {contribution.authorName.trim().slice(0, 1).toUpperCase() || "?"}
              </span>
              <div className={styles.orderEditorCopy}>
                <strong>{contribution.authorName}</strong>
                {contribution.authorRole ? <small>{contribution.authorRole}</small> : null}
                <span>{contribution.message}</span>
              </div>
              <button
                type="button"
                className={styles.orderEditorMoveButton}
                aria-haspopup="dialog"
                onClick={(event) => {
                  moveOpenerRef.current = event.currentTarget;
                  setActiveMoveId(contribution.id);
                  setPosition("");
                }}
              >
                Переместить…
              </button>
            </div>
          ))}
        </div>

        <footer className={styles.orderEditorFooter}>
          {error ? <span role="alert">{error}</span> : <span>{isDirty ? "Есть несохранённые изменения" : "Порядок не изменён"}</span>}
          <div>
            <button type="button" className={styles.orderEditorCancel} onClick={requestClose} disabled={isPending}>Отмена</button>
            <button type="button" className={styles.orderEditorSave} onClick={save} disabled={isPending || !isDirty} aria-busy={isPending}>
              {isPending ? "Сохраняем…" : "Сохранить порядок"}
            </button>
          </div>
        </footer>
      </div>

      {showCloseConfirmation ? (
        <ConfirmationDialog
          title="Порядок не сохранён"
          description="Сохранить новый порядок поздравлений перед выходом?"
          onDismiss={() => setShowCloseConfirmation(false)}
          actions={[
            { label: "Сохранить и выйти", onClick: save, disabled: isPending },
            { label: "Продолжить изменение", tone: "secondary", onClick: () => setShowCloseConfirmation(false) },
            { label: "Выйти без сохранения", tone: "danger", onClick: onClose }
          ]}
        />
      ) : null}
      {activeMoveId && byId.get(activeMoveId) ? (
        <MovePositionDialog
          contribution={byId.get(activeMoveId)!}
          count={order.length}
          position={position}
          error={positionError}
          canMove={Boolean(position) && Number(position) >= 1 && Number(position) <= order.length}
          onPositionChange={(value) => {
            setPosition(value);
            const nextPosition = Number(value);
            setPositionError(value && (nextPosition < 1 || nextPosition > order.length)
              ? `Укажите позицию от 1 до ${order.length}.`
              : "");
          }}
          onMoveToStart={() => moveToIndex(activeMoveId, 0)}
          onMoveToEnd={() => moveToIndex(activeMoveId, order.length - 1)}
          onClose={closeMoveDialog}
          onMove={() => {
            const nextPosition = Number(position);
            if (!position || nextPosition < 1 || nextPosition > order.length) {
              setPositionError(`Укажите позицию от 1 до ${order.length}.`);
              return;
            }
            moveToIndex(activeMoveId, nextPosition - 1);
          }}
        />
      ) : null}
      {lastMove ? (
        <div
          key={`${lastMove.movedId}:${lastMove.position}:${lastMove.previousOrder.join(",")}`}
          className={styles.orderEditorToast}
          role="status"
        >
          <span>Поздравление перемещено на позицию {lastMove.position}</span>
          <button type="button" onClick={() => { setOrder(lastMove.previousOrder); setLastMove(null); setAnnouncement("Последнее перемещение отменено"); }}>Отменить</button>
        </div>
      ) : null}
      <span className={styles.visuallyHidden} aria-live="polite">{announcement}</span>
    </div>,
    document.body
  );
};
