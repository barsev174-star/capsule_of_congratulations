"use client";

import { useActionState, useMemo, useState, type DragEvent as ReactDragEvent } from "react";
import type { CardMediaAsset, CardMediaSlot } from "@/lib/cards/types";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type {
  FinalCardBlockId,
  FinalCardMediaSlot,
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout,
  FinalCardOptionalBlockId
} from "@/lib/final-card/types";
import { getManagePath } from "@/lib/routes/card-links";
import { updateFinalPresentationSettingsAction } from "./actions";
import styles from "./manage-page.module.css";

type BlockOption = {
  id: FinalCardOptionalBlockId;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
};

type Props = {
  manageToken: string;
  options: BlockOption[];
  initialLayoutMode: FinalCardMessageLayoutMode;
  initialMediaLayout: FinalCardMessageMediaLayout;
  initialBlockOrder: FinalCardBlockId[];
  mediaAssets: CardMediaAsset[];
  initialMessageMediaSlots: FinalCardMediaSlot[];
  initialMemoryMediaSlots: FinalCardMediaSlot[];
  initialMessageMediaAssetIds: string[];
  initialMemoryMediaAssetIds: string[];
  initialMemoryPhotoCount: 2 | 3;
  initialMemoryTitle: string;
  initialMemoryDescription: string;
  requiredBlockIds: FinalCardBlockId[];
  initialMainGreetingContributionId: string | null;
  mainGreetingStatusText: string;
};

type RenderedBlock = {
  id: FinalCardBlockId;
  label: string;
  description: string;
  removable: boolean;
};

type DropTarget = {
  blockId: FinalCardBlockId;
  position: "before" | "after";
};

type ExpandedState = Partial<Record<FinalCardBlockId, boolean>>;

const initialState = {
  ok: false,
  message: ""
};

const layoutOptions: Array<{
  id: FinalCardMessageLayoutMode;
  label: string;
  description: string;
}> = [
  { id: "grid-2", label: "Сетка 2 на 2", description: "Карточки в сетке 2х2." },
  { id: "carousel-1", label: "Один ряд", description: "Карточки в одну линию." },
  { id: "carousel-2", label: "Два ряда", description: "Сначала один ряд, затем второй." },
  { id: "column-media", label: "Колонка + фото", description: "Текст поздравления справа, фото слева." }
];

const mediaLayoutOptions: Array<{
  id: FinalCardMessageMediaLayout;
  label: string;
}> = [
  { id: "portrait", label: "1 Вертикальное фото" },
  { id: "landscape-pair", label: "2 Горизонтальных фото" },
  { id: "landscape-trio", label: "3 горизонтальных фото" }
];

const mediaSlotsByLayout: Record<FinalCardMessageMediaLayout, CardMediaSlot[]> = {
  portrait: ["portrait"],
  "landscape-pair": ["landscape-a", "landscape-b"],
  "landscape-trio": ["landscape-a", "landscape-b", "landscape-c"]
};

const horizontalMediaSlots: CardMediaSlot[] = [
  "landscape-a",
  "landscape-b",
  "landscape-c",
  "memory-a",
  "memory-b",
  "memory-c"
];

const memorySlotCount = 3;

const slotLabelMap: Record<CardMediaSlot, string> = {
  portrait: "Вертикальное фото",
  "landscape-a": "Фото поздравлений 1",
  "landscape-b": "Фото поздравлений 2",
  "landscape-c": "Фото поздравлений 3",
  "memory-a": "Воспоминание 1",
  "memory-b": "Воспоминание 2",
  "memory-c": "Воспоминание 3"
};

const blockMeta: Record<
  FinalCardBlockId,
  {
    label: string;
    summary: string;
    details: string;
  }
