"use client";

import {
  useActionState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent
} from "react";
import { useRouter } from "next/navigation";
import type { AiUsage } from "@/lib/ai/types";
import type { CardBlockReadinessView } from "@/lib/manage/card-design-readiness";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type {
  FinalCardBlockId,
  FinalCardMediaSlot,
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout,
  FinalCardOptionalBlockId
} from "@/lib/final-card/types";
import {
  generateBestQuotesAction,
  generateQualitiesAction,
  saveBestQuoteSelectionAction,
  updateFinalPresentationSettingsAction
} from "./actions";
import { getContentTabHref } from "./content-focus";
import { DesignPhotoSummary } from "./design-photo-summary";
import { reorderCompositionBlocks, type CompositionDropPosition } from "./composition-order";
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
  initialMessageMediaSlots: FinalCardMediaSlot[];
  initialMemoryMediaSlots: FinalCardMediaSlot[];
  initialMessageMediaAssetIds: string[];
  initialMemoryMediaAssetIds: string[];
  messageAssignedPhotoCount: number;
  memoryAssignedPhotoCount: number;
  initialMemoryPhotoCount: 2 | 3;
  initialMemoryTitle: string;
  initialMemoryDescription: string;
  requiredBlockIds: FinalCardBlockId[];
  initialMainGreetingContributionId: string | null;
  mainGreetingStatusText: string;
  initialBestQuotes: string[];
  bestQuotesAreStale: boolean;
  canGenerateBestQuotes: boolean;
  bestQuotesMinimumContributionCount: number;
  initialQualities: string[];
  qualitiesAreStale: boolean;
  canGenerateQualities: boolean;
  initialAiUsage: AiUsage;
  isContentEditable: boolean;
  readiness: CardBlockReadinessView[];
  visibleContributions: Array<{ id: string; authorName: string; message: string }>;
};

type RenderedBlock = {
  id: FinalCardBlockId;
  label: string;
  description: string;
  removable: boolean;
};

type DropTarget = {
  blockId: FinalCardBlockId;
  position: CompositionDropPosition;
};

type ExpandedState = Partial<Record<FinalCardBlockId, boolean>>;

type ActivePointerDrag = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  hasMoved: boolean;
};

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

const getMessageLayoutSummary = (
  layoutMode: FinalCardMessageLayoutMode,
  mediaLayout: FinalCardMessageMediaLayout
) => {
  if (layoutMode === "column-media") {
    if (mediaLayout === "portrait") return "С фото · 1 вертикальная фотография";
    if (mediaLayout === "landscape-pair") return "С фото · 2 горизонтальные фотографии";
    return "С фото · 3 горизонтальные фотографии";
  }

  if (layoutMode === "grid-2") return "Без фото · сетка 2×2";
  if (layoutMode === "carousel-2") return "Без фото · в два ряда";
  return "Без фото · в один ряд";
};

