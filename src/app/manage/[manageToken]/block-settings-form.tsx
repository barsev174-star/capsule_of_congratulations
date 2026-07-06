"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type DragEvent as ReactDragEvent } from "react";
import { useRouter } from "next/navigation";
import type { CardMediaAsset, CardMediaSlot } from "@/lib/cards/types";
import type { AiUsage } from "@/lib/ai/types";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type {
  FinalCardBlockId,
  FinalCardMediaSlot,
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout,
  FinalCardOptionalBlockId
} from "@/lib/final-card/types";
import { getManagePath } from "@/lib/routes/card-links";
import { generateBestQuotesAction, generateQualitiesAction, updateFinalPresentationSettingsAction } from "./actions";
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
  initialBestQuotes: string[];
  bestQuotesAreStale: boolean;
  canGenerateBestQuotes: boolean;
  initialQualities: string[];
  qualitiesAreStale: boolean;
  canGenerateQualities: boolean;
  initialAiUsage: AiUsage;
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
  { id: "carousel-1", label: "В один ряд", description: "До 340 символов" },
  { id: "carousel-2", label: "В два ряда", description: "До 280 символов" },
  { id: "grid-2", label: "Сетка 2x2", description: "До 280 символов" },
  { id: "column-media", label: "Колонка + фото", description: "Текст поздравления справа, фото слева." }
];