> = {
  hero: {
    label: "Обложка",
    summary: "Первый экран с именем получателя и настроением открытки.",
    details: "Обязательный блок. Он открывает открытку и задаёт первое впечатление."
  },
  summary: {
    label: "Главное поздравление",
    summary: "Выбранное поздравление, которое станет большим личным блоком в открытке.",
    details: "Обязательный блок. Выберите поздравление во вкладке «Поздравления и фото», и оно появится в открытке как «Самые важные слова»."
  },
  qualities: {
    label: "Качества",
    summary: "Показывает, за что именно любят и ценят человека.",
    details: "Собирает повторяющиеся тёплые формулировки и превращает их в отдельный ритмичный блок."
  },
  messages: {
    label: "Поздравления",
    summary: "Главный блок с карточками поздравлений от участников.",
    details: "Обязательный блок. Здесь настраивается сетка поздравлений и медиаблок рядом с ними."
  },
  memories: {
    label: "Моменты",
    summary: "Секция для ярких фото, коротких подписей и общей визуальной истории.",
    details: "Можно добавить до трех фото из загруженных материалов. Подписи показываются в одну строку, чтобы блок оставался легким и похожим на живую галерею."
  },
  quotes: {
    label: "Лучшие фразы",
    summary: "Сильные и тёплые строки из поздравлений участников.",
    details: "Подходит как акцентный эмоциональный блок между основными секциями открытки."
  },
  "ai-summary": {
    label: "Общее поздравление",
    summary: "Общее обращение от всей группы.",
    details: "Сводный аккорд, который собирает настроение всех поздравлений в один тёплый текст."
  },
  closing: {
    label: "Финал",
    summary: "Завершение открытки и общее тёплое пожелание.",
    details: "Обязательный блок. Он завершает сценарий и оставляет финальное впечатление."
  }
};

const fixedBlockIds: FinalCardBlockId[] = ["hero", "closing"];

const buildRequiredCanvasBlock = (blockId: FinalCardBlockId): RenderedBlock => ({
  id: blockId,
  label: blockMeta[blockId].label,
  description: blockMeta[blockId].summary,
  removable: false
});

const buildCanvasBlocks = (
  options: BlockOption[],
  blockState: Record<string, boolean>,
  requiredBlockIds: FinalCardBlockId[]
): RenderedBlock[] => [
  {
    id: "hero",
    label: blockMeta.hero.label,
    description: blockMeta.hero.summary,
    removable: false
  },
  ...requiredBlockIds
    .filter((blockId) => !["hero", "messages", "closing"].includes(blockId))
    .map((blockId) => buildRequiredCanvasBlock(blockId)),
  ...options
    .filter((option) => !option.disabled && blockState[option.id])
    .map((option) => ({
      id: option.id as FinalCardBlockId,
      label: option.label,
      description: blockMeta[option.id].summary,
      removable: true
    })),
  {
    id: "messages",
    label: blockMeta.messages.label,
    description: blockMeta.messages.summary,
    removable: false
  },
  {
    id: "closing",
    label: blockMeta.closing.label,
    description: blockMeta.closing.summary,
    removable: false
  }
];

const initialExpandedState: ExpandedState = {
  messages: true
};

const iconStrokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

const GripIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M7 4.5h.01M7 10h.01M7 15.5h.01M13 4.5h.01M13 10h.01M13 15.5h.01" {...iconStrokeProps} />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <rect x="4.5" y="9" width="11" height="7" rx="2.2" {...iconStrokeProps} />
    <path d="M7 9V7.4A3 3 0 0 1 10 4.5a3 3 0 0 1 3 2.9V9" {...iconStrokeProps} />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className={expanded ? styles.chevronIconExpanded : ""}>
    <path d="m5.5 7.5 4.5 4.5 4.5-4.5" {...iconStrokeProps} />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="m5.5 10.2 2.8 2.8 6.2-6.2" {...iconStrokeProps} />
  </svg>
);

