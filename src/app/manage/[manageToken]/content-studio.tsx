"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent as ReactDragEvent
} from "react";
import { useRouter } from "next/navigation";
import type { CardLifecycle } from "@/lib/cards/lifecycle";
import type { CardMediaAsset, Contribution } from "@/lib/cards/types";
import type { FinalCardMessageMediaLayout } from "@/lib/final-card/types";
import type { OrganizerJourneyStep } from "@/lib/manage/card-design-readiness";
import { AiHelper } from "@/app/card/[publicSlug]/ai-helper";
import { ContributionEditor } from "./contribution-editor";
import { MediaManager } from "./media-manager";
import { ShareLinkButton } from "./copy-link-button";
import { EditorSidebarCard } from "./editor-sidebar-card";
import { ParticipantLinkCard } from "./participant-link-card";
import { PreparationProgress } from "./preparation-progress";
import { useMobileInputActivity } from "./use-mobile-input-activity";
import {
  addManualContributionAction,
  openCollectionAction,
  reorderContributionsAction,
  setContributionStatusAction,
  setMainGreetingAction
} from "./actions";
import {
  contentFocusSectionIds,
  type ContentFocus,
  type ContentSection
} from "./content-focus";
import {
  canReorderContributions,
  filterContributions,
  normalizeContributionSearch,
  type ContributionFilter
} from "./content-studio-model";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  allContributions: Contribution[];
  mediaAssets: CardMediaAsset[];
  mediaLayout: FinalCardMessageMediaLayout;
  messageAssignedCount: number;
  messageRequiredCount: number;
  memoryAssignedCount: number;
  memoryRequiredCount: number;
  messageLimit: number;
  occasionText: string;
  cardId: string;
  mainGreetingContributionId: string | null;
  focus: ContentFocus | null;
  section: ContentSection;
  journeySteps: OrganizerJourneyStep[];
  journeyCompletedCount: number;
  lifecycle: Pick<
    CardLifecycle,
    "collectionStatus" | "deliveryStatus" | "paymentStatus" | "hasAdminAccess"
  >;
  lifecycleLabel: string;
  participantLink: string;
  collectionReady: boolean;
  giftAccessible: boolean;
  stickyAction: {
    label: string;
    href: string;
  };
  greetingMode?: "classic" | "matrix" | "ladder";
};

type DropTarget = {
  contributionId: string;
  position: "before" | "after";
};

const initialState = {
  ok: false,
  message: ""
};

const MAIN_GREETING_MESSAGE_LIMIT = 500;

const ContentLifecycleCard = ({
  manageToken,
  contributionCount,
  lifecycle,
  participantLink,
  collectionReady,
  giftAccessible,
  stickyAction
}: {
  manageToken: string;
  contributionCount: number;
  lifecycle: Pick<
    CardLifecycle,
    "collectionStatus" | "deliveryStatus" | "paymentStatus" | "hasAdminAccess"
  >;
  participantLink: string;
  collectionReady: boolean;
  giftAccessible: boolean;
  stickyAction: { label: string; href: string };
}) => {
  const isDelivered = lifecycle.deliveryStatus === "DELIVERED";

  if (lifecycle.collectionStatus === "OPEN" && !isDelivered) {
    return (
      <ParticipantLinkCard
        manageToken={manageToken}
        participantLink={participantLink}
        contributionCount={contributionCount}
        lifecycle={lifecycle}
      />
    );
  }

  return (
    <EditorSidebarCard className={styles.contentParticipantCard}>
      <div className={styles.editorSidebarCardHeading}>
        <div>
          <h2>{isDelivered ? "Открытка передана" : "Ссылка для участников"}</h2>
          <p>
            {isDelivered
              ? giftAccessible
                ? "Финальная открытка доступна получателю."
                : "Доступ по финальной ссылке сейчас приостановлен."
              : `Получено поздравлений: ${contributionCount}`}
          </p>
        </div>
      </div>

      {isDelivered ? (
        <Link href={stickyAction.href} className={styles.contentContextPrimaryButton}>
          Посмотреть открытку
        </Link>
      ) : lifecycle.collectionStatus === "CLOSED" ? (
        <div className={styles.contentParticipantActions}>
          <p>Сбор закрыт. При необходимости его можно снова открыть для участников.</p>
          <form action={openCollectionAction}>
            <input type="hidden" name="manageToken" value={manageToken} />
            <button type="submit" className={styles.contentContextPrimaryButton}>
              Открыть сбор снова
            </button>
          </form>
        </div>
      ) : (
        <div className={styles.contentParticipantActions}>
          <p>
            {collectionReady
              ? "Откройте сбор, чтобы получить активную ссылку для участников."
              : "Сначала заполните обязательные поля открытки во вкладке «Оформление»."}
          </p>
          {collectionReady ? (
            <form action={openCollectionAction}>
              <input type="hidden" name="manageToken" value={manageToken} />
              <button type="submit" className={styles.contentContextPrimaryButton}>
                Открыть сбор
              </button>
            </form>
          ) : (
            <Link href={stickyAction.href} className={styles.contentContextPrimaryButton}>
              Продолжить настройку
            </Link>
          )}
        </div>
      )}

      {lifecycle.hasAdminAccess ? (
        <div className={styles.contentAccessGranted}>
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Доступ предоставлен</strong>
            <p>Платные возможности открытки открыты. Сбор поздравлений продолжается.</p>
          </div>
        </div>
      ) : null}
    </EditorSidebarCard>
  );
};

