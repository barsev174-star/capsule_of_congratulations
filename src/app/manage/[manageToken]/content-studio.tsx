"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type DragEvent as ReactDragEvent } from "react";
import { useRouter } from "next/navigation";
import type { CardMediaAsset, Contribution } from "@/lib/cards/types";
import type { FinalCardMessageMediaLayout } from "@/lib/final-card/types";
import { getManagePath, getPreviewPath } from "@/lib/routes/card-links";
import { AiHelper } from "@/app/card/[publicSlug]/ai-helper";
import { ContributionEditor } from "./contribution-editor";
import { MediaManager } from "./media-manager";
import {
  addManualContributionAction,
  reorderContributionsAction,
  setContributionStatusAction,
  setMainGreetingAction
} from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  allContributions: Contribution[];
  mediaAssets: CardMediaAsset[];
  mediaLayout: FinalCardMessageMediaLayout;
  messageLimit: number;
  recipientName: string;
  occasionText: string;
  fromLabel: string;
  publicSlug: string;
  templateAccent: string;
  previewMessage?: Contribution;
  cardId: string;
  mainGreetingContributionId: string | null;
  greetingMode?: "classic" | "matrix" | "ladder";
};

type DropTarget = {
  contributionId: string;
  position: "before" | "after";
};

type ContributionFilter = "all" | "active" | "hidden" | "too-long" | "no-role";

const initialState = {
  ok: false,
  message: ""
};

const MAIN_GREETING_MESSAGE_LIMIT = 500;

