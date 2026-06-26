"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type DragEvent as ReactDragEvent } from "react";
import { useRouter } from "next/navigation";
import type { CardMediaAsset, Contribution } from "@/lib/cards/types";
import type { FinalCardMessageMediaLayout } from "@/lib/final-card/types";
import { getGiftPath, getJoinUrl, getManagePath } from "@/lib/routes/card-links";
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
  finalSlug: string;
  templateAccent: string;
  previewMessage?: Contribution;
  cardId: string;
  mainGreetingContributionId: string | null;
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
  finalSlug,
  templateAccent,
  previewMessage,
  cardId,
  mainGreetingContributionId
}: Props) => {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(reorderContributionsAction, initialState);
  const [manualState, setManualState] = useState(initialState);
  const [isManualPending, startManualTransition] = useTransition();
  const [contributionOrder, setContributionOrder] = useState(allContributions.map((item) => item.id));
  const [draggedContributionId, setDraggedContributionId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [expandedContributionIds, setExpandedContributionIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<ContributionFilter>("all");
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [manualMessage, setManualMessage] = useState("");
  const [isAiHelpOpen, setIsAiHelpOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [savedContributionOrderKey, setSavedContributionOrderKey] = useState(
    allContributions.map((contribution) => contribution.id).join(":")
  );

  const getRecommendedMessageLimit = (contribution: Contribution) =>
    contribution.id === mainGreetingContributionId ? MAIN_GREETING_MESSAGE_LIMIT : messageLimit;
  const getRecommendedOverflow = (contribution: Contribution) => contribution.message.length - getRecommendedMessageLimit(contribution);

  const tooLongCount = allContributions.filter((contribution) => getRecommendedOverflow(contribution) > 0).length;
  const withinLimitCount = allContributions.length - tooLongCount;
  const hiddenCount = allContributions.filter((contribution) => contribution.status === "hidden").length;
  const activeCount = allContributions.filter((contribution) => contribution.status === "visible").length;
  const noRoleCount = allContributions.filter((contribution) => !contribution.authorRole?.trim()).length;
  const participantUrl = getJoinUrl(publicSlug);
  const inviteText = `Собираем открытку для ${recipientName}. Добавьте пару теплых слов по ссылке: ${participantUrl}`;
  const currentContributionOrderKey = contributionOrder.join(":");
  const [isContributionOrderDirty, setIsContributionOrderDirty] = useState(false);
  const [orderSaveStatus, setOrderSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const orderFormRef = useRef<HTMLFormElement>(null);

  // Auto-save contribution order with debounce
  useEffect(() => {
    if (!isContributionOrderDirty || orderSaveStatus === "saving") return;
    const timer = setTimeout(() => {
      if (orderFormRef.current) {
        setOrderSaveStatus("saving");
        orderFormRef.current.requestSubmit();
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [isContributionOrderDirty, orderSaveStatus, contributionOrder]);

  useEffect(() => {
    if (state.ok) {
      setOrderSaveStatus("saved");
      setIsContributionOrderDirty(false);
    }
  }, [state]);

  // Track dirty state separately from server state
  useEffect(() => {
    const dirty = savedContributionOrderKey !== currentContributionOrderKey;
    setIsContributionOrderDirty(dirty);
    if (dirty && orderSaveStatus === "saved") {
      setOrderSaveStatus("idle");
    }
  }, [savedContributionOrderKey, currentContributionOrderKey, orderSaveStatus]);

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
  }, [activeFilter, mainGreetingContributionId, messageLimit, orderedContributions]);

  useEffect(() => {
    if (state.ok) {
      setSavedContributionOrderKey(currentContributionOrderKey);
    }
  }, [currentContributionOrderKey, state.ok]);

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

  const copyToClipboard = async (value: string, successMessage: string) => {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const normalizedValue = value.startsWith("/") ? `${origin}${value}` : value;

    try {
      await navigator.clipboard.writeText(normalizedValue);
      setCopyMessage(successMessage);
      setIsMenuOpen(false);
    } catch {
      setCopyMessage("Не удалось скопировать автоматически.");
    }
  };

  const handleManualContributionSubmit = (formData: FormData) => {
    startManualTransition(async () => {
      const result = await addManualContributionAction(initialState, formData);
      setManualState(result);

      if (result.ok) {
        setManualMessage("");
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
              <h2 className={styles.contentPanelTitle}>Поздравления</h2>
              <div className={styles.contentToolbar}>
                <button
                  type="button"
                  className={`${styles.mediaLibraryUploadButton} ${styles.mediaManagerActionButton}`}
                  onClick={() => setIsManualFormOpen((current) => !current)}
                >
                  <span>+</span>
                  <span>Добавить вручную</span>
                </button>
                <div className={styles.contentMenuWrap}>
                  <button
                    type="button"
                    className={styles.contentIconButton}
                    onClick={() => setIsMenuOpen((current) => !current)}
                    aria-expanded={isMenuOpen}
                    aria-label="Дополнительные действия"
                  >
                    …
                  </button>
                  {isMenuOpen ? (
                    <div className={styles.contentMenu}>
                      <button type="button" onClick={() => copyToClipboard(participantUrl, "Ссылка для участников скопирована.")}>
                        Скопировать ссылку для участников
                      </button>
                      <button type="button" onClick={() => copyToClipboard(inviteText, "Текст приглашения скопирован.")}>
                        Скопировать текст приглашения
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <p className={styles.contentPanelText}>Модерируйте поздравления, выделяйте главное и изменяйте порядок.</p>
            </div>
            {copyMessage ? <p className={styles.contentInlineNotice}>{copyMessage}</p> : null}
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
                    recipientName={recipientName}
                    occasionText={occasionText}
                    messageLimit={500}
                    onUseText={setManualMessage}
                    variant="join"
                  />
                ) : null}
              </div>

              <div className={styles.manualContributionFooter}>
                <button type="submit" className={styles.contentPrimaryButton} disabled={isManualPending}>
                  {isManualPending ? "Добавляем..." : "Добавить поздравление"}
                </button>
                <span className={styles.manualContributionCount}>{manualMessage.length} / 1500</span>
                <span className={manualState.ok ? styles.limitOk : styles.limitWarning}>
                  {manualState.message || `Рекомендуем до ${messageLimit} символов для текущей сетки. Если текст длиннее, администратор сможет сократить его для лаконичного вида.`}
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
                            <span className={styles.contentGripPlain} aria-hidden="true">
                              ⋮⋮
                            </span>
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

            <div className={styles.contentPreviewPager}>
              <button type="button" className={styles.contentPagerButton} aria-label="Предыдущее поздравление">
                ‹
              </button>
              <div className={styles.contentPagerDots} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <button type="button" className={styles.contentPagerButton} aria-label="Следующее поздравление">
                ›
              </button>
            </div>

            <Link href={getGiftPath(finalSlug)} target="_blank" className={styles.previewLinkButton}>
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

      <div className={styles.contentOrderStatus}>
        <Link href={`${getManagePath(manageToken)}?tab=design`} className={styles.contentBackButton}>
          ← Вернуться к оформлению
        </Link>
        <span className={styles.contentOrderStatusText}>
          {orderSaveStatus === "saving"
            ? "Сохраняем порядок…"
            : orderSaveStatus === "saved"
              ? "Порядок сохранён"
              : isContributionOrderDirty
                ? "Порядок изменён"
                : null}
        </span>
      </div>
    </div>
  );
};
