import type { FinalCardBlockId } from "@/lib/final-card/types";

export type CompositionDropPosition = "before" | "after";

export const reorderCompositionBlocks = (
  currentOrder: FinalCardBlockId[],
  draggedBlockId: FinalCardBlockId,
  targetBlockId: FinalCardBlockId,
  position: CompositionDropPosition
) => {
  if (draggedBlockId === targetBlockId || !currentOrder.includes(draggedBlockId)) {
    return currentOrder;
  }

  const withoutDragged = currentOrder.filter((blockId) => blockId !== draggedBlockId);
  const targetIndex = withoutDragged.indexOf(targetBlockId);

  if (targetIndex === -1) {
    return currentOrder;
  }

  const nextOrder = [...withoutDragged];
  const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
  nextOrder.splice(insertIndex, 0, draggedBlockId);

  return nextOrder.every((blockId, index) => blockId === currentOrder[index])
    ? currentOrder
    : nextOrder;
};
