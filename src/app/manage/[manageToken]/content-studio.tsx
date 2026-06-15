"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, type DragEvent as ReactDragEvent } from "react";
import type { CardMediaAsset, Contribution } from "@/lib/cards/types";
import type { FinalCardMessageMediaLayout } from "@/lib/final-card/types";
import { ContributionEditor } from "./contribution-editor";
import { MediaManager } from "./media-manager";
import { reorderContributionsAction, setContributionStatusAction } from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  allContributions: Contribution[];
  visibleCount: number;
  mediaAssets: CardMediaAsset[];
  mediaLayout: FinalCardMessageMediaLayout;
  messageLimit: number;
  previewMessage?: Contribution;
};

type DropTarget = {
  contributionId: string;
  position: "before" | "after";
};

const initialState = {
  ok: false,
  message: ""
};

export const ContentStudio = ({
  manageToken,
  allContributions,
  visibleCount,
  mediaAssets,
  mediaLayout,
  messageLimit,
  previewMessage
}: Props) => {
  const [state, formAction, isPending] = useActionState(reorderContributionsAction, initialState);
  const [contributionOrder, setContributionOrder] = useState(allContributions.map((item) => item.id));
  const [draggedContributionId, setDraggedContributionId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [expandedContributionId, setExpandedContributionId] = useState<string | null>(allContributions[0]?.id ?? null);

  const tooLongCount = allContributions.filter((contribution) => contribution.message.length > messageLimit).length;
  const withinLimitCount = allContributions.length - tooLongCount;
  const hiddenCount = allContributions.filter((contribution) => contribution.status === "hidden").length;
  const noRoleCount = allContributions.filter((contribution) => !contribution.authorRole?.trim()).length;

  const orderedContributions = useMemo(() => {
    const map = new Map(allContributions.map((contribution) => [contribution.id, contribution]));
    return contributionOrder
      .map((contributionId) => map.get(contributionId))
      .filter((contribution): contribution is Contribution => Boolean(contribution));
  }, [allContributions, contributionOrder]);

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

  const handleDragStart = (event: ReactDragEvent<HTMLButtonElement>, contributionId: string) => {
    setDraggedContributionId(contributionId);
    setDropTarget(null);
    event.dataTransfer.effectAllowed = "move";

    const card = event.currentTarget.closest("article");

    if (card instanceof HTMLElement) {
      const rect = card.getBoundingClientRect();
      event.dataTransfer.setDragImage(card, rect.width / 2, 36);
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

  return (
    <form action={formAction} className={styles.contentStudio}>
      <input type="hidden" name="manageToken" value={manageToken} />

      {contributionOrder.map((contributionId) => (
        <input key={contributionId} type="hidden" name="orderedContributionIds" value={contributionId} />
      ))}

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
                <button type="button" className={styles.contentGhostButton}>
                  <span>+</span>
                  <span>Добавить вручную</span>
                </button>
                <button type="button" className={styles.contentIconButton} aria-label="Дополнительные действия">
                  …
                </button>
              </div>
            </div>

            <div>
              <p className={styles.contentPanelText}>Проверьте тексты, порядок и видимость поздравлений.</p>
              <p className={styles.contentPanelText}>
                Тексты длиннее {messageLimit} символов лучше сократить для выбранного макета.
              </p>
            </div>
          </div>

          <div className={styles.contentFilterRow}>
            <span className={`${styles.contentFilterPill} ${styles.contentFilterPillActive}`}>Все {allContributions.length}</span>
            <span className={styles.contentFilterPill}>Видимые {visibleCount}</span>
            <span className={styles.contentFilterPill}>Слишком длинные {tooLongCount}</span>
            <span className={styles.contentFilterPill}>Скрытые {hiddenCount}</span>
            <span className={styles.contentFilterPill}>Без роли {noRoleCount}</span>
          </div>

          {orderedContributions.length === 0 ? (
            <p className={styles.empty}>Пока поздравлений нет. Сначала участники должны добавить свои сообщения.</p>
          ) : (
            <div className={styles.contentCards}>
              {orderedContributions.map((contribution, index) => {
                const overflow = contribution.message.length - messageLimit;
                const isTooLong = overflow > 0;
                const isHidden = contribution.status === "hidden";
                const isExpanded = expandedContributionId === contribution.id;

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
                          <div className={styles.contentIdentityInline}>
                            <strong>{contribution.authorName}</strong>
                            <span>· {contribution.authorRole?.trim() || "без роли"}</span>
                          </div>
                        </div>

                        <div className={styles.contentTopControls}>
                          {isExpanded ? (
                            <>
                              <span className={styles.contentBodyLabelCompact}>Показывать в открытке</span>
                              <form action={setContributionStatusAction}>
                                <input type="hidden" name="manageToken" value={manageToken} />
                                <input type="hidden" name="contributionId" value={contribution.id} />
                                <input type="hidden" name="status" value={isHidden ? "visible" : "hidden"} />
                                <button
                                  type="submit"
                                  className={`${styles.contentToggleView} ${!isHidden ? styles.contentToggleViewActive : ""}`}
                                  aria-label={isHidden ? "Показать поздравление" : "Скрыть поздравление"}
                                >
                                  <span className={styles.contentToggleKnob} />
                                </button>
                              </form>
                            </>
                          ) : null}

                          <button
                            type="button"
                            className={styles.contentChevronButton}
                            onClick={() =>
                              setExpandedContributionId((current) => (current === contribution.id ? null : contribution.id))
                            }
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? "Свернуть поздравление" : "Развернуть поздравление"}
                          >
                            <span className={`${styles.contentChevron} ${isExpanded ? styles.contentChevronExpanded : ""}`}>
                              ˅
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className={styles.contentCardSecondRow}>
                        <span className={isTooLong ? styles.limitWarning : styles.limitOk}>
                          {isTooLong ? `Нужно сократить на ${overflow} символов` : "Длина текста оптимальна"}
                        </span>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className={styles.contentContributionBody}>
                        <ContributionEditor
                          contributionId={contribution.id}
                          manageToken={manageToken}
                          initialMessage={contribution.message}
                          messageLimit={messageLimit}
                        />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          <section className={styles.contentAssistantCard}>
            <div>
              <h3 className={styles.contentAssistantTitle}>AI-общее поздравление</h3>
              <p className={styles.contentAssistantText}>
                Сгенерировать единое поздравление от команды на основании уже добавленных поздравлений. Этот текст
                появится в отдельном блоке, который нужно включить во вкладке «Оформление открытки».
              </p>
            </div>
            <button type="button" className={styles.contentOutlineButton}>
              AI Сгенерировать общее поздравление
            </button>
          </section>
        </section>

        <aside className={styles.contentRail}>
          <section className={styles.contentPreviewCard}>
            <div className={styles.contentPreviewHeader}>
              <h2 className={styles.contentRailTitle}>Предпросмотр поздравлений</h2>
              <p className={styles.previewStatusLine}>
                <span className={styles.previewStatusDot} />
                <span>Обновляется автоматически</span>
              </p>
            </div>

            <article className={styles.contentPreviewMessageCard}>
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
          </section>

          <MediaManager manageToken={manageToken} mediaAssets={mediaAssets} mediaLayout={mediaLayout} />

          <section className={styles.contentTipsCard}>
            <h2 className={styles.contentRailTitle}>Подсказки</h2>
            <ul className={styles.contentTipsList}>
              <li>Тексты до {messageLimit} символов читаются лучше и выглядят аккуратнее.</li>
              <li>Перетаскивайте карточки за левый значок, чтобы менять их порядок в открытке.</li>
              <li>Не забудьте добавить фото — они делают открытку живой и теплой.</li>
            </ul>
          </section>
        </aside>
      </div>

      <div className={styles.contentFooterBar}>
        <Link href={`/manage/${manageToken}?tab=design`} className={styles.contentBackButton}>
          ← Вернуться к оформлению
        </Link>
        <span className={styles.contentAutosave}>{state.message || "Изменения порядка сохраняются отдельно"}</span>
        <button type="submit" className={styles.contentPrimaryButton} disabled={isPending}>
          {isPending ? "Сохраняем..." : "Сохранить изменения"}
        </button>
      </div>
    </form>
  );
};