const BlockIcon = ({ blockId }: { blockId: FinalCardBlockId }) => {
  if (blockId === "hero") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <rect x="3.5" y="4.5" width="13" height="11" rx="2.5" {...iconStrokeProps} />
        <path d="M6.5 12 9 9.5 11.3 11.7 13.5 9.5l2 2.5" {...iconStrokeProps} />
        <circle cx="7.2" cy="7.5" r="1.1" {...iconStrokeProps} />
      </svg>
    );
  }

  if (blockId === "summary") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5 6.2A2.7 2.7 0 0 1 7.7 3.5h4.6A2.7 2.7 0 0 1 15 6.2v4.1a2.7 2.7 0 0 1-2.7 2.7H9l-3.2 2V13A2.7 2.7 0 0 1 5 10.4Z" {...iconStrokeProps} />
      </svg>
    );
  }

  if (blockId === "quotes") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M6.8 8.3c0-2 1.1-3.4 2.7-4.3-.6 1-.8 1.8-.8 2.8 0 1.2.8 2.1 2 2.1a2.2 2.2 0 0 1 2.1 2.4 2.8 2.8 0 0 1-2.9 2.9c-1.8 0-3.1-1.4-3.1-3.9Zm6.4 0c0-2 1.1-3.4 2.7-4.3-.6 1-.8 1.8-.8 2.8 0 1.2.8 2.1 2 2.1a2.2 2.2 0 0 1 2.1 2.4 2.8 2.8 0 0 1-2.9 2.9c-1.8 0-3.1-1.4-3.1-3.9Z" {...iconStrokeProps} />
      </svg>
    );
  }

  if (blockId === "ai-summary") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M6.1 9.1a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Zm7.8 0a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2ZM2.8 15.5c.5-2.2 2.3-3.4 4.3-3.4s3.8 1.2 4.3 3.4M8.6 15.5c.5-2.2 2.3-3.4 4.3-3.4s3.8 1.2 4.3 3.4" {...iconStrokeProps} />
      </svg>
    );
  }

  if (blockId === "messages") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 16.2s-5.7-3.4-5.7-7.7a3.1 3.1 0 0 1 5.2-2.3l.5.5.5-.5a3.1 3.1 0 0 1 5.2 2.3c0 4.3-5.7 7.7-5.7 7.7Z" {...iconStrokeProps} />
      </svg>
    );
  }

  if (blockId === "closing") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="m10 3.5 1.2 3.4L14.5 8l-3.3 1.1L10 12.5 8.8 9.1 5.5 8l3.3-1.1L10 3.5Zm5 9 0 0M15 12.5l.5 1.4 1.5.5-1.5.5-.5 1.6-.5-1.6-1.5-.5 1.5-.5.5-1.4ZM4.5 11.8l.4 1 1 .4-1 .3-.4 1.1-.3-1.1-1.1-.3 1.1-.4.3-1Z" {...iconStrokeProps} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.5 10h11M10 4.5v11" {...iconStrokeProps} />
    </svg>
  );
};