const mediaLayoutOptions: Array<{
  id: FinalCardMessageMediaLayout;
  label: string;
  description: string;
}> = [
  { id: "portrait", label: "+ 1 вертикальное фото", description: "До 280 символов" },
  { id: "landscape-pair", label: "+ 2 горизонтальных фото", description: "До 280 символов" },
  { id: "landscape-trio", label: "+ 3 горизонтальных фото", description: "До 280 символов" }
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
    details: "Первый экран: имя получателя и настроение открытки."
  },
  summary: {
    label: "Главное поздравление",
    summary: "Выбранное поздравление, которое станет большим личным блоком в открытке.",
    details: "Выбранное поздравление станет большим личным блоком."
  },
  qualities: {
    label: "Качества",
    summary: "Показывает, за что именно любят и ценят человека.",
    details: "Показывает, за что любят и ценят человека."
  },
  messages: {
    label: "Поздравления",
    summary: "Главный блок с карточками поздравлений от участников.",
    details: "Здесь настраивается сетка поздравлений и фото рядом с ними."
  },
  memories: {
    label: "Моменты",
    summary: "Секция для ярких фото, коротких подписей и общей визуальной истории.",
    details: "До трёх фото с короткими подписями."
  },
  quotes: {
    label: "Лучшие фразы",
    summary: "Сильные и тёплые строки из поздравлений участников.",
    details: "Самые сильные короткие строки из поздравлений."
  },
  "ai-summary": {
    label: "Общее поздравление",
    summary: "Общее обращение от всей группы.",
    details: "Общий тёплый текст от всей группы."
  },
  closing: {
    label: "Финал",
    summary: "Завершение открытки и общее тёплое пожелание.",
    details: "Финальное пожелание в конце открытки."
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
  messages: false
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

const ArrowIcon = ({ direction }: { direction: "up" | "down" }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className={direction === "down" ? styles.moveIconDown : ""}>
    <path d="M10 15V5.5" {...iconStrokeProps} />
    <path d="m6.2 9.2 3.8-3.8 3.8 3.8" {...iconStrokeProps} />
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
          <span />
        </div>
        <div>
          <span />
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

const MediaLayoutDiagram = ({ mode }: { mode: FinalCardMessageMediaLayout }) => {
  const photoCount = mode === "portrait" ? 1 : mode === "landscape-pair" ? 2 : 3;

  return (
    <div className={styles.mediaLayoutDiagram} data-media-layout={mode}>
      <div className={styles.mediaLayoutMessages}>
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className={styles.mediaLayoutPhotos}>
        {Array.from({ length: photoCount }).map((_, index) => (
          <span key={index} />
        ))}
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
  mainGreetingStatusText,
  initialBestQuotes,
  bestQuotesAreStale,
  canGenerateBestQuotes,
  initialQualities,
  qualitiesAreStale,
  canGenerateQualities,
  initialAiUsage
}: Props) => {
  const router = useRouter();
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
  const [memoryMediaAssetIds] = useState<string[]>(initialMemoryMediaAssetIds);
  const [memoryPhotoCount, setMemoryPhotoCount] = useState<2 | 3>(initialMemoryPhotoCount);
  const [memoryTitle, setMemoryTitle] = useState(initialMemoryTitle);
  const [memoryDescription, setMemoryDescription] = useState(initialMemoryDescription);
  const [draggedBlockId, setDraggedBlockId] = useState<FinalCardBlockId | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<ExpandedState>(initialExpandedState);
  const [savedCompositionKey, setSavedCompositionKey] = useState(() =>
    JSON.stringify({
      blockOrder: initialBlockOrder,
      blockState: Object.fromEntries(options.map((option) => [option.id, option.checked])),
      layoutMode: initialLayoutMode,
      mediaLayout: initialMediaLayout,
      memoryTitle: initialMemoryTitle,
      memoryDescription: initialMemoryDescription,
      memoryPhotoCount: initialMemoryPhotoCount
    })
  );

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
  const currentCompositionKey = JSON.stringify({
    blockOrder,
    blockState,
    layoutMode,
    mediaLayout,
    memoryTitle,
    memoryDescription,
    memoryPhotoCount
  });
  const isCompositionDirty = savedCompositionKey !== currentCompositionKey;
  const activeMessageMediaSlots = mediaSlotsByLayout[mediaLayout];
  const activeMessagePickerSlots = mediaLayout === "portrait" ? activeMessageMediaSlots : horizontalMediaSlots;

  useEffect(() => {
    if (state.ok) {
      setSavedCompositionKey(currentCompositionKey);
    }
  }, [currentCompositionKey, state.ok]);

  const formRef = useRef<HTMLFormElement>(null);
  const submittedCompositionKeyRef = useRef<string | null>(null);
  const autoSaveReadyRef = useRef(false);
  const lastAutoSaveAtRef = useRef(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [bestQuotes, setBestQuotes] = useState(initialBestQuotes);
  const [quotesAreStale, setQuotesAreStale] = useState(bestQuotesAreStale);
  const [quotesMessage, setQuotesMessage] = useState("");
  const [aiUsage, setAiUsage] = useState(initialAiUsage);
  const [isQuotesPending, startQuotesTransition] = useTransition();
  const [qualities, setQualities] = useState(initialQualities);
  const [qualitiesStale, setQualitiesStale] = useState(qualitiesAreStale);
  const [qualitiesMessage, setQualitiesMessage] = useState("");
  const [isQualitiesPending, startQualitiesTransition] = useTransition();

  const handleGenerateBestQuotes = () => {
    setQuotesMessage("");
    startQuotesTransition(async () => {
      const result = await generateBestQuotesAction(manageToken);
      setQuotesMessage(result.message);
      if (!result.ok) return;
      setBestQuotes(result.quotes);
      setQuotesAreStale(false);
      setAiUsage(result.usage);
      router.refresh();
    });
  };

  const handleGenerateQualities = () => {
    setQualitiesMessage("");
    startQualitiesTransition(async () => {
      const result = await generateQualitiesAction(manageToken);
      setQualitiesMessage(result.message);
      if (!result.ok) return;
      setQualities(result.qualities);
      setQualitiesStale(false);
      setAiUsage(result.usage);
      router.refresh();
    });
  };

  useEffect(() => {
    if (!autoSaveReadyRef.current) {
      autoSaveReadyRef.current = true;
      return;
    }
    if (!isCompositionDirty || !formRef.current || isPending) return;
    if (submittedCompositionKeyRef.current === currentCompositionKey) return;
    const now = Date.now();
    if (now - lastAutoSaveAtRef.current < 800) return;
    lastAutoSaveAtRef.current = now;
    submittedCompositionKeyRef.current = currentCompositionKey;
    setSaveStatus("saving");
    formRef.current.requestSubmit();
  }, [currentCompositionKey, isCompositionDirty, isPending]);

  useEffect(() => {
    if (state.ok) {
      setSaveStatus("saved");
    } else if (state.message && !isPending) {
      setSaveStatus("idle");
    }
  }, [state, isPending]);

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

  const moveBlockByStep = (blockId: FinalCardBlockId, direction: "up" | "down") => {
    if (fixedBlockIds.includes(blockId)) {
      return;
    }

    const activeBlockIds = activeBlocks.map((block) => block.id);

    setBlockOrder((current) => {
      const visibleOrder = current.filter((currentBlockId) => activeBlockIds.includes(currentBlockId));
      const currentVisibleIndex = visibleOrder.indexOf(blockId);
      const targetVisibleIndex = direction === "up" ? currentVisibleIndex - 1 : currentVisibleIndex + 1;
      const targetBlockId = visibleOrder[targetVisibleIndex];

      if (currentVisibleIndex === -1 || !targetBlockId || fixedBlockIds.includes(targetBlockId)) {
        return current;
      }

      const withoutMovedBlock = current.filter((currentBlockId) => currentBlockId !== blockId);
      const targetIndex = withoutMovedBlock.indexOf(targetBlockId);

      if (targetIndex === -1) {
        return current;
      }

      const next = [...withoutMovedBlock];
      const insertIndex = direction === "up" ? targetIndex : targetIndex + 1;
      next.splice(insertIndex, 0, blockId);
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
    <form ref={formRef} action={formAction} className={styles.studioForm}>
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
            На компьютере перетаскивайте блоки. На телефоне используйте кнопки выше/ниже. Обязательные блоки отключить нельзя.
          </p>
          <button type="button" className={styles.compositionHelpLink}>
            Как это работает?
          </button>
        </div>

        <div className={styles.compositionList}>
          {canvasBlocks.map((block, index) => {
            const isExpanded = Boolean(expandedBlocks[block.id]);
            const isRequired = requiredBlockIds.includes(block.id);
            const isFixed = fixedBlockIds.includes(block.id);
            const isEnabled = isRequired || blockState[block.id];
            const canMoveUp = !isFixed && index > 1;
            const canMoveDown = !isFixed && index < canvasBlocks.length - 2;

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

                    {!isFixed ? (
                      <div className={styles.compositionMoveButtons} aria-label={`Порядок блока ${block.label}`}>
                        <button
                          type="button"
                          className={styles.compositionMoveButton}
                          onClick={() => moveBlockByStep(block.id, "up")}
                          disabled={!canMoveUp}
                          aria-label={`Поднять блок ${block.label}`}
                        >
                          <ArrowIcon direction="up" />
                        </button>
                        <button
                          type="button"
                          className={styles.compositionMoveButton}
                          onClick={() => moveBlockByStep(block.id, "down")}
                          disabled={!canMoveDown}
                          aria-label={`Опустить блок ${block.label}`}
                        >
                          <ArrowIcon direction="down" />
                        </button>
                      </div>
                    ) : null}

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

                    {block.id === "qualities" ? (
                      <div className={styles.aiInsightPanel}>
                        <div className={styles.aiInsightHeader}>
                          <div>
                            <h4 className={styles.messageSettingsTitle}>За что тебя ценят</h4>
                            <p>AI найдёт в активных поздравлениях пять качеств, которые особенно отмечают участники.</p>
                          </div>
                          <span className={styles.aiInsightUsage}>
                            AI: {aiUsage.remaining} из {aiUsage.limit}
                          </span>
                        </div>

                        {qualitiesStale ? (
                          <p className={styles.aiInsightStale}>Поздравления изменились — качества лучше обновить.</p>
                        ) : null}

                        {qualities.length > 0 ? (
                          <ul className={styles.aiQualityList} aria-label="Выбранные качества">
                            {qualities.map((quality) => (
                              <li key={quality}>{quality}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.aiInsightEmpty}>
                            После анализа здесь появятся пять коротких определений для блока открытки.
                          </p>
                        )}

                        <div className={styles.aiInsightActions}>
                          <button
                            type="button"
                            className={styles.contentAiButton}
                            onClick={handleGenerateQualities}
                            disabled={isQualitiesPending || !canGenerateQualities || aiUsage.remaining === 0}
                          >
                            <span aria-hidden="true">✦</span>
                            {isQualitiesPending
                              ? "Определяем качества..."
                              : qualities.length > 0
                                ? "Обновить качества"
                                : "Определить 5 качеств"}
                          </button>
                          {!canGenerateQualities ? <span>Нужно хотя бы два активных поздравления.</span> : null}
                          {qualitiesMessage ? (
                            <span className={qualitiesMessage.includes("готовы") ? styles.contentEditorSuccess : styles.contentEditorError}>
                              {qualitiesMessage}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {block.id === "quotes" ? (
                      <div className={styles.aiInsightPanel}>
                        <div className={styles.aiInsightHeader}>
                          <div>
                            <h4 className={styles.messageSettingsTitle}>Три лучшие фразы</h4>
                            <p>
                              AI выберет сильные строки из активных поздравлений, не добавляя новых мыслей.
                            </p>
                          </div>
                          <span className={styles.aiInsightUsage}>
                            AI: {aiUsage.remaining} из {aiUsage.limit}
                          </span>
                        </div>

                        {quotesAreStale ? (
                          <p className={styles.aiInsightStale}>Поздравления изменились — фразы лучше обновить.</p>
                        ) : null}

                        {bestQuotes.length > 0 ? (
                          <ol className={styles.aiInsightList}>
                            {bestQuotes.map((quote, quoteIndex) => (
                              <li key={`${quote}-${quoteIndex}`}>{quote}</li>
                            ))}
                          </ol>
                        ) : (
                          <p className={styles.aiInsightEmpty}>
                            После генерации здесь появятся три фразы для финальной открытки.
                          </p>
                        )}

                        <div className={styles.aiInsightActions}>
                          <button
                            type="button"
                            className={styles.contentAiButton}
                            onClick={handleGenerateBestQuotes}
                            disabled={isQuotesPending || !canGenerateBestQuotes || aiUsage.remaining === 0}
                          >
                            <span aria-hidden="true">✦</span>
                            {isQuotesPending
                              ? "Выбираем фразы..."
                              : bestQuotes.length > 0
                                ? "Обновить фразы"
                                : "Выбрать 3 фразы"}
                          </button>
                          {!canGenerateBestQuotes ? (
                            <span>Нужно хотя бы два активных поздравления.</span>
                          ) : null}
                          {quotesMessage ? (
                            <span className={quotesMessage.includes("готовы") ? styles.contentEditorSuccess : styles.contentEditorError}>
                              {quotesMessage}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {block.id === "messages" ? (
                      <div className={styles.messageSettings}>
                        <div className={styles.messageSettingsGroup}>
                          <h4 className={styles.messageSettingsTitle}>Как показывать поздравления</h4>
                          <div className={styles.mediaVariantTabs}>
                            <button
                              type="button"
                              className={`${styles.mediaVariantTab} ${layoutMode !== "column-media" ? styles.mediaVariantTabActive : ""}`}
                              onClick={() => setLayoutMode(layoutMode === "column-media" ? "carousel-1" : layoutMode)}
                            >
                              Без фото
                            </button>
                            <button
                              type="button"
                              className={`${styles.mediaVariantTab} ${layoutMode === "column-media" ? styles.mediaVariantTabActive : ""}`}
                              onClick={() => setLayoutMode("column-media")}
                            >
                              С фото
                            </button>
                          </div>

                          {layoutMode === "column-media" ? (
                            <div className={styles.layoutCardGrid}>
                              {mediaLayoutOptions.map((option) => {
                                const selected = mediaLayout === option.id;

                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    className={`${styles.layoutCard} ${selected ? styles.layoutCardActive : ""}`}
                                    onClick={() => setMediaLayout(option.id)}
                                  >
                                    <span className={styles.layoutCardCheck}>{selected ? <CheckIcon /> : null}</span>
                                    <span className={styles.layoutCardDiagram}>
                                      <MediaLayoutDiagram mode={option.id} />
                                    </span>
                                    <span className={styles.layoutCardTitle}>{option.label}</span>
                                    <span className={styles.layoutCardMeta}>{option.description}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className={styles.layoutCardGrid}>
                              {layoutOptions
                                .filter((option) => option.id !== "column-media")
                                .map((option) => {
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
                                      <span className={styles.layoutCardMeta}>До {profile.maxChars} символов</span>
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>

                        {layoutMode === "column-media" ? (
                          <div className={styles.messageSettingsGroup}>
                            <div className={styles.photoReadinessPanel}>
                              <div>
                                <strong>Фото для выбранного вида</strong>
                                <p>
                                  Для этого варианта нужно {activeMessageMediaSlots.length}{" "}
                                  {mediaLayout === "portrait" ? "вертикальное фото" : "горизонтальных фото"}.
                                </p>
                              </div>
                              <span>
                                Для блока нужно {activeMessageMediaSlots.length} фото · доступно{" "}
                                {
                                  mediaAssets.filter((asset) =>
                                    activeMessagePickerSlots.includes(asset.slot as CardMediaSlot)
                                  ).length
                                }
                              </span>
                              <a href={`${getManagePath(manageToken)}?tab=content`} className={styles.previewSecondaryLink}>
                                Перейти к фото
                              </a>
                            </div>
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
                        <div className={styles.photoReadinessPanel}>
                          <div>
                            <strong>Фото для блока “Моменты”</strong>
                            <p>Для выбранного вида нужно {memoryPhotoCount} горизонтальных фото.</p>
                          </div>
                          <span>
                            Для блока нужно {memoryPhotoCount} фото · доступно{" "}
                            {mediaAssets.filter((asset) => horizontalMediaSlots.includes(asset.slot as CardMediaSlot)).length}
                          </span>
                          <a href={`${getManagePath(manageToken)}?tab=content`} className={styles.previewSecondaryLink}>
                            Перейти к фото
                          </a>
                        </div>
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

      <div className={styles.compositionAutoSaveStatus}>
        {isPending || saveStatus === "saving"
          ? "Сохраняем..."
          : saveStatus === "saved"
            ? "Изменения сохранены"
            : null}
      </div>
    </form>
  );
};