const mediaSlotsByLayout: Record<FinalCardMessageMediaLayout, FinalCardMediaSlot[]> = {
  portrait: ["portrait"],
  "landscape-pair": ["landscape-a", "landscape-b"],
  "landscape-trio": ["landscape-a", "landscape-b", "landscape-c"]
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
    summary: "Имя получателя, повод и настроение первого экрана.",
    details: "Имя получателя, повод и настроение первого экрана."
  },
  summary: {
    label: "Главное поздравление",
    summary: "Одно поздравление, которое будет выделено в открытке.",
    details: "Одно поздравление, которое будет выделено в открытке."
  },
  qualities: {
    label: "Качества",
    summary: "Пять качеств, которые чаще всего отмечают участники.",
    details: "Пять качеств, которые чаще всего отмечают участники."
  },
  messages: {
    label: "Поздравления",
    summary: "Поздравления участников в выбранной компоновке.",
    details: "Поздравления участников в выбранной компоновке."
  },
  memories: {
    label: "Моменты",
    summary: "Отдельная подборка из трёх фотографий с короткими подписями.",
    details: "Отдельная подборка из трёх фотографий с короткими подписями."
  },
  quotes: {
    label: "Лучшие фразы",
    summary: "Три короткие фразы, выбранные из поздравлений.",
    details: "Три короткие фразы, выбранные из поздравлений."
  },
  "ai-summary": {
    label: "Общее поздравление",
    summary: "Общее обращение от всей группы.",
    details: "Общий тёплый текст от всей группы."
  },
  closing: {
    label: "Финал",
    summary: "Завершающий текст и подпись открытки.",
    details: "Завершающий текст и подпись открытки."
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
    .filter((option) => !option.disabled)
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
  const messageCount = mode === "portrait" ? 3 : 4;

  return (
    <div className={styles.mediaLayoutDiagram} data-media-layout={mode}>
      <div className={styles.mediaLayoutMessages}>
        {Array.from({ length: messageCount }).map((_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className={styles.mediaLayoutPhotos}>
        {Array.from({ length: photoCount }).map((_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
};

const normalizeSelectedSlots = (
  selectedSlots: FinalCardMediaSlot[],
  allowedSlots: FinalCardMediaSlot[],
  fallbackCount: number
) => {
  const allowed = new Set(allowedSlots);
  const filtered = selectedSlots.filter((slot) => allowed.has(slot));
  const fallback = allowedSlots.slice(0, fallbackCount);
  return [...filtered, ...fallback.filter((slot) => !filtered.includes(slot))].slice(0, fallbackCount);
};

export const BlockSettingsForm = ({
  manageToken,
  options,
  initialLayoutMode,
  initialMediaLayout,
  initialBlockOrder,
  initialMessageMediaSlots,
  initialMemoryMediaSlots,
  initialMessageMediaAssetIds,
  initialMemoryMediaAssetIds,
  messageAssignedPhotoCount,
  memoryAssignedPhotoCount,
  initialMemoryPhotoCount,
  initialMemoryTitle,
  initialMemoryDescription,
  requiredBlockIds,
  initialMainGreetingContributionId,
  mainGreetingStatusText,
  initialBestQuotes,
  bestQuotesAreStale,
  canGenerateBestQuotes,
  bestQuotesMinimumContributionCount,
  initialQualities,
  qualitiesAreStale,
  canGenerateQualities,
  initialAiUsage,
  isContentEditable,
  readiness,
  visibleContributions
}: Props) => {
  const router = useRouter();
  const [layoutMode, setLayoutMode] = useState<FinalCardMessageLayoutMode>(initialLayoutMode);
  const [mediaLayout, setMediaLayout] = useState<FinalCardMessageMediaLayout>(initialMediaLayout);
  const [blockState, setBlockState] = useState<Record<string, boolean>>(
    Object.fromEntries(options.map((option) => [option.id, option.checked]))
  );
  const [blockOrder, setBlockOrder] = useState<FinalCardBlockId[]>(initialBlockOrder);
  const [messageMediaSlots] = useState<FinalCardMediaSlot[]>(initialMessageMediaSlots);
  const [memoryMediaSlots] = useState<FinalCardMediaSlot[]>(initialMemoryMediaSlots);
  const messageMediaAssetIds = initialMessageMediaAssetIds;
  const memoryMediaAssetIds = initialMemoryMediaAssetIds;
  const memoryPhotoCount = initialMemoryPhotoCount;
  const [memoryTitle, setMemoryTitle] = useState(initialMemoryTitle);
  const [memoryDescription, setMemoryDescription] = useState(initialMemoryDescription);
  const [isMessageLayoutEditing, setIsMessageLayoutEditing] = useState(false);
  const [isMemoryTextEditing, setIsMemoryTextEditing] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<FinalCardBlockId | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<ExpandedState>(initialExpandedState);
  const [isReorderMode, setIsReorderMode] = useState(false);
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
    () => buildCanvasBlocks(options, requiredBlockIds).map((block) =>
      block.id === "memories"
        ? {
            ...block,
            description: `Отдельная подборка из ${memoryPhotoCount} фотографий с короткими подписями.`
          }
        : block
    ),
    [memoryPhotoCount, options, requiredBlockIds]
  );

  const canvasBlocks = useMemo(() => {
    const activeMap = new Map(activeBlocks.map((block) => [block.id, block]));
    return blockOrder
      .map((blockId) => activeMap.get(blockId))
      .filter((block): block is RenderedBlock => Boolean(block));
  }, [activeBlocks, blockOrder]);
  const readinessById = useMemo(
    () => new Map(readiness.map((block) => [block.blockId, block])),
    [readiness]
  );
  const contextualActions = readiness.filter(
    (block) => block.enabled && block.status === "ACTION_REQUIRED" && block.action
  );
  const allEnabledBlocksReady = readiness
    .filter((block) => block.enabled)
    .every((block) => block.status === "READY");

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
  const messageRequiredPhotoCount = layoutMode === "column-media" ? activeMessageMediaSlots.length : 0;
  const selectedMainGreeting = visibleContributions[0] ?? null;

  const formRef = useRef<HTMLFormElement>(null);
  const draggedBlockIdRef = useRef<FinalCardBlockId | null>(null);
  const dropTargetRef = useRef<DropTarget | null>(null);
  const activePointerDragRef = useRef<ActivePointerDrag | null>(null);
  const dragPreviewRef = useRef<HTMLElement | null>(null);
  const removePointerListenersRef = useRef<(() => void) | null>(null);
  const suppressHeaderClickRef = useRef(false);
  const suppressHeaderClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionsBeforeReorderRef = useRef<Map<FinalCardBlockId, DOMRect> | null>(null);
  const submittedCompositionKeyRef = useRef<string | null>(null);
  const autoSaveReadyRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const handleSettingsAction = async (previousState: typeof initialState, formData: FormData) => {
    const result = await updateFinalPresentationSettingsAction(previousState, formData);
    if (result.ok) {
      setSavedCompositionKey(submittedCompositionKeyRef.current ?? currentCompositionKey);
      setSaveStatus("saved");
      router.refresh();
    } else {
      setSaveStatus("idle");
    }
    submittedCompositionKeyRef.current = null;
    return result;
  };
  const [settingsState, formAction, isPending] = useActionState(handleSettingsAction, initialState);
  const [, startSettingsSaveTransition] = useTransition();
  const [bestQuotes, setBestQuotes] = useState(initialBestQuotes);
  const [selectedBestQuotes, setSelectedBestQuotes] = useState(() => initialBestQuotes.slice(0, 3));
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
      setSelectedBestQuotes(result.quotes.slice(0, 3));
      setQuotesAreStale(false);
      setAiUsage(result.usage);
      router.refresh();
    });
  };

  const toggleBestQuote = (quote: string) => {
    setSelectedBestQuotes((current) => {
      if (current.includes(quote)) return current.filter((item) => item !== quote);
      if (current.length === 3) return current;
      return [...current, quote];
    });
  };

  const saveBestQuoteSelection = () => {
    setQuotesMessage("");
    startQuotesTransition(async () => {
      const result = await saveBestQuoteSelectionAction(manageToken, selectedBestQuotes);
      setQuotesMessage(result.message);
      if (result.ok) {
        setBestQuotes(result.quotes);
        setSelectedBestQuotes(result.quotes.slice(0, 3));
        router.refresh();
      }
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
    if (!isContentEditable || !isCompositionDirty || !formRef.current || isPending || draggedBlockId) return;
    if (submittedCompositionKeyRef.current === currentCompositionKey) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      submittedCompositionKeyRef.current = currentCompositionKey;
      setSaveStatus("saving");
      const form = formRef.current;
      if (form) startSettingsSaveTransition(() => formAction(new FormData(form)));
      autoSaveTimerRef.current = null;
    }, 500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    currentCompositionKey,
    draggedBlockId,
    formAction,
    isCompositionDirty,
    isContentEditable,
    isPending,
    startSettingsSaveTransition
  ]);

  useLayoutEffect(() => {
    const previousPositions = positionsBeforeReorderRef.current;
    positionsBeforeReorderRef.current = null;

    if (!draggedBlockId || !previousPositions || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    for (const [blockId, previousRect] of previousPositions) {
      if (blockId === draggedBlockId) continue;

      const element = document.querySelector<HTMLElement>(`[data-composition-block-id="${blockId}"]`);
      if (!element) continue;

      const nextRect = element.getBoundingClientRect();
      const deltaY = previousRect.top - nextRect.top;

      if (Math.abs(deltaY) < 1) continue;

      element.animate(
        [
          { transform: `translate3d(0, ${deltaY}px, 0)` },
          { transform: "translate3d(0, 0, 0)" }
        ],
        {
          duration: 180,
          easing: "cubic-bezier(0.2, 0, 0, 1)"
        }
      );
    }
  }, [blockOrder, draggedBlockId]);

  useEffect(
    () => () => {
      removePointerListenersRef.current?.();
      if (suppressHeaderClickTimerRef.current) clearTimeout(suppressHeaderClickTimerRef.current);
      dragPreviewRef.current?.remove();
      document.body.classList.remove(styles.compositionDragInProgress);
    },
    []
  );

  const resolveDropPosition = (
    targetBlockId: FinalCardBlockId,
    pointerPosition: CompositionDropPosition
  ): CompositionDropPosition => {
    if (targetBlockId === "hero") {
      return "after";
    }

    if (targetBlockId === "closing") {
      return "before";
    }

    return pointerPosition;
  };

  const snapshotBlockPositions = () => {
    positionsBeforeReorderRef.current = new Map(
      canvasBlocks.flatMap((block) => {
        const element = document.querySelector<HTMLElement>(`[data-composition-block-id="${block.id}"]`);
        return element ? [[block.id, element.getBoundingClientRect()] as const] : [];
      })
    );
  };

  const moveBlockDuringDrag = (
    targetBlockId: FinalCardBlockId,
    pointerPosition: CompositionDropPosition
  ) => {
    const activeDraggedBlockId = draggedBlockIdRef.current;
    if (!activeDraggedBlockId || activeDraggedBlockId === targetBlockId) {
      return;
    }

    const targetPosition = resolveDropPosition(targetBlockId, pointerPosition);

    snapshotBlockPositions();
    setBlockOrder((current) => {
      const next = reorderCompositionBlocks(current, activeDraggedBlockId, targetBlockId, targetPosition);
      if (next === current) {
        positionsBeforeReorderRef.current = null;
      }
      return next;
    });

    const nextDropTarget = { blockId: targetBlockId, position: targetPosition };
    dropTargetRef.current = nextDropTarget;
    setDropTarget(nextDropTarget);
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

  const positionDragPreview = (clientX: number, clientY: number) => {
    const preview = dragPreviewRef.current;
    const activePointerDrag = activePointerDragRef.current;
    if (!preview || !activePointerDrag) return;

    preview.style.transform = `translate3d(${clientX - activePointerDrag.offsetX}px, ${
      clientY - activePointerDrag.offsetY
    }px, 0) scale(1.01)`;
  };

  const updatePointerDrag = (event: PointerEvent) => {
    const activePointerDrag = activePointerDragRef.current;
    const activeDraggedBlockId = draggedBlockIdRef.current;
    if (!activePointerDrag || activePointerDrag.pointerId !== event.pointerId || !activeDraggedBlockId) return;

    event.preventDefault();
    if (
      !activePointerDrag.hasMoved &&
      Math.hypot(event.clientX - activePointerDrag.startX, event.clientY - activePointerDrag.startY) >= 4
    ) {
      activePointerDrag.hasMoved = true;
    }
    positionDragPreview(event.clientX, event.clientY);

    const target = document
      .elementsFromPoint(event.clientX, event.clientY)
      .map((element) => element.closest<HTMLElement>("[data-composition-block-id]"))
      .find((element) => element && element.dataset.compositionBlockId !== activeDraggedBlockId);

    if (!target) return;

    const blockId = target.dataset.compositionBlockId as FinalCardBlockId;
    const rect = target.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const pointerPosition = event.clientY < midpoint ? "before" : "after";
    const targetPosition = resolveDropPosition(blockId, pointerPosition);

    const activeDropTarget = dropTargetRef.current;
    if (activeDropTarget?.blockId !== blockId || activeDropTarget.position !== targetPosition) {
      moveBlockDuringDrag(blockId, targetPosition);
    }

    const scrollThreshold = 72;
    if (event.clientY < scrollThreshold) {
      window.scrollBy({ top: -12 });
    } else if (event.clientY > window.innerHeight - scrollThreshold) {
      window.scrollBy({ top: 12 });
    }
  };

  const finishDragging = () => {
    const shouldSuppressHeaderClick = Boolean(activePointerDragRef.current?.hasMoved);
    removePointerListenersRef.current?.();
    dragPreviewRef.current?.remove();
    dragPreviewRef.current = null;
    activePointerDragRef.current = null;
    draggedBlockIdRef.current = null;
    dropTargetRef.current = null;
    positionsBeforeReorderRef.current = null;
    document.body.classList.remove(styles.compositionDragInProgress);
    setDraggedBlockId(null);
    setDropTarget(null);

    if (shouldSuppressHeaderClick) {
      suppressHeaderClickRef.current = true;
      if (suppressHeaderClickTimerRef.current) clearTimeout(suppressHeaderClickTimerRef.current);
      suppressHeaderClickTimerRef.current = setTimeout(() => {
        suppressHeaderClickRef.current = false;
        suppressHeaderClickTimerRef.current = null;
      }, 400);
    }
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    blockId: FinalCardBlockId
  ) => {
    if (
      event.button !== 0 ||
      fixedBlockIds.includes(blockId) ||
      window.matchMedia("(max-width: 899px)").matches
    ) {
      return;
    }

    const card = event.currentTarget.closest("article");
    if (!(card instanceof HTMLElement)) return;

    event.preventDefault();

    const rect = card.getBoundingClientRect();
    const preview = card.cloneNode(true) as HTMLElement;
    preview.removeAttribute("id");
    preview.removeAttribute("data-composition-block-id");
    preview.setAttribute("aria-hidden", "true");
    preview.classList.add(styles.compositionDragPreview);
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;
    document.body.appendChild(preview);
    document.body.classList.add(styles.compositionDragInProgress);

    activePointerDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      hasMoved: false
    };
    draggedBlockIdRef.current = blockId;
    dropTargetRef.current = null;
    dragPreviewRef.current = preview;
    setDraggedBlockId(blockId);
    setDropTarget(null);
    positionDragPreview(event.clientX, event.clientY);

    const handleWindowPointerMove = (pointerEvent: PointerEvent) => updatePointerDrag(pointerEvent);
    const handleWindowPointerEnd = (pointerEvent: PointerEvent) => {
      if (activePointerDragRef.current?.pointerId !== pointerEvent.pointerId) return;
      pointerEvent.preventDefault();
      finishDragging();
    };
    const handleWindowKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") finishDragging();
    };

    window.addEventListener("pointermove", handleWindowPointerMove, { capture: true, passive: false });
    window.addEventListener("pointerup", handleWindowPointerEnd, { capture: true });
    window.addEventListener("pointercancel", handleWindowPointerEnd, { capture: true });
    window.addEventListener("keydown", handleWindowKeyDown, { capture: true });
    removePointerListenersRef.current = () => {
      window.removeEventListener("pointermove", handleWindowPointerMove, { capture: true });
      window.removeEventListener("pointerup", handleWindowPointerEnd, { capture: true });
      window.removeEventListener("pointercancel", handleWindowPointerEnd, { capture: true });
      window.removeEventListener("keydown", handleWindowKeyDown, { capture: true });
      removePointerListenersRef.current = null;
    };
  };

  const toggleExpanded = (blockId: FinalCardBlockId) => {
    setExpandedBlocks((current) => {
      const nextValue = !current[blockId];
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 899px)").matches) {
        return nextValue ? { [blockId]: true } : {};
      }
      return { ...current, [blockId]: nextValue };
    });
  };

  const collapseBlock = (blockId: FinalCardBlockId) => {
    setExpandedBlocks((current) => ({ ...current, [blockId]: false }));
    if (blockId === "messages") {
      setIsMessageLayoutEditing(false);
    }
  };

  const openBlock = (blockId: FinalCardBlockId) => {
    setExpandedBlocks(
      typeof window !== "undefined" && window.matchMedia("(max-width: 899px)").matches
        ? { [blockId]: true }
        : (current) => ({ ...current, [blockId]: true })
    );
    window.requestAnimationFrame(() => {
      document.getElementById(`block-${blockId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

      {messageMediaAssetIds.map((assetId, index) => (
        <input key={`message-media-asset-${assetId}-${index}`} type="hidden" name="messageMediaAssetIds" value={assetId} />
      ))}

      {normalizeSelectedSlots(memoryMediaSlots, ["memory-a", "memory-b", "memory-c"], memoryPhotoCount).map((slot, index) => (
        <input key={`memory-media-${slot}-${index}`} type="hidden" name="memoryMediaSlots" value={slot} />
      ))}

      {memoryMediaAssetIds.map((assetId, index) => (
        <input key={`memory-media-asset-${assetId}-${index}`} type="hidden" name="memoryMediaAssetIds" value={assetId} />
      ))}

      {blockOrder.map((blockId) => (
        <input key={blockId} type="hidden" name="blockOrder" value={blockId} />
      ))}

      {options.map((option) => (
        <input key={option.id} type="hidden" name={option.id} value={blockState[option.id] ? "on" : ""} />
      ))}

      {!isContentEditable ? <p className={styles.compositionLockedNotice} role="status">Открытка уже передана получателю. Её приватное содержание и оформление зафиксированы.</p> : null}
      {allEnabledBlocksReady ? (
        <div className={`${styles.readinessBanner} ${styles.readinessBannerReady}`} role="status">
          <div>
            <strong>Оформление готово</strong>
            <span>Все включённые и обязательные блоки настроены. Проверьте открытку перед передачей.</span>
          </div>
        </div>
      ) : contextualActions.length > 0 ? (
        <div className={styles.readinessBanner} role="status">
          <div>
            <strong>Открытку можно дополнить</strong>
            <span>Собрано достаточно материалов для следующих настроек.</span>
          </div>
          <div className={styles.readinessBannerActions}>
            {contextualActions.slice(0, 2).map((block) => (
              <button key={block.blockId} type="button" onClick={() => openBlock(block.blockId)}>
                {block.action!.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <fieldset className={styles.compositionSettingsFieldset} disabled={!isContentEditable}>
      <section className={styles.studioCanvasCard}>
        <div className={styles.compositionToolbar}>
          <p className={styles.compositionToolbarText}>
            Выберите, какие разделы будут в открытке. Обязательные блоки отключить нельзя.
          </p>
          <button
            type="button"
            className={`${styles.compositionHelpLink} ${isReorderMode ? styles.compositionHelpLinkActive : ""}`}
            onClick={() => setIsReorderMode((current) => !current)}
            aria-pressed={isReorderMode}
          >
            {isReorderMode ? "Готово" : "Изменить порядок блоков"}
          </button>
        </div>

        <div className={`${styles.compositionList} ${isReorderMode ? styles.compositionListReordering : ""}`}>
          {canvasBlocks.map((block, index) => {
            const isExpanded = Boolean(expandedBlocks[block.id]);
            const isRequired = requiredBlockIds.includes(block.id);
            const isFixed = fixedBlockIds.includes(block.id);
            const isEnabled = isRequired || blockState[block.id];
            const blockReadiness = readinessById.get(block.id);
            const canExpand = block.id !== "closing";
            const canMoveUp = !isFixed && index > 1;
            const canMoveDown = !isFixed && index < canvasBlocks.length - 2;

            return (
              <article
                key={block.id}
                id={`block-${block.id}`}
                data-composition-block-id={block.id}
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
              >
                <div
                  className={styles.compositionRowHeader}
                  onClick={(event) => {
                    if (suppressHeaderClickRef.current) {
                      suppressHeaderClickRef.current = false;
                      if (suppressHeaderClickTimerRef.current) {
                        clearTimeout(suppressHeaderClickTimerRef.current);
                        suppressHeaderClickTimerRef.current = null;
                      }
                      event.preventDefault();
                      event.stopPropagation();
                      return;
                    }
                    if ((event.target as HTMLElement).closest("button, input, a, label")) return;
                    if (!isReorderMode && canExpand) toggleExpanded(block.id);
                  }}
                >
                  <div className={styles.compositionRowLead}>
                    <button
                      type="button"
                      className={styles.compositionGrip}
                      disabled={isFixed}
                      onPointerDown={(event) => handlePointerDown(event, block.id)}
                      onKeyDown={(event) => {
                        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                        event.preventDefault();
                        moveBlockByStep(block.id, event.key === "ArrowUp" ? "up" : "down");
                      }}
                      aria-label={
                        isFixed
                          ? `${block.label} зафиксирован`
                          : `Изменить порядок блока ${block.label}. Перетащите мышью или используйте стрелки вверх и вниз`
                      }
                    >
                      <GripIcon />
                    </button>

                    {!isFixed && isReorderMode ? (
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
                    {blockReadiness ? (
                      <span
                        className={`${styles.blockStatusBadge} ${styles[`blockStatus${blockReadiness.status}`]}`}
                        aria-label={`Статус блока: ${blockReadiness.statusLabel}`}
                      >
                        <span aria-hidden="true">{blockReadiness.status === "READY" ? "✓" : blockReadiness.status === "ACTION_REQUIRED" ? "!" : "•"}</span>
                        <span className={styles.blockStatusLabelDesktop}>{blockReadiness.statusLabel}</span>
                        <span className={styles.blockStatusLabelMobile}>{blockReadiness.statusLabel}</span>
                      </span>
                    ) : null}
                    {isReorderMode ? null : isRequired ? (
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

                    {!isReorderMode && canExpand ? <button
                      type="button"
                      className={styles.chevronButton}
                      onClick={() => toggleExpanded(block.id)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? `Свернуть ${block.label}` : `Развернуть ${block.label}`}
                    >
                      <ChevronIcon expanded={isExpanded} />
                    </button> : null}
                  </div>
                </div>

                {canExpand ? <div className={`${styles.compositionAccordion} ${isExpanded && !isReorderMode ? styles.compositionAccordionOpen : ""}`}>
                  <div className={styles.compositionAccordionInner}>
                    {blockReadiness && blockReadiness.status !== "READY" ? (
                      <p className={styles.compositionReadinessExplanation}>{blockReadiness.explanation}</p>
                    ) : null}

                    {block.id === "summary" ? (
                      <div className={styles.messageSettings}>
                        <div className={styles.messageSettingsGroup}>
                          <h4 className={styles.messageSettingsTitle}>Текущий выбор</h4>
                          {selectedMainGreeting ? (
                            <div className={styles.compactMainGreeting}>
                              <strong>Выбрано поздравление от {selectedMainGreeting.authorName}</strong>
                              <blockquote>
                                «{selectedMainGreeting.message.length > 150
                                  ? `${selectedMainGreeting.message.slice(0, 149).trimEnd()}…`
                                  : selectedMainGreeting.message}»
                              </blockquote>
                              <small>В открытке оно появится в разделе «Самые важные слова».</small>
                            </div>
                          ) : (
                            <p>{mainGreetingStatusText}</p>
                          )}
                          <a
                            className={styles.previewSecondaryLink}
                            href={getContentTabHref(manageToken, "main-congratulation")}
                          >
                            {selectedMainGreeting ? "Изменить выбор" : "Выбрать главное"}
                          </a>
                        </div>
                      </div>
                    ) : null}

                    {block.id === "qualities" ? (
                      <div className={styles.aiInsightPanel}>
                        <div className={styles.aiInsightHeader}>
                          <div>
                            <h4 className={styles.messageSettingsTitle}>Выбранные качества</h4>
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
                          {!canGenerateQualities ? <span>Нужно хотя бы 6 активных поздравлений.</span> : null}
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
                            <h4 className={styles.messageSettingsTitle}>Лучшие фразы</h4>
                            <p>AI подготовит несколько коротких вариантов. Выберите три фразы для открытки.</p>
                          </div>
                          <span className={styles.aiInsightUsage}>
                            AI: {aiUsage.remaining} из {aiUsage.limit}
                          </span>
                        </div>

                        {quotesAreStale ? (
                          <p className={styles.aiInsightStale}>Фразы нужно обновить: поздравления изменились или старые варианты не соответствуют текущему лимиту.</p>
                        ) : null}

                        {bestQuotes.length > 0 ? (
                          <div className={styles.aiInsightList} role="group" aria-label="Выбор лучших фраз">
                            {bestQuotes.map((quote, quoteIndex) => (
                              <label className={`${styles.aiQuoteChoice} ${selectedBestQuotes.includes(quote) ? styles.aiQuoteChoiceSelected : ""}`} key={`${quote}-${quoteIndex}`}>
                                <input type="checkbox" checked={selectedBestQuotes.includes(quote)} onChange={() => toggleBestQuote(quote)} disabled={isQuotesPending || (!selectedBestQuotes.includes(quote) && selectedBestQuotes.length === 3)} />
                                <span className={styles.aiQuoteNumber}>{quoteIndex + 1}</span>
                                <span>{quote}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.aiInsightEmpty}>
                            После генерации здесь появятся от трёх до шести вариантов. Выберите ровно три для финальной открытки.
                          </p>
                        )}

                        <div className={styles.aiInsightActions}>
                          {bestQuotes.length >= 3 ? <button type="button" className={`${styles.contentAiButton} ${styles.contentAiButtonPrimary}`} onClick={saveBestQuoteSelection} disabled={isQuotesPending || selectedBestQuotes.length !== 3}>Сохранить выбранные: {selectedBestQuotes.length}/3</button> : null}
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
                                : "Подобрать фразы"}
                          </button>
                          {!canGenerateBestQuotes ? (
                            <span>Лучшие фразы появятся, когда соберётся минимум {bestQuotesMinimumContributionCount} поздравлений — так мы сможем выбрать действительно разные и тёплые строки.</span>
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
                          <div className={styles.compactSettingHeader}>
                            <h4 className={styles.messageSettingsTitle}>Вид поздравлений</h4>
                            {!isMessageLayoutEditing ? (
                              <button type="button" onClick={() => setIsMessageLayoutEditing(true)}>
                                Изменить вид
                              </button>
                            ) : null}
                          </div>

                          {!isMessageLayoutEditing ? (
                            <div className={styles.compactSettingSummary}>
                              <strong>{getMessageLayoutSummary(layoutMode, mediaLayout)}</strong>
                              <span>До {getFinalCardMessageLayoutProfile(layoutMode, mediaLayout).maxChars} символов в поздравлении</span>
                            </div>
                          ) : (
                            <div className={styles.layoutEditor}>
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
                                        onClick={() => {
                                          setMediaLayout(option.id);
                                          setIsMessageLayoutEditing(false);
                                        }}
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
                                          onClick={() => {
                                            setLayoutMode(option.id);
                                            setIsMessageLayoutEditing(false);
                                          }}
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
                          )}
                        </div>

                        <DesignPhotoSummary
                          assignedCount={messageAssignedPhotoCount}
                          requiredCount={messageRequiredPhotoCount}
                          context="messages"
                          href={messageRequiredPhotoCount > 0
                            ? getContentTabHref(manageToken, "congratulations-photos")
                            : undefined}
                        />
                      </div>
                    ) : null}

                    {block.id === "memories" ? (
                      <div className={styles.messageSettings}>
                        <div className={styles.messageSettingsGroup}>
                          <div className={styles.compactSettingHeader}>
                            <h4 className={styles.messageSettingsTitle}>Текст блока</h4>
                            {!isMemoryTextEditing ? (
                              <button type="button" onClick={() => setIsMemoryTextEditing(true)}>
                                Изменить текст
                              </button>
                            ) : null}
                          </div>

                          {isMemoryTextEditing ? (
                            <div className={styles.memoryTextEditor}>
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
                              <button type="button" onClick={() => setIsMemoryTextEditing(false)}>
                                Готово
                              </button>
                            </div>
                          ) : (
                            <div className={styles.compactSettingSummary}>
                              <strong>{memoryTitle || "Моменты"}</strong>
                              <span>{memoryDescription || "Без дополнительного описания"}</span>
                            </div>
                          )}
                        </div>

                        <DesignPhotoSummary
                          assignedCount={memoryAssignedPhotoCount}
                          requiredCount={memoryPhotoCount}
                          context="memories"
                          href={getContentTabHref(manageToken, "moments-photos")}
                        />
                      </div>
                    ) : null}

                    {block.id === "messages" &&
                    isExpanded &&
                    blockReadiness?.status === "READY" &&
                    messageAssignedPhotoCount >= messageRequiredPhotoCount ? (
                      <div className={styles.readyBlockCollapseAction}>
                        <button type="button" onClick={() => collapseBlock("messages")}>
                          <CheckIcon />
                          <span>Готово — свернуть блок</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div> : null}
              </article>
            );
          })}
        </div>

      </section>
      </fieldset>

      <div className={styles.compositionAutoSaveStatus}>
        {isPending || saveStatus === "saving"
          ? "Сохраняем..."
          : settingsState.message && !settingsState.ok
            ? settingsState.message
          : saveStatus === "saved"
            ? "Изменения сохранены"
            : null}
      </div>
    </form>
  );
};