const ContentStickyAction = ({
  manageToken,
  contributionCount,
  lifecycle,
  participantLink,
  collectionReady,
  stickyAction
}: {
  manageToken: string;
  contributionCount: number;
  lifecycle: Pick<CardLifecycle, "collectionStatus" | "deliveryStatus">;
  participantLink: string;
  collectionReady: boolean;
  stickyAction: { label: string; href: string };
}) => {
  const isInputActive = useMobileInputActivity();
  let action;

  if (lifecycle.deliveryStatus === "DELIVERED") {
    action = (
      <Link href={stickyAction.href} className={styles.contentStickyPrimary}>
        Посмотреть открытку
      </Link>
    );
  } else if (lifecycle.collectionStatus === "DRAFT" && collectionReady) {
    action = (
      <form action={openCollectionAction}>
        <input type="hidden" name="manageToken" value={manageToken} />
        <button type="submit" className={styles.contentStickyPrimary}>
          Открыть сбор
        </button>
      </form>
    );
  } else if (lifecycle.collectionStatus === "OPEN" && contributionCount === 0) {
    action = (
      <ShareLinkButton
        value={participantLink}
        label="Поделиться ссылкой"
        className={styles.contentStickyPrimary}
      />
    );
  } else if (lifecycle.collectionStatus === "CLOSED") {
    action = (
      <form action={openCollectionAction}>
        <input type="hidden" name="manageToken" value={manageToken} />
        <button type="submit" className={styles.contentStickyPrimary}>
          Открыть сбор снова
        </button>
      </form>
    );
  } else {
    action = (
      <Link href={stickyAction.href} className={styles.contentStickyPrimary}>
        {stickyAction.label}
      </Link>
    );
  }

  return (
    <div
      className={`${styles.contentStickyAction} ${
        isInputActive ? styles.mobileStickySuppressed : ""
      }`}
      aria-hidden={isInputActive}
    >
      {action}
    </div>
  );
};