const LayoutDiagram = ({ mode }: { mode: FinalCardMessageLayoutMode }) => {
  if (mode === "grid-2") {
    return (
      <div className={styles.layoutDiagramGrid}>
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (mode === "carousel-1") {
    return (
      <div className={styles.layoutDiagramRow}>
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (mode === "carousel-2") {
    return (
      <div className={styles.layoutDiagramRows}>
        <div>
          <span />
          <span />
        </div>
        <div>
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layoutDiagramColumnMedia}>
      <div className={styles.layoutDiagramColumnMediaPhoto} />
      <div className={styles.layoutDiagramColumnMediaText}>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
};

const getAssetLabel = (asset: CardMediaAsset) =>
  asset.captionTitle || asset.captionSubtitle || slotLabelMap[asset.slot] || "Фото";

const normalizeSelectedSlots = (
  selectedSlots: FinalCardMediaSlot[],
  allowedSlots: CardMediaSlot[],
  fallbackCount: number
) => {
  const allowed = new Set(allowedSlots);
  const filtered = selectedSlots.filter((slot): slot is CardMediaSlot => allowed.has(slot as CardMediaSlot));
  const fallback = allowedSlots.slice(0, fallbackCount);
  return [...filtered, ...fallback.filter((slot) => !filtered.includes(slot))].slice(0, fallbackCount);
};

const normalizeSelectedAssetIds = (
  assets: CardMediaAsset[],
  selectedAssetIds: string[],
  legacySelectedSlots: FinalCardMediaSlot[],
  allowedSlots: CardMediaSlot[],
  fallbackCount: number
) => {
  const allowed = new Set(allowedSlots);
  const allowedAssets = assets.filter((asset) => allowed.has(asset.slot));
  const selected = selectedAssetIds.filter((id) => allowedAssets.some((asset) => asset.id === id));
  const legacySlots = normalizeSelectedSlots(legacySelectedSlots, allowedSlots, fallbackCount);
  const legacyIds = legacySlots
    .map((slot) => allowedAssets.find((asset) => asset.slot === slot)?.id)
    .filter((id): id is string => Boolean(id));
  const fallbackIds = allowedAssets.map((asset) => asset.id);

  return [...selected, ...legacyIds, ...fallbackIds]
    .filter((id, index, list) => list.indexOf(id) === index)
    .slice(0, fallbackCount);
};

const PhotoSequencePicker = ({
  title,
  description,
  assets,
  allowedSlots,
  slotCount,
  selectedAssetIds,
  legacySelectedSlots,
  onChange
}: {
  title: string;
  description: string;
  assets: CardMediaAsset[];
  allowedSlots: CardMediaSlot[];
  slotCount: number;
  selectedAssetIds: string[];
  legacySelectedSlots: FinalCardMediaSlot[];
  onChange: (assetIds: string[]) => void;
}) => {
  const allowed = new Set(allowedSlots);
  const availableAssets = assets.filter((asset) => allowed.has(asset.slot));
  const normalizedAssetIds = normalizeSelectedAssetIds(
    assets,
    selectedAssetIds,
    legacySelectedSlots,
    allowedSlots,
    slotCount
  );

  const updateAsset = (index: number, nextAssetId: string) => {
    const next = [...normalizedAssetIds];
    next[index] = nextAssetId;
    onChange(next);
  };

  return (
    <section className={styles.photoSequencePanel}>
      <div className={styles.photoSequenceHeader}>
        <div>
          <h4 className={styles.messageSettingsTitle}>{title}</h4>
          <p>{description}</p>
        </div>
        <span>{availableAssets.length} фото доступно</span>
      </div>

      {availableAssets.length === 0 ? (
        <p className={styles.photoSequenceEmpty}>Сначала загрузите фото во вкладке «Поздравления и фото».</p>
      ) : (
        <div className={styles.photoSequenceList}>
          {normalizedAssetIds.map((assetId, index) => {
            const selectedAsset = assets.find((asset) => asset.id === assetId);

            return (
              <label key={`${assetId}-${index}`} className={styles.photoSequenceRow}>
                <span>Позиция {index + 1}</span>
                <select value={assetId} onChange={(event) => updateAsset(index, event.target.value)}>
                  {availableAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {getAssetLabel(asset)}
                    </option>
                  ))}
                </select>
                {selectedAsset ? (
                  <span className={styles.photoSequencePreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedAsset.publicUrl} alt={getAssetLabel(selectedAsset)} />
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
};

export const BlockSettingsForm = ({
  manageToken,
  options,
  initialLayoutMode,
  initialMediaLayout,
  initialBlockOrder,
  mediaAssets,
  initialMessageMediaSlots,
  initialMemoryMediaSlots,
  initialMessageMediaAssetIds,
  initialMemoryMediaAssetIds,
  initialMemoryPhotoCount,
  initialMemoryTitle,
  initialMemoryDescription,
  requiredBlockIds,
  initialMainGreetingContributionId,
  mainGreetingStatusText
}: Props) => {
  const [state, formAction, isPending] = useActionState(updateFinalPresentationSettingsAction, initialState);
  const [layoutMode, setLayoutMode] = useState<FinalCardMessageLayoutMode>(initialLayoutMode);
  const [mediaLayout, setMediaLayout] = useState<FinalCardMessageMediaLayout>(initialMediaLayout);
  const [blockState, setBlockState] = useState<Record<string, boolean>>(
    Object.fromEntries(options.map((option) => [option.id, option.checked]))
  );
  const [blockOrder, setBlockOrder] = useState<FinalCardBlockId[]>(initialBlockOrder);
  const [messageMediaSlots] = useState<FinalCardMediaSlot[]>(initialMessageMediaSlots);
  const [memoryMediaSlots] = useState<FinalCardMediaSlot[]>(initialMemoryMediaSlots);
  const [messageMediaAssetIds, setMessageMediaAssetIds] = useState<string[]>(initialMessageMediaAssetIds);
  const [memoryMediaAssetIds, setMemoryMediaAssetIds] = useState<string[]>(initialMemoryMediaAssetIds);
  const [memoryPhotoCount, setMemoryPhotoCount] = useState<2 | 3>(initialMemoryPhotoCount);
  const [memoryTitle, setMemoryTitle] = useState(initialMemoryTitle);
  const [memoryDescription, setMemoryDescription] = useState(initialMemoryDescription);
  const [draggedBlockId, setDraggedBlockId] = useState<FinalCardBlockId | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<ExpandedState>(initialExpandedState);

  const activeBlocks = useMemo(
    () => buildCanvasBlocks(options, blockState, requiredBlockIds),
    [blockState, options, requiredBlockIds]
  );

  const canvasBlocks = useMemo(() => {
    const activeMap = new Map(activeBlocks.map((block) => [block.id, block]));
    return blockOrder
      .map((blockId) => activeMap.get(blockId))
      .filter((block): block is RenderedBlock => Boolean(block));
  }, [activeBlocks, blockOrder]);

  const removedOptionalBlocks = blockOrder
    .filter((blockId) => !requiredBlockIds.includes(blockId) && !blockState[blockId])
    .map((blockId) => options.find((option) => option.id === blockId))
    .filter((option): option is BlockOption => Boolean(option));
  const activeMessageMediaSlots = mediaSlotsByLayout[mediaLayout];
  const activeMessagePickerSlots = mediaLayout === "portrait" ? activeMessageMediaSlots : horizontalMediaSlots;

  const resolveDropPosition = (
    targetBlockId: FinalCardBlockId,
    pointerPosition: "before" | "after"
  ): "before" | "after" => {
    if (targetBlockId === "hero") {
      return "after";
    }

    if (targetBlockId === "closing") {
      return "before";
    }

    return pointerPosition;
  };

  const moveBlock = (targetBlockId: FinalCardBlockId, pointerPosition: "before" | "after") => {
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      return;
    }

    const targetPosition = resolveDropPosition(targetBlockId, pointerPosition);

    setBlockOrder((current) => {
      const withoutDragged = current.filter((blockId) => blockId !== draggedBlockId);
      const targetIndex = withoutDragged.indexOf(targetBlockId);

      if (targetIndex === -1) {
        return current;
      }

      const next = [...withoutDragged];
      const insertIndex = targetPosition === "after" ? targetIndex + 1 : targetIndex;
      next.splice(insertIndex, 0, draggedBlockId);
      return next;
    });

    setDraggedBlockId(null);
    setDropTarget(null);
  };

  const handleDragStart = (event: ReactDragEvent<HTMLButtonElement>, blockId: FinalCardBlockId) => {
    setDraggedBlockId(blockId);
    setDropTarget(null);
    event.dataTransfer.effectAllowed = "move";

    const card = event.currentTarget.closest("article");

    if (card instanceof HTMLElement) {
      const rect = card.getBoundingClientRect();
      event.dataTransfer.setDragImage(card, event.clientX - rect.left, event.clientY - rect.top);
    }
  };

  const handleDragOver = (event: ReactDragEvent<HTMLElement>, blockId: FinalCardBlockId) => {
    if (!draggedBlockId || draggedBlockId === blockId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const pointerPosition = event.clientY < midpoint ? "before" : "after";
    const targetPosition = resolveDropPosition(blockId, pointerPosition);

    setDropTarget((current) => {
      if (current?.blockId === blockId && current.position === targetPosition) {
        return current;
      }

      return { blockId, position: targetPosition };
    });
  };

  const handleDragLeave = (event: ReactDragEvent<HTMLElement>, blockId: FinalCardBlockId) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setDropTarget((current) => (current?.blockId === blockId ? null : current));
  };

  const handleDrop = (event: ReactDragEvent<HTMLElement>, blockId: FinalCardBlockId) => {
    event.preventDefault();

    if (!draggedBlockId || draggedBlockId === blockId || !dropTarget || dropTarget.blockId !== blockId) {
      setDropTarget(null);
      return;
    }

    moveBlock(blockId, dropTarget.position);
  };

  const toggleExpanded = (blockId: FinalCardBlockId) => {
    setExpandedBlocks((current) => ({
      ...current,
      [blockId]: !current[blockId]
    }));
  };

  const toggleBlock = (blockId: FinalCardBlockId, nextValue: boolean) => {
    setBlockState((current) => ({
      ...current,
      [blockId]: nextValue
    }));
  };

  return (
    <form action={formAction} className={styles.studioForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <input type="hidden" name="layoutMode" value={layoutMode} />
      <input type="hidden" name="mediaLayout" value={mediaLayout} />
      <input type="hidden" name="memoryTitle" value={memoryTitle} />
      <input type="hidden" name="memoryDescription" value={memoryDescription} />
      <input type="hidden" name="memoryPhotoCount" value={memoryPhotoCount} />
      <input type="hidden" name="mainGreetingContributionId" value={initialMainGreetingContributionId ?? ""} />

      {normalizeSelectedSlots(messageMediaSlots, activeMessageMediaSlots, activeMessageMediaSlots.length).map((slot, index) => (
        <input key={`message-media-${slot}-${index}`} type="hidden" name="messageMediaSlots" value={slot} />
      ))}

      {normalizeSelectedAssetIds(
        mediaAssets,
        messageMediaAssetIds,
        messageMediaSlots,
        activeMessagePickerSlots,
        activeMessageMediaSlots.length
      ).map((assetId, index) => (
        <input key={`message-media-asset-${assetId}-${index}`} type="hidden" name="messageMediaAssetIds" value={assetId} />
      ))}

      {normalizeSelectedSlots(memoryMediaSlots, ["memory-a", "memory-b", "memory-c"], memorySlotCount).map((slot, index) => (
        <input key={`memory-media-${slot}-${index}`} type="hidden" name="memoryMediaSlots" value={slot} />
      ))}

      {normalizeSelectedAssetIds(
        mediaAssets,
        memoryMediaAssetIds,
        memoryMediaSlots,
        horizontalMediaSlots,
        memoryPhotoCount
      ).map((assetId, index) => (
        <input key={`memory-media-asset-${assetId}-${index}`} type="hidden" name="memoryMediaAssetIds" value={assetId} />
      ))}

      {blockOrder.map((blockId) => (
        <input key={blockId} type="hidden" name="blockOrder" value={blockId} />
      ))}

      {options.map((option) => (
        <input key={option.id} type="hidden" name={option.id} value={blockState[option.id] ? "on" : ""} />
      ))}

      <section className={styles.studioCanvasCard}>
        <div className={styles.compositionToolbar}>
          <p className={styles.compositionToolbarText}>
            Перетаскивайте блоки, чтобы менять их порядок. Обязательные блоки отключить нельзя.
          </p>
          <button type="button" className={styles.compositionHelpLink}>
            Как это работает?
          </button>
        </div>

        <div className={styles.compositionList}>
          {canvasBlocks.map((block) => {
            const isExpanded = Boolean(expandedBlocks[block.id]);
            const isRequired = requiredBlockIds.includes(block.id);
            const isFixed = fixedBlockIds.includes(block.id);
            const isEnabled = isRequired || blockState[block.id];

            return (
              <article
                key={block.id}
                className={[
                  styles.compositionRow,
                  draggedBlockId === block.id ? styles.compositionRowDragging : "",
                  dropTarget?.blockId === block.id ? styles.compositionRowDropTarget : "",
                  dropTarget?.blockId === block.id && dropTarget.position === "before" ? styles.compositionRowDropBefore : "",
                  dropTarget?.blockId === block.id && dropTarget.position === "after" ? styles.compositionRowDropAfter : "",
                  isExpanded ? styles.compositionRowExpanded : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(event) => handleDragOver(event, block.id)}
                onDragLeave={(event) => handleDragLeave(event, block.id)}
                onDrop={(event) => handleDrop(event, block.id)}
              >
                <div className={styles.compositionRowHeader}>
                  <div className={styles.compositionRowLead}>
                    <button
                      type="button"
                      className={styles.compositionGrip}
                      draggable={!isFixed}
                      disabled={isFixed}
                      onDragStart={(event) => handleDragStart(event, block.id)}
                      onDragEnd={() => {
                        setDraggedBlockId(null);
                        setDropTarget(null);
                      }}
                      aria-label={isFixed ? `${block.label} зафиксирован` : `Перетащить блок ${block.label}`}
                    >
                      <GripIcon />
                    </button>

                    <span className={styles.compositionIconBox}>
                      <BlockIcon blockId={block.id} />
                    </span>

                    <div className={styles.compositionText}>
                      <strong className={styles.compositionTitle}>{block.label}</strong>
                      <p className={styles.compositionDescription}>{block.description}</p>
                    </div>
                  </div>

                  <div className={styles.compositionControls}>
                    {isRequired ? (
                      <>
                        <span className={styles.requiredBadge}>Обязательный</span>
                        <span className={styles.lockIconWrap}>
                          <LockIcon />
                        </span>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={`${styles.modernToggle} ${isEnabled ? styles.modernToggleActive : ""}`}
                        onClick={() => toggleBlock(block.id, !isEnabled)}
                        aria-pressed={isEnabled}
                        aria-label={isEnabled ? `Отключить блок ${block.label}` : `Включить блок ${block.label}`}
                      >
                        <span className={styles.modernToggleKnob} />
                      </button>
                    )}

                    <button
                      type="button"
                      className={styles.chevronButton}
                      onClick={() => toggleExpanded(block.id)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? `Свернуть ${block.label}` : `Развернуть ${block.label}`}
                    >
                      <ChevronIcon expanded={isExpanded} />
                    </button>
                  </div>
                </div>

                <div className={`${styles.compositionAccordion} ${isExpanded ? styles.compositionAccordionOpen : ""}`}>
                  <div className={styles.compositionAccordionInner}>
                    <p className={styles.compositionDetails}>{blockMeta[block.id].details}</p>

                    {block.id === "summary" ? (
                      <div className={styles.messageSettings}>
                        <div className={styles.messageSettingsGroup}>
                          <h4 className={styles.messageSettingsTitle}>Главное поздравление</h4>
                          <p>{mainGreetingStatusText}</p>
                          <a className={styles.previewSecondaryLink} href={`${getManagePath(manageToken)}?tab=content`}>
                            Выбрать поздравление
                          </a>
                        </div>
                      </div>
                    ) : null}

                    {block.id === "messages" ? (
                      <div className={styles.messageSettings}>
                        <div className={styles.messageSettingsGroup}>
                          <h4 className={styles.messageSettingsTitle}>Выберите вид отображения поздравлений</h4>
                          <div className={styles.layoutCardGrid}>
                            {layoutOptions.map((option) => {
                              const profile = getFinalCardMessageLayoutProfile(option.id);
                              const selected = layoutMode === option.id;

                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  className={`${styles.layoutCard} ${selected ? styles.layoutCardActive : ""}`}
                                  onClick={() => setLayoutMode(option.id)}
                                >
                                  <span className={styles.layoutCardCheck}>{selected ? <CheckIcon /> : null}</span>
                                  <span className={styles.layoutCardDiagram}>
                                    <LayoutDiagram mode={option.id} />
                                  </span>
                                  <span className={styles.layoutCardTitle}>{option.label}</span>
                                  <span className={styles.layoutCardDescription}>{option.description}</span>
                                  <span className={styles.layoutCardMeta}>До {profile.maxChars} символов</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {layoutMode === "column-media" ? (
                          <div className={styles.messageSettingsGroup}>
                            <h4 className={styles.messageSettingsTitle}>Как выглядит медиаблок рядом с поздравлением</h4>
                            <div className={styles.mediaVariantTabs}>
                              {mediaLayoutOptions.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  className={`${styles.mediaVariantTab} ${mediaLayout === option.id ? styles.mediaVariantTabActive : ""}`}
                                  onClick={() => setMediaLayout(option.id)}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          <PhotoSequencePicker
                              title="Фото и последовательность"
                              description="Выберите, какие фото и в каком порядке попадут рядом с поздравлениями."
                              assets={mediaAssets}
                              allowedSlots={activeMessagePickerSlots}
                              slotCount={activeMessageMediaSlots.length}
                              selectedAssetIds={messageMediaAssetIds}
                              legacySelectedSlots={messageMediaSlots}
                              onChange={setMessageMediaAssetIds}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {block.id === "memories" ? (
                      <div className={styles.messageSettings}>
                        <div className={styles.messageSettingsGroup}>
                          <h4 className={styles.messageSettingsTitle}>Общая подпись блока</h4>
                          <div className={styles.memoryCaptionFields}>
                            <label>
                              <span>Заголовок</span>
                              <input
                                value={memoryTitle}
                                onChange={(event) => setMemoryTitle(event.target.value)}
                                maxLength={80}
                                className={styles.memoryCaptionInput}
                              />
                            </label>
                            <label>
                              <span>Описание</span>
                              <textarea
                                value={memoryDescription}
                                onChange={(event) => setMemoryDescription(event.target.value)}
                                maxLength={180}
                                className={styles.memoryCaptionTextarea}
                              />
                            </label>
                          </div>
                        </div>
                        <div className={styles.mediaVariantTabs}>
                          {[2, 3].map((count) => (
                            <button
                              key={count}
                              type="button"
                              className={`${styles.mediaVariantTab} ${memoryPhotoCount === count ? styles.mediaVariantTabActive : ""}`}
                              onClick={() => setMemoryPhotoCount(count as 2 | 3)}
                            >
                              {count} фото
                            </button>
                          ))}
                        </div>
                        <PhotoSequencePicker
                          title="Фото и последовательность"
                          description="Выберите до трех фото для блока воспоминаний."
                          assets={mediaAssets}
                          allowedSlots={horizontalMediaSlots}
                          slotCount={memoryPhotoCount}
                          selectedAssetIds={memoryMediaAssetIds}
                          legacySelectedSlots={memoryMediaSlots}
                          onChange={setMemoryMediaAssetIds}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className={styles.restoreZone}>
          <div className={styles.restoreZoneHeader}>
            <h4 className={styles.restoreZoneTitle}>Добавить необязательный блок</h4>
          </div>

          {removedOptionalBlocks.length === 0 ? (
            <p className={styles.restoreEmptyText}>Сейчас все доступные дополнительные блоки уже включены в открытку.</p>
          ) : (
            <>
              <div className={styles.restoreAddButton}>
                <span>+</span>
                <span>Добавить необязательный блок</span>
              </div>
              <div className={styles.restoreChipList}>
                {removedOptionalBlocks.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.restoreChip} ${option.disabled ? styles.restoreChipDisabled : ""}`}
                    onClick={() => toggleBlock(option.id, true)}
                    disabled={option.disabled}
                  >
                    <span className={styles.restoreChipIcon}>
                      <BlockIcon blockId={option.id} />
                    </span>
                    <span className={styles.restoreChipText}>
                      <span className={styles.restoreChipLabel}>{option.label}</span>
                      <span className={styles.restoreChipDescription}>
                        {option.disabled ? "Сначала нужен контент для этого блока." : option.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <div className={styles.editorFooter}>
        <button type="submit" className={styles.button} disabled={isPending}>
          {isPending ? "Сохраняем..." : "Сохранить состав открытки"}
        </button>
        {state.message ? (
          <span className={state.ok ? styles.editorSuccess : styles.editorError}>{state.message}</span>
        ) : null}
      </div>
    </form>
  );
};
