"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Contribution } from "@/lib/cards/types";
import type { CardLifecycle } from "@/lib/cards/lifecycle";
import { CONTRIBUTION_MESSAGE_RECOMMENDED_LENGTH } from "@/lib/contributions/limits";
import { ShareLinkButton } from "./copy-link-button";
import { ContributionEditor } from "./contribution-editor";
import { ContributionOrderEditor } from "./contribution-order-editor";
import styles from "./manage-page.module.css";
import { useModalFocus } from "./use-modal-focus";
import { selectCongratulations, type GreetingFilter, type GreetingSort } from "./congratulations-model";

type EditorState = { contribution?: Contribution; mode: "manual" | "ai" } | null;

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "♙";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
};

type FilterSheetProps = {
  counts: Record<GreetingFilter, number>;
  filter: GreetingFilter;
  sort: GreetingSort;
  onFilterChange: (filter: GreetingFilter) => void;
  onSortChange: (sort: GreetingSort) => void;
  onReset: () => void;
  onApply: () => void;
  onClose: () => void;
};

const GreetingFilterSheet = ({ counts, filter, sort, onFilterChange, onSortChange, onReset, onApply, onClose }: FilterSheetProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(dialogRef, onClose);
  const labels: Array<[GreetingFilter, string]> = [
    ["all", "Все"], ["active", "Активные"], ["hidden", "Скрытые"],
    ["too-long", "Нужно сократить"]
  ];
  const sorts: Array<[GreetingSort, string]> = [
    ["card", "В порядке открытки"], ["new", "Сначала новые"], ["old", "Сначала старые"]
  ];

  return createPortal(
    <div className={styles.greetingFilterSheetBackdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} className={styles.greetingFilterSheet} role="dialog" aria-modal="true" aria-labelledby="greeting-filter-title" tabIndex={-1}>
        <header>
          <h2 id="greeting-filter-title">Фильтры</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть фильтры">×</button>
        </header>
        <fieldset>
          <legend>Показывать</legend>
          {labels.map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="greeting-filter" checked={filter === value} onChange={() => onFilterChange(value)} />
              <span>{label}</span><span>{counts[value]}</span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Сортировка</legend>
          {sorts.map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="greeting-sort" checked={sort === value} onChange={() => onSortChange(value)} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <footer>
          <button type="button" onClick={onReset}>Сбросить</button>
          <button type="button" onClick={onApply}>Применить</button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

type CardProps = {
  contribution: Contribution;
  index: number;
  isExpanded: boolean;
  isMain: boolean;
  isHighlighted: boolean;
  onToggle: (contributionId: string) => void;
  onEdit: (contribution: Contribution) => void;
};

const GreetingCard = memo(function GreetingCard({
  contribution,
  index,
  isExpanded,
  isMain,
  isHighlighted,
  onToggle,
  onEdit
}: CardProps) {
  const isHidden = contribution.status === "hidden";
  const isTooLong = contribution.message.length > CONTRIBUTION_MESSAGE_RECOMMENDED_LENGTH;

  return (
    <article
      id={`contribution-${contribution.id}`}
      className={`${styles.greetingCard} ${isExpanded ? styles.greetingCardExpanded : ""} ${isHighlighted ? styles.greetingCardHighlighted : ""}`}
    >
      <button
        type="button"
        className={styles.greetingCardSummary}
        onClick={() => onToggle(contribution.id)}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Свернуть" : "Развернуть"} поздравление ${contribution.authorName}`}
      >
        <span className={styles.greetingCardIndex}>#{index + 1}</span>
        <span className={styles.greetingCardAvatar}>
          {getInitials(contribution.authorName)}
        </span>
        <span className={styles.greetingCardMainCopy}>
          <span className={styles.greetingCardIdentity}>
            <strong>{contribution.authorName}</strong>
            {contribution.authorRole?.trim() ? <span>· {contribution.authorRole}</span> : null}
          </span>
          <span className={styles.greetingCardBadges}>
            {isMain ? <span className={styles.greetingBadgeMain}>Главное</span> : null}
            {isHidden ? <span className={styles.greetingBadgeHidden}>Скрыто</span> : null}
            {isTooLong ? <span className={styles.greetingBadgeWarning}>Нужно сократить</span> : null}
          </span>
          {!isExpanded ? <span className={styles.greetingCardExcerpt}>{contribution.message}</span> : null}
        </span>
        <span className={`${styles.greetingCardChevron} ${isExpanded ? styles.greetingCardChevronOpen : ""}`} aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <path d="m5.5 7.5 4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        </span>
      </button>

      <div className={`${styles.greetingCardDetailsReveal} ${isExpanded ? styles.greetingCardDetailsRevealOpen : ""}`} aria-hidden={!isExpanded}>
        <div className={styles.greetingCardDetails}>
          <p>{contribution.message}</p>
          <div className={styles.greetingCardActions}>
            <button type="button" tabIndex={isExpanded ? 0 : -1} onClick={() => onEdit(contribution)}>Редактировать</button>
          </div>
        </div>
      </div>
    </article>
  );
});

type Props = {
  allContributions: Contribution[];
  cardId: string;
  manageToken: string;
  occasionText: string;
  mainGreetingContributionId: string | null;
  participantLink: string;
  lifecycle: Pick<CardLifecycle, "collectionStatus">;
  greetingMode?: "classic" | "matrix" | "ladder";
};

export const CongratulationsPanel = ({
  allContributions,
  cardId,
  manageToken,
  occasionText,
  mainGreetingContributionId,
  participantLink,
  lifecycle,
  greetingMode = "classic"
}: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<GreetingFilter>("all");
  const [sort, setSort] = useState<GreetingSort>("card");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [pendingFilter, setPendingFilter] = useState<GreetingFilter>(activeFilter);
  const [pendingSort, setPendingSort] = useState<GreetingSort>(sort);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const highlightTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);

  const mainGreeting = allContributions.find(
    (item) => item.id === mainGreetingContributionId && item.status === "visible"
  ) ?? null;
  const ordinaryContributions = useMemo(
    () => allContributions.filter((item) => item.id !== mainGreeting?.id),
    [allContributions, mainGreeting?.id]
  );
  const counts = useMemo(() => ({
    all: ordinaryContributions.length,
    active: ordinaryContributions.filter((item) => item.status === "visible").length,
    hidden: ordinaryContributions.filter((item) => item.status === "hidden").length,
    "too-long": ordinaryContributions.filter((item) => item.message.length > CONTRIBUTION_MESSAGE_RECOMMENDED_LENGTH).length,
  }), [ordinaryContributions]);

  const visibleContributions = useMemo(() => {
    return selectCongratulations({ contributions: ordinaryContributions, searchQuery, filter: activeFilter, sort });
  }, [activeFilter, ordinaryContributions, searchQuery, sort]);
  const contributionIndexes = useMemo(
    () => new Map(ordinaryContributions.map((item, index) => [item.id, index])),
    [ordinaryContributions]
  );

  const filterLabels: Array<[GreetingFilter, string]> = [
    ["all", "Остальные"],
    ["active", "Активные"],
    ["hidden", "Скрытые"],
    ["too-long", "Нужно сократить"]
  ];

  const openEditor = useCallback((contribution?: Contribution, mode: "manual" | "ai" = "manual") => {
    setExpandedId(null);
    setEditor({ contribution, mode });
  }, []);
  const toggleContribution = useCallback((contributionId: string) => {
    setExpandedId((current) => current === contributionId ? null : contributionId);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  }, []);

  const finishEditor = (contributionId: string, feedback?: string) => {
    const wasEditing = Boolean(editor?.contribution);
    setEditor(null);
    setHighlightedId(contributionId);
    showToast(feedback ?? (wasEditing ? "Изменения сохранены" : "Поздравление добавлено"));
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightedId(null), 1800);
  };

  useEffect(() => {
    if (!highlightedId || !allContributions.some((item) => item.id === highlightedId)) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`contribution-${highlightedId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [allContributions, highlightedId]);

  useEffect(() => () => {
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  return (
    <section className={styles.congratulationsPanel} id="content-panel-congratulations">
      <header className={styles.congratulationsHeader}>
        <div className={styles.congratulationsTitleRow}>
          <div>
            <h2>Все поздравления</h2>
            <p>Найдите нужные слова, выберите главное и управляйте тем, что увидит получатель.</p>
          </div>
          <button type="button" className={styles.congratulationsAddButton} onClick={() => openEditor()}>
            <span aria-hidden="true">＋</span> Добавить поздравление
          </button>
        </div>

        <section className={`${styles.mainGreetingCardNew} ${mainGreeting ? "" : styles.mainGreetingCardNewEmpty}`}>
          <div className={styles.mainGreetingCardNewHeading}>
            <span aria-hidden="true">☆</span>
            <div>
              <h3>Главное поздравление</h3>
              <p>Главное поздравление показывается отдельно и не входит в порядок общего списка.</p>
            </div>
          </div>
          {mainGreeting ? (
            <div className={styles.mainGreetingCardNewContent}>
              <span className={styles.greetingCardAvatar}>
                {getInitials(mainGreeting.authorName)}
              </span>
              <div>
                <strong>{mainGreeting.authorName}</strong>
                {mainGreeting.authorRole ? <span>{mainGreeting.authorRole}</span> : null}
                <p>{mainGreeting.message}</p>
              </div>
              <button type="button" onClick={() => openEditor(mainGreeting)}>Редактировать</button>
            </div>
          ) : (
            <div className={styles.mainGreetingCardNewMissing}>
              <div>
                <strong>Главное поздравление не выбрано</strong>
                <p>Выберите одно активное поздравление — оно станет акцентом открытки.</p>
              </div>
              {counts.active > 0 ? (
                <button type="button" onClick={() => openEditor(ordinaryContributions.find((item) => item.status === "visible"))}>
                  Выбрать главное
                </button>
              ) : null}
            </div>
          )}
        </section>
      </header>

      {ordinaryContributions.length > 0 ? (
        <div className={styles.greetingListToolbar}>
          <label className={styles.greetingSearch}>
            <span className={styles.visuallyHidden}>Поиск поздравлений</span>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Поиск по имени, роли или тексту"
            />
            {searchQuery ? (
              <button type="button" className={styles.greetingSearchClear} onClick={() => setSearchQuery("")} aria-label="Очистить поиск">×</button>
            ) : null}
          </label>
          <div className={styles.greetingDesktopFilters} aria-label="Фильтры поздравлений">
            {filterLabels.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={activeFilter === value ? styles.greetingFilterActive : ""}
                onClick={() => setActiveFilter(value)}
              >
                {label} <span>{counts[value]}</span>
              </button>
            ))}
          </div>
          <div className={styles.greetingMobileFilters}>
            {filterLabels.slice(0, 2).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={activeFilter === value ? styles.greetingFilterActive : ""}
                onClick={() => setActiveFilter(value)}
              >
                {label} <span>{counts[value]}</span>
              </button>
            ))}
            <button
              type="button"
              className={!(["all", "active"] as GreetingFilter[]).includes(activeFilter) || sort !== "card" ? styles.greetingFilterActive : ""}
              onClick={() => {
                setPendingFilter(activeFilter);
                setPendingSort(sort);
                setIsFilterSheetOpen(true);
              }}
            >
              Фильтры{!(["all", "active"] as GreetingFilter[]).includes(activeFilter) || sort !== "card" ? " · 1" : ""}
            </button>
          </div>
          <button type="button" className={styles.greetingOrderButton} onClick={() => setIsOrderOpen(true)}>
            Изменить порядок
          </button>
        </div>
      ) : null}

      {visibleContributions.length ? (
        <div className={styles.greetingCards}>
          {visibleContributions.map((contribution) => (
            <GreetingCard
              key={contribution.id}
              contribution={contribution}
              index={contributionIndexes.get(contribution.id) ?? 0}
              isExpanded={expandedId === contribution.id}
              isMain={mainGreeting?.id === contribution.id}
              isHighlighted={highlightedId === contribution.id}
              onToggle={toggleContribution}
              onEdit={openEditor}
            />
          ))}
        </div>
      ) : ordinaryContributions.length === 0 ? (
        <div className={styles.greetingEmptyState}>
          <span aria-hidden="true">✉</span>
          <h3>{mainGreeting ? "Других поздравлений пока нет" : "Пока нет поздравлений"}</h3>
          <p>{mainGreeting ? "Добавьте ещё одно поздравление или пригласите участников." : "Пригласите участников или добавьте первое поздравление самостоятельно."}</p>
          <div>
            {lifecycle.collectionStatus === "OPEN" ? (
              <ShareLinkButton value={participantLink} label="Поделиться ссылкой" className={styles.greetingEmptyPrimary} />
            ) : null}
            <button type="button" onClick={() => openEditor()}>Добавить поздравление</button>
          </div>
        </div>
      ) : (
        <div className={styles.greetingEmptyState}>
          <h3>Ничего не найдено</h3>
          <p>Измените запрос или сбросьте фильтры.</p>
          <button type="button" onClick={() => { setSearchQuery(""); setActiveFilter("all"); setSort("card"); }}>
            Сбросить фильтры
          </button>
        </div>
      )}

      {editor ? (
        <ContributionEditor
          key={`${editor.contribution?.id ?? "new"}-${editor.mode}`}
          cardId={cardId}
          manageToken={manageToken}
          occasionText={occasionText}
          contribution={editor.contribution}
          isMainGreeting={editor.contribution?.id === mainGreeting?.id}
          greetingMode={greetingMode}
          initialMode={editor.mode}
          onClose={() => setEditor(null)}
          onSaved={finishEditor}
          onDeleted={() => { setEditor(null); showToast("Поздравление удалено"); }}
        />
      ) : null}

      {isOrderOpen ? (
        <ContributionOrderEditor
          contributions={allContributions}
          mainGreetingContributionId={mainGreeting?.id ?? null}
          manageToken={manageToken}
          onClose={() => setIsOrderOpen(false)}
          onSaved={() => { setIsOrderOpen(false); showToast("Порядок сохранён"); }}
        />
      ) : null}

      {isFilterSheetOpen ? (
        <GreetingFilterSheet
          counts={counts}
          filter={pendingFilter}
          sort={pendingSort}
          onFilterChange={setPendingFilter}
          onSortChange={setPendingSort}
          onReset={() => { setPendingFilter("all"); setPendingSort("card"); }}
          onApply={() => { setActiveFilter(pendingFilter); setSort(pendingSort); setIsFilterSheetOpen(false); }}
          onClose={() => setIsFilterSheetOpen(false)}
        />
      ) : null}
      {toast ? <div className={styles.greetingToast} role="status">{toast}</div> : null}
    </section>
  );
};