export const ContentStudio = ({
  manageToken,
  allContributions,
  mediaAssets,
  mediaLayout,
  messageAssignedCount,
  messageRequiredCount,
  memoryAssignedCount,
  memoryRequiredCount,
  messageLimit,
  occasionText,
  cardId,
  mainGreetingContributionId,
  focus,
  section,
  journeySteps,
  journeyCompletedCount,
  lifecycle,
  lifecycleLabel,
  participantLink,
  collectionReady,
  giftAccessible,
  stickyAction,
  greetingMode = "classic"
}: Props) => {
  const router = useRouter();
  const [manualState, setManualState] = useState(initialState);
  const [isManualPending, startManualTransition] = useTransition();
  const [contributionOrder, setContributionOrder] = useState(allContributions.map((item) => item.id));
  const [draggedContributionId, setDraggedContributionId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [expandedContributionIds, setExpandedContributionIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<ContributionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [manualMessage, setManualMessage] = useState("");
  const [manualAiGenerationIds, setManualAiGenerationIds] = useState<string[]>([]);
  const [isAiHelpOpen, setIsAiHelpOpen] = useState(false);
  const [highlightedContributionId, setHighlightedContributionId] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const [savedContributionOrderKey, setSavedContributionOrderKey] = useState(
    allContributions.map((contribution) => contribution.id).join(":")
  );

  const getRecommendedMessageLimit = useCallback(
    (contribution: Contribution) =>
      contribution.id === mainGreetingContributionId ? MAIN_GREETING_MESSAGE_LIMIT : messageLimit,
    [mainGreetingContributionId, messageLimit]
  );
  const getRecommendedOverflow = useCallback(
    (contribution: Contribution) => contribution.message.length - getRecommendedMessageLimit(contribution),
    [getRecommendedMessageLimit]
  );

  const tooLongCount = allContributions.filter((contribution) => getRecommendedOverflow(contribution) > 0).length;
  const hiddenCount = allContributions.filter((contribution) => contribution.status === "hidden").length;
  const activeCount = allContributions.filter((contribution) => contribution.status === "visible").length;
  const noRoleCount = allContributions.filter((contribution) => !contribution.authorRole?.trim()).length;
  const mainGreetingContribution =
    allContributions.find(
      (contribution) =>
        contribution.id === mainGreetingContributionId &&
        contribution.status === "visible"
    ) ?? null;
  const normalizedSearchQuery = normalizeContributionSearch(searchQuery);
  const canReorder = canReorderContributions({
    filter: activeFilter,
    searchQuery
  });
  const currentContributionOrderKey = contributionOrder.join(":");
  const [orderSaveStatus, setOrderSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const orderFormRef = useRef<HTMLFormElement>(null);
  const submittedOrderKeyRef = useRef<string | null>(null);
  const orderAutoSaveReadyRef = useRef(false);
  const lastOrderAutoSaveAtRef = useRef(0);
  const handleOrderAction = async (previousState: typeof initialState, formData: FormData) => {
    const submittedKey = submittedOrderKeyRef.current ?? currentContributionOrderKey;
    const result = await reorderContributionsAction(previousState, formData);
    if (result.ok) {
      setSavedContributionOrderKey(submittedKey);
      setOrderSaveStatus("saved");
    } else {
      setOrderSaveStatus("idle");
    }
    submittedOrderKeyRef.current = null;
    return result;
  };
  const [, formAction, isPending] = useActionState(handleOrderAction, initialState);

  // Auto-save contribution order immediately when it changes
  useEffect(() => {
    if (!orderAutoSaveReadyRef.current) {
      orderAutoSaveReadyRef.current = true;
      return;
    }
    const dirty = savedContributionOrderKey !== currentContributionOrderKey;
    if (!dirty || !orderFormRef.current || isPending) return;
    if (submittedOrderKeyRef.current === currentContributionOrderKey) return;
    const now = Date.now();
    if (now - lastOrderAutoSaveAtRef.current < 800) return;
    lastOrderAutoSaveAtRef.current = now;
    submittedOrderKeyRef.current = currentContributionOrderKey;
    setOrderSaveStatus("saving");
    orderFormRef.current.requestSubmit();
  }, [currentContributionOrderKey, savedContributionOrderKey, isPending]);

  const orderedContributions = useMemo(() => {
    const map = new Map(allContributions.map((contribution) => [contribution.id, contribution]));
    return contributionOrder
      .map((contributionId) => map.get(contributionId))
      .filter((contribution): contribution is Contribution => Boolean(contribution));
  }, [allContributions, contributionOrder]);

  const visibleContributions = useMemo(() => {
    return filterContributions({
      contributions: orderedContributions,
      filter: activeFilter,
      searchQuery,
      getRecommendedOverflow
    });
  }, [activeFilter, getRecommendedOverflow, orderedContributions, searchQuery]);

  const moveContribution = (targetContributionId: string, pointerPosition: "before" | "after") => {
    if (!draggedContributionId || draggedContributionId === targetContributionId) {
      return;
    }

    setContributionOrder((current) => {
      const withoutDragged = current.filter((item) => item !== draggedContributionId);
      const targetIndex = withoutDragged.indexOf(targetContributionId);

      if (targetIndex === -1) {
        return current;
      }

      const next = [...withoutDragged];
      const insertIndex = pointerPosition === "after" ? targetIndex + 1 : targetIndex;
      next.splice(insertIndex, 0, draggedContributionId);
      return next;
    });

    setDraggedContributionId(null);
    setDropTarget(null);
  };

  const moveContributionByStep = (contributionId: string, direction: "up" | "down") => {
    const visibleIds = visibleContributions.map((contribution) => contribution.id);
    const currentVisibleIndex = visibleIds.indexOf(contributionId);
    const targetVisibleId = visibleIds[direction === "up" ? currentVisibleIndex - 1 : currentVisibleIndex + 1];

    if (currentVisibleIndex === -1 || !targetVisibleId) {
      return;
    }

    setContributionOrder((current) => {
      const withoutMoved = current.filter((id) => id !== contributionId);
      const targetIndex = withoutMoved.indexOf(targetVisibleId);

      if (targetIndex === -1) {
        return current;
      }

      const next = [...withoutMoved];
      next.splice(direction === "up" ? targetIndex : targetIndex + 1, 0, contributionId);
      return next;
    });
  };

  const moveContributionToEnd = (contributionId: string) => {
    setContributionOrder((current) => [...current.filter((item) => item !== contributionId), contributionId]);
  };

  const moveContributionToActiveEnd = (contributionId: string) => {
    setContributionOrder((current) => {
      const withoutTarget = current.filter((item) => item !== contributionId);
      const firstHiddenIndex = withoutTarget.findIndex((id) => {
        const contribution = allContributions.find((item) => item.id === id);
        return contribution?.status === "hidden";
      });

      if (firstHiddenIndex === -1) {
        return [...withoutTarget, contributionId];
      }

      return [
        ...withoutTarget.slice(0, firstHiddenIndex),
        contributionId,
        ...withoutTarget.slice(firstHiddenIndex)
      ];
    });
  };

  const handleVisibilityToggle = (contributionId: string, isHidden: boolean) => {
    setExpandedContributionIds((current) => current.filter((id) => id !== contributionId));

    if (isHidden) {
      moveContributionToActiveEnd(contributionId);
      return;
    }

    moveContributionToEnd(contributionId);
  };

  const handleDragStart = (event: ReactDragEvent<HTMLButtonElement>, contributionId: string) => {
    setDraggedContributionId(contributionId);
    setDropTarget(null);
    event.dataTransfer.effectAllowed = "move";

    const card = event.currentTarget.closest("article");

    if (card instanceof HTMLElement) {
      const rect = card.getBoundingClientRect();
      event.dataTransfer.setDragImage(card, event.clientX - rect.left, event.clientY - rect.top);
    }
  };

  const handleDragOver = (event: ReactDragEvent<HTMLElement>, contributionId: string) => {
    if (!draggedContributionId || draggedContributionId === contributionId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = event.clientY < midpoint ? "before" : "after";

    setDropTarget((current) => {
      if (current?.contributionId === contributionId && current.position === position) {
        return current;
      }

      return { contributionId, position };
    });
  };

  const handleDragLeave = (event: ReactDragEvent<HTMLElement>, contributionId: string) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setDropTarget((current) => (current?.contributionId === contributionId ? null : current));
  };

  const handleDrop = (event: ReactDragEvent<HTMLElement>, contributionId: string) => {
    event.preventDefault();

    if (!draggedContributionId || draggedContributionId === contributionId || !dropTarget) {
      setDropTarget(null);
      return;
    }

    moveContribution(contributionId, dropTarget.position);
  };

  const toggleContribution = (contributionId: string) => {
    if (!expandedContributionIds.includes(contributionId)) {
      setIsManualFormOpen(false);
    }
    setExpandedContributionIds((current) =>
      current.includes(contributionId)
        ? current.filter((id) => id !== contributionId)
        : [contributionId]
    );
  };

  const openManualForm = () => {
    setExpandedContributionIds([]);
    setIsManualFormOpen(true);
  };

  const toggleManualForm = () => {
    if (!isManualFormOpen) setExpandedContributionIds([]);
    setIsManualFormOpen((current) => !current);
  };

  const handleManualContributionSubmit = (formData: FormData) => {
    startManualTransition(async () => {
      const result = await addManualContributionAction(initialState, formData);
      setManualState(result);

      if (result.ok) {
        setManualMessage("");
        setManualAiGenerationIds([]);
        setIsManualFormOpen(false);
        setActiveFilter("all");
        router.refresh();
      }
    });
  };

  const focusContributionControl = useCallback((contributionId: string) => {
    setActiveFilter("all");
    setSearchQuery("");
    setIsManualFormOpen(false);
    setExpandedContributionIds([contributionId]);
    setHighlightedContributionId(contributionId);

    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedContributionId(null);
    }, 1800);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const card = document.getElementById(`contribution-${contributionId}`);
        card?.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById(`main-greeting-control-${contributionId}`)?.focus({
          preventScroll: true
        });
      });
    });
  }, []);

  useEffect(
    () => () => {
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!focus) return;

    const frame = window.requestAnimationFrame(() => {
      const section = document.getElementById(contentFocusSectionIds[focus]);
      if (!section) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      const heading = section.querySelector<HTMLElement>("[data-focus-heading], h2, h3") ?? section;
      if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [section, focus]);

  return (
    <div className={styles.contentStudio}>
      <div className={`${styles.editorWorkspace} ${styles.contentLayout}`}>
        <div className={`${styles.editorMain} ${styles.contentWorkspaceMain}`}>
          {section === "congratulations" ? (
        <section
          className={styles.contentPanel}
          id="content-panel-congratulations"
        >
          <div className={styles.contentPanelHeader}>
            <div className={styles.contentPanelTopRow}>
              <div className={styles.contentPanelTitleWrap}>
                <h2 className={styles.contentPanelTitle}>Все поздравления</h2>
                {orderSaveStatus !== "idle" ? (
                  <span className={styles.contentOrderStatusText}>
                    {orderSaveStatus === "saving" ? "Сохраняем…" : "Изменения сохранены"}
                  </span>
                ) : null}
              </div>
              <div className={styles.contentToolbar}>
                <button
                  type="button"
                  className={`${styles.mediaLibraryUploadToggle} ${styles.mediaManagerActionButton}`}
                  onClick={toggleManualForm}
                >
                  <span>{isManualFormOpen ? "−" : "+"}</span>
                  <span>{isManualFormOpen ? "Скрыть форму" : "Добавить вручную"}</span>
                </button>
              </div>
            </div>

            <div>
              <p className={styles.contentPanelText}>
                Модерируйте поздравления, выберите главное и при необходимости измените порядок.
              </p>
            </div>

            <section
              id="main-congratulation"
              className={`${styles.contentMainGreetingCard} ${
                mainGreetingContribution ? "" : styles.contentMainGreetingCardEmpty
              }`}
            >
              <div className={styles.contentMainGreetingIntro}>
                <span className={styles.contentMainGreetingIcon} aria-hidden="true">☆</span>
                <div>
                  <h3 data-focus-heading>Главное поздравление</h3>
                  <p>Это поздравление будет показано отдельным акцентным блоком.</p>
                </div>
              </div>
              {mainGreetingContribution ? (
                <div className={styles.contentMainGreetingSelection}>
                  <div className={styles.contentAvatar}>
                    {mainGreetingContribution.authorAvatarUrl ? (
                      <Image
                        src={mainGreetingContribution.authorAvatarUrl}
                        alt=""
                        width={52}
                        height={52}
                        unoptimized
                        className={styles.contentAvatarImage}
                      />
                    ) : (
                      mainGreetingContribution.authorName.trim().slice(0, 1).toUpperCase() || "?"
                    )}
                  </div>
                  <div>
                    <strong>{mainGreetingContribution.authorName}</strong>
                    <p>{mainGreetingContribution.message}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.contentContextSecondaryButton}
                    onClick={() => focusContributionControl(mainGreetingContribution.id)}
                  >
                    Изменить
                  </button>
                </div>
              ) : (
                <div className={styles.contentMainGreetingMissing}>
                  <p>
                    Выберите одно поздравление — оно станет главным личным блоком открытки.
                  </p>
                  {allContributions.some((contribution) => contribution.status === "visible") ? (
                    <button
                      type="button"
                      className={styles.contentContextSecondaryButton}
                      onClick={() => {
                        const firstVisible = orderedContributions.find(
                          (contribution) => contribution.status === "visible"
                        );
                        if (firstVisible) focusContributionControl(firstVisible.id);
                      }}
                    >
                      Выбрать главное поздравление
                    </button>
                  ) : null}
                </div>
              )}
            </section>
          </div>

          <div className={styles.contentListControls}>
            <label className={styles.contentSearch}>
              <span className={styles.visuallyHidden}>Поиск поздравлений</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск по имени, роли или тексту"
              />
            </label>

          <div className={styles.contentFilterRow} aria-label="Фильтры поздравлений">
            <button
              type="button"
              className={`${styles.contentFilterPill} ${activeFilter === "all" ? styles.contentFilterPillActive : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              Все {allContributions.length}
            </button>
            <button
              type="button"
              className={`${styles.contentFilterPill} ${activeFilter === "active" ? styles.contentFilterPillActive : ""}`}
              onClick={() => setActiveFilter("active")}
            >
              Активные {activeCount}
            </button>
            <button
              type="button"
              className={`${styles.contentFilterPill} ${activeFilter === "hidden" ? styles.contentFilterPillActive : ""}`}
              onClick={() => setActiveFilter("hidden")}
            >
              Скрытые {hiddenCount}
            </button>
            <button
              type="button"
              className={`${styles.contentFilterPill} ${activeFilter === "too-long" ? styles.contentFilterPillActive : ""}`}
              onClick={() => setActiveFilter("too-long")}
            >
              Нужно сократить {tooLongCount}
            </button>
            <button
              type="button"
              className={`${styles.contentFilterPill} ${activeFilter === "no-role" ? styles.contentFilterPillActive : ""}`}
              onClick={() => setActiveFilter("no-role")}
            >
              Без роли {noRoleCount}
            </button>
          </div>
          </div>

          {!canReorder ? (
            <p className={styles.contentReorderHint}>
              Чтобы изменить порядок, очистите поиск и выберите фильтр «Все».
            </p>
          ) : null}

          {isManualFormOpen ? (
            <form action={handleManualContributionSubmit} className={styles.manualContributionForm}>
              <input type="hidden" name="manageToken" value={manageToken} />
              <input type="hidden" name="aiGenerationIds" value={manualAiGenerationIds.join(",")} />
              <div className={styles.manualContributionHeader}>
                <div>
                  <h3>Добавить поздравление вручную</h3>
                  <p>Для сообщений из чата, звонка или от человека, который не может открыть форму сайта.</p>
                </div>
                <button type="button" className={styles.contentSoftButton} onClick={() => setIsManualFormOpen(false)}>
                  Свернуть
                </button>
              </div>

              <div className={styles.manualContributionGrid}>
                <label>
                  <span>Имя автора</span>
                  <input name="authorName" placeholder="Например, Мария" required minLength={2} maxLength={80} />
                </label>
                <label>
                  <span>Роль или подпись</span>
                  <input name="authorRole" placeholder="Например, коллега" maxLength={80} />
                </label>
              </div>

              <label className={styles.manualContributionMessage}>
                <span>Текст поздравления</span>
                <textarea
                  name="message"
                  placeholder="Вставьте или напишите поздравление от участника..."
                  value={manualMessage}
                  onChange={(event) => setManualMessage(event.target.value)}
                  required
                  minLength={20}
                  maxLength={1500}
                  rows={5}
                />
              </label>

              <div className={styles.manualContributionAi}>
                <button
                  type="button"
                  className={styles.contentAiButton}
                  onClick={() => setIsAiHelpOpen((current) => !current)}
                >
                  {isAiHelpOpen ? "✨ Скрыть помощь" : "✨ Нужна помощь с текстом?"}
                </button>
                {isAiHelpOpen ? (
                  <AiHelper
                    cardId={cardId}
                    manageToken={manageToken}
                    occasionText={occasionText}
                    messageLimit={messageLimit}
                    onUseText={(text) => {
                      setManualMessage(text);
                    }}
                    onGeneration={(generationId) => {
                      setManualAiGenerationIds((current) =>
                        current.includes(generationId) ? current : [...current, generationId]
                      );
                    }}
                    variant="join"
                    greetingMode={greetingMode}
                  />
                ) : null}
              </div>

              <div className={styles.manualContributionFooter}>
                <button type="submit" className={styles.contentPrimaryButton} disabled={isManualPending}>
                  {isManualPending ? "Добавляем..." : "Добавить поздравление"}
                </button>
                <span className={styles.manualContributionCount}>{manualMessage.length} / 1500</span>
                <span className={manualState.ok ? styles.limitOk : styles.limitWarning}>
                  {manualState.message || `Рекомендуется до ${messageLimit} символов.`}
                </span>
              </div>
            </form>
          ) : null}

          {visibleContributions.length === 0 ? (
            allContributions.length === 0 ? (
              <div className={styles.contentEmptyState}>
                <h3>Поздравлений пока нет</h3>
                <p>Поделитесь ссылкой с участниками или добавьте поздравление вручную.</p>
                <div>
                  {lifecycle.collectionStatus === "OPEN" ? (
                    <ShareLinkButton
                      value={participantLink}
                      label="Поделиться ссылкой"
                      className={styles.contentContextPrimaryButton}
                    />
                  ) : null}
                  <button
                    type="button"
                    className={styles.contentContextSecondaryButton}
                    onClick={openManualForm}
                  >
                    Добавить вручную
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.contentEmptyState}>
                <h3>Ничего не найдено</h3>
                <p>Попробуйте изменить запрос или выбрать другой фильтр.</p>
                <button
                  type="button"
                  className={styles.contentContextSecondaryButton}
                  onClick={() => {
                    setSearchQuery("");
                    setActiveFilter("all");
                  }}
                >
                  Сбросить поиск и фильтры
                </button>
              </div>
            )
          ) : (
            <div className={styles.contentCards}>
              {visibleContributions.map((contribution) => {
                const recommendedLimit = getRecommendedMessageLimit(contribution);
                const overflow = contribution.message.length - recommendedLimit;
                const isTooLong = overflow > 0;
                const isHidden = contribution.status === "hidden";
                const isExpanded = expandedContributionIds.includes(contribution.id);
                const isMainGreeting = mainGreetingContribution?.id === contribution.id;
                const globalIndex = contributionOrder.indexOf(contribution.id);

                return (
                  <article
                    key={contribution.id}
                    id={`contribution-${contribution.id}`}
                    className={[
                      styles.contentContributionCard,
                      isTooLong ? styles.contentContributionCardWarn : "",
                      isExpanded ? styles.contentContributionCardExpanded : "",
                      highlightedContributionId === contribution.id
                        ? styles.contentContributionCardHighlighted
                        : "",
                      draggedContributionId === contribution.id ? styles.contentContributionCardDragging : "",
                      dropTarget?.contributionId === contribution.id ? styles.contentContributionCardDropTarget : "",
                      dropTarget?.contributionId === contribution.id && dropTarget.position === "before"
                        ? styles.contentContributionCardDropBefore
                        : "",
                      dropTarget?.contributionId === contribution.id && dropTarget.position === "after"
                        ? styles.contentContributionCardDropAfter
                        : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onDragOver={(event) => handleDragOver(event, contribution.id)}
                    onDragLeave={(event) => handleDragLeave(event, contribution.id)}
                    onDrop={(event) => handleDrop(event, contribution.id)}
                  >
                    <div className={styles.contentCardHead}>
                      <div className={styles.contentCardTopRow}>
                        <div className={styles.contentContributionLead}>
                          {canReorder ? (
                            <button
                              type="button"
                              className={styles.contentGripButtonPlain}
                              draggable
                              onDragStart={(event) => handleDragStart(event, contribution.id)}
                              onDragEnd={() => {
                                setDraggedContributionId(null);
                                setDropTarget(null);
                              }}
                              aria-label={`Перетащить поздравление ${contribution.authorName}`}
                            >
                              <svg
                                className={styles.contentGripPlain}
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                aria-hidden="true"
                              >
                                <circle cx="4" cy="4" r="1.5" fill="currentColor" />
                                <circle cx="12" cy="4" r="1.5" fill="currentColor" />
                                <circle cx="4" cy="8" r="1.5" fill="currentColor" />
                                <circle cx="12" cy="8" r="1.5" fill="currentColor" />
                                <circle cx="4" cy="12" r="1.5" fill="currentColor" />
                                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                              </svg>
                            </button>
                          ) : (
                            <span className={styles.contentGripPlaceholder} aria-hidden="true" />
                          )}
                          <span className={styles.contentOrder}>#{globalIndex + 1}</span>
                          <div className={styles.contentAvatar}>
                            {contribution.authorAvatarUrl ? (
                              <Image
                                src={contribution.authorAvatarUrl}
                                alt=""
                                width={52}
                                height={52}
                                unoptimized
                                className={styles.contentAvatarImage}
                              />
                            ) : (
                              contribution.authorName.trim().slice(0, 1).toUpperCase() || "?"
                            )}
                          </div>
                          <div className={styles.contentIdentityStack}>
                            <div className={styles.contentIdentityInline}>
                              <strong>{contribution.authorName}</strong>
                              <span>· {contribution.authorRole?.trim() || "без роли"}</span>
                            </div>
                            <div className={styles.contentContributionBadges}>
                              <span className={isTooLong ? styles.limitWarning : styles.limitOk}>
                                {isTooLong ? `Длиннее рекомендации на ${overflow} символов` : "Длина текста оптимальна"}
                              </span>
                              {isMainGreeting ? <span className={styles.contentMainBadge}>Главное</span> : null}
                              <span
                                className={`${styles.contentVisibilityBadge} ${
                                  isHidden ? styles.contentVisibilityBadgeHidden : styles.contentVisibilityBadgeActive
                                }`}
                              >
                                {isHidden ? "Скрыто" : "Активно"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.contentTopControls}>
                          {canReorder ? (
                            <div
                              className={styles.contentMoveButtons}
                              aria-label={`Порядок поздравления ${contribution.authorName}`}
                            >
                              <button
                                type="button"
                                className={styles.contentMoveButton}
                                onClick={() => moveContributionByStep(contribution.id, "up")}
                                disabled={globalIndex === 0}
                                aria-label={`Поднять поздравление ${contribution.authorName}`}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className={styles.contentMoveButton}
                                onClick={() => moveContributionByStep(contribution.id, "down")}
                                disabled={globalIndex === contributionOrder.length - 1}
                                aria-label={`Опустить поздравление ${contribution.authorName}`}
                              >
                                ↓
                              </button>
                            </div>
                          ) : null}
                          <button
                            type="button"
                            className={styles.contentChevronButton}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => toggleContribution(contribution.id)}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? "Свернуть поздравление" : "Развернуть поздравление"}
                          >
                            <span className={`${styles.contentChevron} ${isExpanded ? styles.contentChevronExpanded : ""}`}>
                              ˅
                            </span>
                          </button>
                        </div>
                      </div>

                      {!isExpanded ? (
                        <p className={styles.contentContributionExcerpt}>{contribution.message}</p>
                      ) : null}
                    </div>

                    {isExpanded ? (
                      <div className={styles.contentContributionBody}>
                        <div className={styles.contentExpandedActions}>
                          <form action={setMainGreetingAction}>
                            <input type="hidden" name="manageToken" value={manageToken} />
                            <input type="hidden" name="contributionId" value={isMainGreeting ? "" : contribution.id} />
                            <button
                              id={`main-greeting-control-${contribution.id}`}
                              type="submit"
                              className={`${styles.contentSoftButton} ${isMainGreeting ? styles.contentMainActionActive : ""}`}
                              disabled={isHidden}
                              title={isHidden ? "Сначала покажите поздравление в открытке" : "Показать в блоке «Самые важные слова»"}
                            >
                              {isMainGreeting ? "Убрать из главного" : "В главное"}
                            </button>
                          </form>
                          {isMainGreeting ? (
                            <p className={styles.contentMainGreetingHint}>
                              Это поздравление показывается отдельно в блоке «Главное о тебе» и не повторяется в общем списке.
                            </p>
                          ) : null}
                          <div className={styles.contentExpandedToggle}>
                            <span className={styles.contentBodyLabelCompact}>Показывать в открытке</span>
                            <form action={setContributionStatusAction}>
                              <input type="hidden" name="manageToken" value={manageToken} />
                              <input type="hidden" name="contributionId" value={contribution.id} />
                              <input type="hidden" name="status" value={isHidden ? "visible" : "hidden"} />
                              <button
                                type="submit"
                                className={`${styles.contentToggleView} ${!isHidden ? styles.contentToggleViewActive : ""}`}
                                onClick={() => {
                                  window.setTimeout(() => handleVisibilityToggle(contribution.id, isHidden), 0);
                                }}
                                aria-label={isHidden ? "Показать поздравление" : "Скрыть поздравление"}
                              >
                                <span className={styles.contentToggleKnob} />
                              </button>
                            </form>
                          </div>
                        </div>
                        <ContributionEditor
                          cardId={cardId}
                          contributionId={contribution.id}
                          manageToken={manageToken}
                          initialMessage={contribution.message}
                          messageLimit={recommendedLimit}
                        />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

        </section>
        ) : (
          <section
            className={styles.contentPhotoSection}
            id="content-panel-photos"
          >
            <MediaManager
              manageToken={manageToken}
              mediaAssets={mediaAssets}
              mediaLayout={mediaLayout}
              messageAssignedCount={messageAssignedCount}
              messageRequiredCount={messageRequiredCount}
              memoryAssignedCount={memoryAssignedCount}
              memoryRequiredCount={memoryRequiredCount}
            />
          </section>
        )}
        </div>

        <aside className={`${styles.editorSidebar} ${styles.contentContextRail}`}>
          <PreparationProgress
            steps={journeySteps}
            completedCount={journeyCompletedCount}
            lifecycleLabel={lifecycleLabel}
            persistenceKey={`card-preparation:${manageToken}`}
          />
          <ContentLifecycleCard
            manageToken={manageToken}
            contributionCount={allContributions.length}
            lifecycle={lifecycle}
            participantLink={participantLink}
            collectionReady={collectionReady}
            giftAccessible={giftAccessible}
            stickyAction={stickyAction}
          />
        </aside>
      </div>

      <ContentStickyAction
        manageToken={manageToken}
        contributionCount={allContributions.length}
        lifecycle={lifecycle}
        participantLink={participantLink}
        collectionReady={collectionReady}
        stickyAction={stickyAction}
      />

      <form
        ref={orderFormRef}
        action={formAction}
        className={styles.contentAutoSaveForm}
      >
        <input type="hidden" name="manageToken" value={manageToken} />
        {contributionOrder.map((contributionId) => (
          <input key={contributionId} type="hidden" name="orderedContributionIds" value={contributionId} />
        ))}
      </form>
    </div>
  );
};
