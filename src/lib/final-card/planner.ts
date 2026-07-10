import { finalCardLayouts } from "@/lib/final-card/layouts";
import type {
  FinalCardBlockId,
  FinalCardBlockOrder,
  FinalCardOptionalBlockId,
  FinalCardBlockSettings,
  FinalCardContentAvailability,
  FinalCardLayout,
  FinalCardStyleId
} from "@/lib/final-card/types";

const isBlockAvailable = (blockId: string, availability: FinalCardContentAvailability) => {
  if (blockId === "summary") {
    return availability.hasSummary;
  }

  if (blockId === "qualities") {
    return availability.hasQualities;
  }

  if (blockId === "memories") {
    return availability.hasMemories;
  }

  if (blockId === "quotes") {
    return true;
  }

  if (blockId === "ai-summary") {
    return availability.hasAiSummary;
  }

  return true;
};

export const buildFinalCardLayout = (
  style: FinalCardStyleId,
  availability: FinalCardContentAvailability,
  settings?: FinalCardBlockSettings | null,
  order?: FinalCardBlockOrder | null
): FinalCardLayout => {
  const layout = finalCardLayouts[style];
  const visibleBlocks = layout.blocks.filter((block) => {
    if (block.required) {
      return true;
    }

    const optionalBlockId = block.id as FinalCardOptionalBlockId;
    const isEnabled = settings?.[optionalBlockId] ?? true;
    return isEnabled && isBlockAvailable(block.id, availability);
  });

  if (!order || order.length === 0) {
    return {
      style: layout.style,
      blocks: visibleBlocks
    };
  }

  const orderIndex = new Map<FinalCardBlockId, number>(order.map((blockId, index) => [blockId, index]));
  const sortedBlocks = [...visibleBlocks].sort((left, right) => {
    const leftIndex = orderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = orderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });

  return {
    style: layout.style,
    blocks: sortedBlocks
  };
};