export const ContentStudio = ({
  manageToken,
  allContributions,
  mediaAssets,
  mediaLayout,
  messageLimit,
  recipientName,
  occasionText,
  fromLabel,
  publicSlug,
  templateAccent,
  previewMessage,
  cardId,
  mainGreetingContributionId,
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
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [manualMessage, setManualMessage] = useState("");
  const [manualAiGenerationIds, setManualAiGenerationIds] = useState<string[]>([]);
  const [isAiHelpOpen, setIsAiHelpOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
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
  const withinLimitCount = allContributions.length - tooLongCount;
  const hiddenCount = allContributions.filter((contribution) => contribution.status === "hidden").length;
  const activeCount = allContributions.filter((contribution) => contribution.status === "visible").length;
  const noRoleCount = allContributions.filter((contribution) => !contribution.authorRole?.trim()).length;
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
    return orderedContributions.filter((contribution) => {
      if (activeFilter === "active") {
        return contribution.status === "visible";
      }

      if (activeFilter === "hidden") {
        return contribution.status === "hidden";
      }

      if (activeFilter === "too-long") {
        return getRecommendedOverflow(contribution) > 0;
      }

      if (activeFilter === "no-role") {
        return !contribution.authorRole?.trim();
      }

      return true;
    });
  }, [activeFilter, getRecommendedOverflow, orderedContributions]);

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
    setExpandedContributionIds((current) =>
      current.includes(contributionId)
        ? current.filter((id) => id !== contributionId)
        : [contributionId]
    );
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

  return (
    <div className={styles.contentStudio}>
      <section className={styles.contentStatusBar}>
        <div className={styles.contentStatusItem}>
          <span className={`${styles.contentStatusDot} ${styles.contentStatusDotWarm}`} />
          <span>{allContributions.length} поздравлений собрано</span>
        </div>
        <div className={styles.contentStatusItem}>
          <span className={`${styles.contentStatusDot} ${styles.contentStatusDotOk}`} />
          <span>{withinLimitCount} подходят по длине</span>
        </div>
        <div className={styles.contentStatusItem}>
          <span className={`${styles.contentStatusDot} ${styles.contentStatusDotAlert}`} />
          <span>{tooLongCount} нужно сократить</span>
        </div>
        <div className={styles.contentStatusItem}>
          <span className={`${styles.contentStatusDot} ${styles.contentStatusDotWarm}`} />
          <span>{mediaAssets.length} фото добавлено</span>
        </div>
      </section>

      <div className={styles.contentLayout}>
        <section className={styles.contentPanel}>
          <div className={styles.contentPanelHeader}>
            <div className={styles.contentPanelTopRow}>
              <div className={styles.contentPanelTitleWrap}>
                <h2 className={styles.contentPanelTitle}>Поздравления</h2>
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
                  onClick={() => setIsManualFormOpen((current) => !current)}
                >
                  <span>{isManualFormOpen ? "−" : "+"}</span>
                  <span>{isManualFormOpen ? "Скрыть форму" : "Добавить вручную"}</span>
                </button>
              </div>
            </div>

            <div>
              <p className={styles.contentPanelText}>Модерируйте поздравления, выделяйте главное и изменяйте порядок.</p>
            </div>
          </div>

          <div className={styles.contentFilterRow}>
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
              Слишком длинные {tooLongCount}
            </button>
            <button
              type="button"
              className={`${styles.contentFilterPill} ${activeFilter === "no-role" ? styles.contentFilterPillActive : ""}`}
              onClick={() => setActiveFilter("no-role")}
            >
              Без роли {noRoleCount}
            </button>
          </div>

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
            <p className={styles.empty}>Пока поздравлений нет. Сначала участники должны добавить свои сообщения.</p>
          ) : (
            <div className={styles.contentCards}>
              {visibleContributions.map((contribution, index) => {
                const recommendedLimit = getRecommendedMessageLimit(contribution);
                const overflow = contribution.message.length - recommendedLimit;
                const isTooLong = overflow > 0;
                const isHidden = contribution.status === "hidden";
                const isExpanded = expandedContributionIds.includes(contribution.id);
                const isMainGreeting = mainGreetingContributionId === contribution.id;

                return (
                  <article
                    key={contribution.id}
                    className={[
                      styles.contentContributionCard,
                      isTooLong ? styles.contentContributionCardWarn : "",
                      isExpanded ? styles.contentContributionCardExpanded : "",
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
                          <span className={styles.contentOrder}>#{index + 1}</span>
                          <div className={styles.contentAvatar}>
                            {contribution.authorName.trim().slice(0, 1).toUpperCase() || "?"}
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
                          <div className={styles.contentMoveButtons} aria-label={`Порядок поздравления ${contribution.authorName}`}>
                            <button
                              type="button"
                              className={styles.contentMoveButton}
                              onClick={() => moveContributionByStep(contribution.id, "up")}
                              disabled={index === 0}
                              aria-label={`Поднять поздравление ${contribution.authorName}`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className={styles.contentMoveButton}
                              onClick={() => moveContributionByStep(contribution.id, "down")}
                              disabled={index === visibleContributions.length - 1}
                              aria-label={`Опустить поздравление ${contribution.authorName}`}
                            >
                              ↓
                            </button>
                          </div>
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

        <aside className={styles.contentRail}>
          <section
            className={styles.contentPreviewCard}
            style={
              {
                "--preview-accent": templateAccent
              } as CSSProperties
            }
          >
            <div className={styles.contentPreviewHeader}>
              <h2 className={styles.contentRailTitle}>Предпросмотр поздравлений</h2>
              <p className={styles.previewStatusLine}>
                <span className={styles.previewStatusDot} />
                <span>Обновляется автоматически</span>
              </p>
            </div>

            <article className={styles.contentPreviewStory}>
              <section className={styles.contentPreviewCover}>
                <span className={styles.contentPreviewKicker}>Открытка для тебя</span>
                <strong>{recipientName}</strong>
                <p>{occasionText}</p>
                <small>{fromLabel}</small>
              </section>

              <section className={styles.contentPreviewMessageCard}>
                <div className={styles.contentPreviewAvatar} />
                <div className={styles.contentPreviewMessageBody}>
                  <div className={styles.contentPreviewMessageMeta}>
                    <strong>{previewMessage?.authorName || "Дима"}</strong>
                    <span>{previewMessage?.authorRole || "ученик"}</span>
                  </div>
                  <p>
                    {previewMessage?.message.slice(0, 140) ||
                      "Очень хочется сказать вам теплые слова и поблагодарить за добро, которое вы даете людям..."}
                  </p>
                </div>
              </section>

              <section className={styles.contentPreviewFinal}>
                <span>Спасибо, что ты с нами!</span>
                <p>Вперед - к мечтам.</p>
              </section>
            </article>

            <Link href={getPreviewPath(manageToken)} target="_blank" className={styles.previewLinkButton}>
              Открыть полный просмотр
            </Link>
          </section>

          <MediaManager manageToken={manageToken} mediaAssets={mediaAssets} mediaLayout={mediaLayout} />

          <section className={styles.contentTipsCard}>
            <button
              type="button"
              className={styles.contentTipsToggle}
              onClick={() => setIsTipsOpen((current) => !current)}
              aria-expanded={isTipsOpen}
            >
              <h2 className={styles.contentRailTitle}>Подсказки по фото и поздравлениям</h2>
              <span className={`${styles.contentTipsChevron} ${isTipsOpen ? styles.contentTipsChevronOpen : ""}`}>˅</span>
            </button>
            {isTipsOpen ? (
              <ul className={styles.contentTipsList}>
                <li>Тексты до {messageLimit} символов читаются лучше и выглядят аккуратнее.</li>
                <li>Перетаскивайте карточки за левый значок, чтобы менять их порядок в открытке.</li>
                <li>Не забудьте добавить фото — они делают открытку живой и теплой.</li>
              </ul>
            ) : null}
          </section>
        </aside>
      </div>

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
