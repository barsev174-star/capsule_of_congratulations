import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import {
  getCardDraftByManageToken,
  listAllContributionsByCardId,
  listCardMediaAssetsByCardId,
  listContributionsByCardId
} from "@/lib/cards/repository";
import { getCardTemplates } from "@/lib/cards/templates-server";
import { isProductTemplateId } from "@/lib/cards/templates";
import { finalCardLayouts } from "@/lib/final-card/layouts";
import { getGiftPath, getJoinUrl, getManagePath, getPreviewPath } from "@/lib/routes/card-links";
import type { FinalCardBlockId, FinalCardOptionalBlockId } from "@/lib/final-card/types";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";
import { BasicsSettingsForm } from "./basics-settings-form";
import { BlockSettingsForm } from "./block-settings-form";
import { ContentStudio } from "./content-studio";
import { CopyLinkButton } from "./copy-link-button";
import { LinkPurposeList } from "./link-purpose-list";
import { TemplateSummary } from "./template-summary";
import styles from "./manage-page.module.css";
import { getAiCardInsight, getAiCardQuoteSelection, getAiUsageSummary } from "@/lib/ai/repository";
import { dispatchTemplateRenderer, getTemplateFinalCardStyleId } from "@/lib/templates/dispatcher";
import {
  BEST_QUOTE_COUNT,
  BEST_QUOTE_MIN_CONTRIBUTION_COUNT,
  buildContributionFingerprint,
  hasEnoughMeaningfulQuoteSources,
  isValidBestQuoteText,
  QUALITY_MIN_CONTRIBUTION_COUNT
} from "@/lib/ai/card-insights";
import { getCardLifecycleByManageToken } from "@/lib/cards/lifecycle-repository";
import { getCardLifecycleLabel, isGiftAccessible } from "@/lib/cards/lifecycle";
import { getActiveMessageSlots, getAssetsForSlots, MEMORY_MEDIA_SLOTS } from "@/lib/cards/media-slots";
import { openCollectionAction } from "./actions";
import { getGiftPollForManage, getGiftPollVoteCountForManage } from "@/lib/gift-polls/repository";
import { GiftPollSettingsForm } from "./gift-poll-settings-form";
import { PaymentCheckoutButton } from "./payment-checkout-button";
import { buildCardBlockReadiness, buildOrganizerJourney } from "@/lib/manage/card-design-readiness";
import { resolveMainGreetingContribution } from "@/lib/final-card/main-greeting";
import { resolveFinalBestQuotes } from "@/lib/final-card/quote-selection";
import { ManageMobileMenu } from "./manage-mobile-menu";
import { DesignStickyActions } from "./design-sticky-actions";
import { DesignRail } from "./design-rail";
import {
  isContentFocus,
  getEditorTabCount,
  resolveEditorTab,
  type EditorTab
} from "./content-focus";
import { EditorSidebarCard } from "./editor-sidebar-card";
import { ParticipantLinkCard } from "./participant-link-card";
import { PreparationProgress } from "./preparation-progress";

// Readiness combines several database-backed aggregates. Always render a fresh
// server snapshot so refreshes, browser tabs and devices cannot reuse a stale page.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    manageToken: string;
  }>;
  searchParams: Promise<{
    tab?: string;
    focus?: string;
    section?: string;
  }>;
};

const tabItems = [
  { id: "design", label: "Оформление", mobileLabel: "Открытка" },
  { id: "congratulations", label: "Поздравления", mobileLabel: "Поздравления" },
  { id: "photos", label: "Фотографии", mobileLabel: "Фото" },
  { id: "gift", label: "Выбор подарка", mobileLabel: "Подарок" }
] as const satisfies ReadonlyArray<{
  id: EditorTab;
  label: string;
  mobileLabel: string;
}>;

const EditorTabIcon = ({ tab }: { tab: EditorTab }) => {
  if (tab === "design") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
        <path d="M7 8.5h10M7 12h6M7 15.5h8" />
      </svg>
    );
  }

  if (tab === "congratulations") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5.5h16v11H9l-4.5 3v-3H4z" />
        <path d="M8 10.2c1.1-1.4 2.7-.7 3.2.3.5-1 2.1-1.7 3.2-.3 1.3 1.7-1.2 3.3-3.2 4.5-2-1.2-4.5-2.8-3.2-4.5Z" />
      </svg>
    );
  }

  if (tab === "photos") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
        <circle cx="9" cy="9.5" r="1.5" />
        <path d="m5.5 17 4.3-4.2 2.8 2.4 2.5-2.6 3.4 4.4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 10.5h17v10h-17zM2.5 6.5h19v4h-19zM12 6.5v14" />
      <path d="M7.2 6.5C4.4 6.5 4 3.2 6 2.7c1.8-.5 4 1.5 6 3.8-2 .1-3.6 0-4.8 0ZM16.8 6.5c2.8 0 3.2-3.3 1.2-3.8-1.8-.5-4 1.5-6 3.8 2 .1 3.6 0 4.8 0Z" />
    </svg>
  );
};

const managedBlockIds: FinalCardBlockId[] = ["hero", "summary", "qualities", "messages", "memories", "quotes", "closing"];

export default async function ManagePage({ params, searchParams }: Props) {
  const { manageToken } = await params;
  const { tab, focus, section } = await searchParams;
  const contentFocus = isContentFocus(focus) ? focus : null;
  const activeTab = resolveEditorTab({ tab, section, focus: contentFocus });
  const [card, lifecycle] = await Promise.all([getCardDraftByManageToken(manageToken), getCardLifecycleByManageToken(manageToken)]);

  if (!card || !lifecycle) {
    notFound();
  }

  const isDesignTab = activeTab === "design";
  const isMaterialTab = activeTab === "congratulations" || activeTab === "photos";
  const isGiftTab = activeTab === "gift";
  const [allContributions, cardTemplates, visibleContributions, mediaAssets, aiUsage, quotesInsight, qualitiesInsight, savedQuoteSelection, giftPoll, giftPollVoteCount] = await Promise.all([
    listAllContributionsByCardId(card.id),
    isDesignTab ? getCardTemplates() : Promise.resolve([]),
    listContributionsByCardId(card.id),
    listCardMediaAssetsByCardId(card.id),
    getAiUsageSummary(card.id),
    getAiCardInsight(card.id, "quotes"),
    getAiCardInsight(card.id, "qualities"),
    getAiCardQuoteSelection(card.id),
    isGiftTab ? getGiftPollForManage(card.id) : Promise.resolve(null),
    isGiftTab ? Promise.resolve<number | null>(null) : getGiftPollVoteCountForManage(card.id)
  ]);
  const hasValidGeneratedQuotes = Boolean(
    quotesInsight &&
    quotesInsight.items.length >= BEST_QUOTE_COUNT &&
    quotesInsight.items.every((item) => isValidBestQuoteText(item.text))
  );
  const generatedQuoteCandidates = hasValidGeneratedQuotes ? quotesInsight!.items.map((item) => item.text) : [];
  const generatedQualities = qualitiesInsight?.items.map((item) => item.text) ?? [];
  const contributionFingerprint = buildContributionFingerprint(visibleContributions);
  const eligibleGiftPollVoterCount = new Set(
    visibleContributions
      .filter((contribution) => contribution.source === "participant")
      .map((contribution) => contribution.participantTokenHash)
      .filter((token): token is string => Boolean(token))
  ).size;
  const quotesAreStale = Boolean(
    quotesInsight &&
    (!hasValidGeneratedQuotes || quotesInsight.sourceFingerprint !== contributionFingerprint)
  );
  const savedQuoteTexts = savedQuoteSelection && quotesInsight && savedQuoteSelection.sourceFingerprint === quotesInsight.sourceFingerprint
    ? savedQuoteSelection.items.map((item) => item.text)
    : [];
  const quoteSelection = resolveFinalBestQuotes(card, generatedQuoteCandidates, savedQuoteTexts);
  const generatedQuotes = quoteSelection.quotes;
  const effectiveQuotesAreStale = quotesAreStale && !quoteSelection.usesLegacyDefault;
  const qualitiesAreStale = Boolean(qualitiesInsight && qualitiesInsight.sourceFingerprint !== contributionFingerprint);
  const aiContent = { quotes: generatedQuotes, qualities: generatedQualities };
  const model = isMaterialTab ? buildFinalCardViewModel(card, visibleContributions, mediaAssets, aiContent) : null;
  const selectedTemplateDispatch = isProductTemplateId(card.templateId)
    ? dispatchTemplateRenderer(card.templateId)
    : null;
  const style = selectedTemplateDispatch
    ? getTemplateFinalCardStyleId(selectedTemplateDispatch)
    : "warm-classic";
  const selectedTemplate = cardTemplates.find((template) => template.id === card.templateId) ?? null;
  const layoutMode = card.finalMessageSettings?.layoutMode ?? "grid-2";
  const mediaLayout = card.finalMessageSettings?.mediaLayout ?? "portrait";
  const messagePhotosEnabled = layoutMode === "column-media";
  const momentsEnabled = card.finalBlockSettings?.memories ?? true;
  const memoryPhotoCount = card.finalMemorySettings?.photoCount ?? 3;
  const messageAssignedMedia = messagePhotosEnabled
    ? getAssetsForSlots(mediaAssets, getActiveMessageSlots(mediaLayout))
    : [];
  const memoryAssignedMedia = momentsEnabled
    ? getAssetsForSlots(mediaAssets, MEMORY_MEDIA_SLOTS)
    : [];
  const messageRequiredPhotoCount = layoutMode === "column-media"
    ? (mediaLayout === "portrait" ? 1 : mediaLayout === "landscape-pair" ? 2 : 3)
    : 0;
  const messageAssignedPhotoCount = Math.min(
    messageAssignedMedia.length,
    messageRequiredPhotoCount
  );
  const memoryAssignedPhotoCount = Math.min(
    memoryAssignedMedia.length,
    memoryPhotoCount
  );
  const activePhotoCount = messageAssignedPhotoCount + (momentsEnabled ? memoryAssignedPhotoCount : 0);
  const giftVoteCount = giftPoll?.totalVotes ?? giftPollVoteCount ?? 0;
  const savedMemoryTitle = card.finalMemorySettings?.title?.trim();
  const savedMemoryDescription = card.finalMemorySettings?.description?.trim();
  const memoryTitle = !savedMemoryTitle || savedMemoryTitle === "Наши воспоминания" ? "Моменты" : savedMemoryTitle;
  const memoryDescription =
    !savedMemoryDescription || savedMemoryDescription === "Столько ярких моментов, с которыми мы идём рядом с тобой."
      ? "Фото, которые хочется сохранить"
      : savedMemoryDescription;
  const requiredLayoutBlockIds = finalCardLayouts[style].blocks
    .filter((block) => block.required)
    .map((block) => block.id);
  const optionalLayoutBlocks = finalCardLayouts[style].blocks.filter(
    (block) => !block.required && managedBlockIds.includes(block.id)
  );
  const mainGreetingContribution = resolveMainGreetingContribution(card, visibleContributions);
  const mainGreetingContributionId = mainGreetingContribution?.id ?? null;
  const mainGreetingStatusText = mainGreetingContribution
    ? `Выбрано поздравление от ${mainGreetingContribution.authorName}. В открытке оно будет показано как «Самые важные слова».`
    : "Главное поздравление пока не выбрано. Откройте вкладку «Поздравления» и отметьте одно активное поздравление.";

  const blockMeta: Record<FinalCardOptionalBlockId, { label: string; description: string }> = {
    summary: {
      label: "Главное поздравление",
      description: "Одно поздравление, которое будет выделено в открытке."
    },
    qualities: {
      label: "Качества",
      description: "Пять качеств, которые чаще всего отмечают участники."
    },
    memories: {
      label: "Моменты",
      description: `Отдельная подборка из ${memoryPhotoCount} фотографий с короткими подписями.`
    },
    quotes: {
      label: "Лучшие фразы",
      description: "Три короткие фразы, выбранные из поздравлений."
    }
  };

  const blockOptions = optionalLayoutBlocks.map((block) => ({
    id: block.id as FinalCardOptionalBlockId,
    label: blockMeta[block.id as FinalCardOptionalBlockId].label,
    description: blockMeta[block.id as FinalCardOptionalBlockId].description,
    checked: card.finalBlockSettings?.[block.id as FinalCardOptionalBlockId] ?? true,
    disabled: false
  }));
  const savedBlockOrder = card.finalBlockOrder?.filter((blockId) => managedBlockIds.includes(blockId)) ?? [];
  const initialBlockOrder = [...savedBlockOrder, ...managedBlockIds.filter((blockId) => !savedBlockOrder.includes(blockId))];

  const recipientName = card.recipientName.trim() || "нового получателя";
  const fromLabel = card.fromLabel.trim() || "группы";
  const occasionText = card.occasionText.trim() || "повод не указан";
  const participantLink = getJoinUrl(card.publicSlug);
  const lifecycleLabel = getCardLifecycleLabel(lifecycle);
  const giftAccessible = isGiftAccessible(lifecycle);
  const collectionReady = Boolean(card.recipientName.trim() && card.occasionText.trim() && card.fromLabel.trim() && card.templateId);
  const aiLimitTotal = aiUsage.limit;
  const aiLimitRemaining = aiUsage.remaining;
  const blockReadiness = buildCardBlockReadiness({
    card,
    requiredBlockIds: requiredLayoutBlockIds,
    visibleContributions,
    mediaAssets,
    qualities: generatedQualities,
    qualitiesAreStale,
    bestQuotes: generatedQuotes,
    bestQuotesAreStale: effectiveQuotesAreStale
  });
  const organizerJourney = buildOrganizerJourney({
    card,
    lifecycle,
    blockReadiness,
    visibleContributionCount: visibleContributions.length
  });
  const deliveryWarnings = blockReadiness
    .filter((block) => block.enabled && block.warning)
    .map((block) => block.warning!);
  const resolveDesignActionHref = (action: { kind: "anchor" | "tab"; target: string }) => {
    if (action.kind === "tab") {
      const target = action.target === "content" ? "congratulations" : action.target;
      return `${getManagePath(manageToken)}?tab=${target}`;
    }
    if (action.target === "preview") return getPreviewPath(manageToken);
    return `#${action.target}`;
  };
  const primaryPreviewHref = giftAccessible
    ? getGiftPath(card.finalSlug)
    : getPreviewPath(manageToken);
  const stickyPrimaryAction =
    lifecycle.collectionStatus === "DRAFT" &&
    organizerJourney.nextAction.target === "lifecycle-section"
      ? {
          kind: "open-collection" as const,
          label: organizerJourney.nextAction.label,
          disabled: !collectionReady
        }
      : lifecycle.collectionStatus === "CLOSED" &&
          (lifecycle.paymentStatus === "PAID" || lifecycle.hasAdminAccess) &&
          organizerJourney.nextAction.target === "lifecycle-section"
        ? {
            kind: "deliver" as const,
            label: organizerJourney.nextAction.label
          }
        : lifecycle.collectionStatus === "OPEN" &&
            visibleContributions.length === 0 &&
            organizerJourney.nextAction.target === "lifecycle-section"
          ? {
              kind: "share" as const,
              label: organizerJourney.nextAction.label,
              value: participantLink
            }
        : {
            kind: "link" as const,
            label: organizerJourney.nextAction.label,
            href:
              organizerJourney.nextAction.target === "preview"
                ? primaryPreviewHref
                : resolveDesignActionHref(organizerJourney.nextAction),
            external: organizerJourney.nextAction.target === "preview"
          };
  const journeyActionLinks =
    lifecycle.collectionStatus === "OPEN" && organizerJourney.currentStepId === "materials"
      ? organizerJourney.remainingActions
          .filter((action) => action.kind === "tab" && action.target === "content")
          .filter(
            (action, index, list) =>
              list.findIndex((candidate) => candidate.label === action.label) === index
          )
          .slice(0, 2)
          .map((action) => ({
            label: action.label,
            href: resolveDesignActionHref(action)
          }))
      : [];
  const mobileLifecycleLabel =
    lifecycle.deliveryStatus === "DELIVERED"
      ? "Передана"
      : lifecycle.collectionStatus === "OPEN"
      ? "Сбор открыт"
      : lifecycle.collectionStatus === "CLOSED"
        ? "Сбор закрыт"
        : "Черновик";
  const firstIncompleteBlock = blockReadiness.find(
    (block) =>
      block.enabled &&
      (block.status === "ACTION_REQUIRED" || block.status === "WAITING_FOR_CONTENT")
  );
  const contentStickyAction = firstIncompleteBlock
    ? {
        label: "Продолжить настройку",
        href: `${getManagePath(manageToken)}?tab=design#block-${firstIncompleteBlock.blockId}`
      }
    : {
        label: organizerJourney.nextAction.label,
        href:
          organizerJourney.nextAction.target === "preview"
            ? primaryPreviewHref
            : resolveDesignActionHref(organizerJourney.nextAction)
      };
  const giftStickyAction = {
    kind: "link" as const,
    label: "Продолжить настройку",
    href: firstIncompleteBlock
      ? `${getManagePath(manageToken)}?tab=design#block-${firstIncompleteBlock.blockId}`
      : `${getManagePath(manageToken)}?tab=design`
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.managerHeader}>
          <div className={styles.managerBrand}>
            <Link href="/" className={styles.brandName}>
              <BrandLogo />
            </Link>
          </div>
          <ManageMobileMenu
            previewHref={giftAccessible ? getGiftPath(card.finalSlug) : getPreviewPath(card.manageToken)}
          />

          <div className={styles.managerTitleGroup}>
            <span className={styles.managerKicker}>Редактор открытки</span>
            <h1 className={styles.managerTitle}>{recipientName}</h1>
            <div className={styles.managerChips} aria-label="Сводка открытки">
              <span className={styles.managerLifecycleDesktop}>{lifecycleLabel}</span>
              <span className={styles.managerLifecycleMobile}>{mobileLifecycleLabel}</span>
              <span className={styles.managerFromChip}>{fromLabel}</span>
              <span className={styles.managerCountChip}>{allContributions.length} поздравлений</span>
              <span className={styles.managerCountChip}>{activePhotoCount} фото</span>
              <span className={styles.aiChip}>AI: осталось {aiLimitRemaining} из {aiLimitTotal}</span>
            </div>
          </div>

          <div className={styles.managerActions}>
            <Link
              href={giftAccessible ? getGiftPath(card.finalSlug) : getPreviewPath(card.manageToken)}
              target="_blank"
              className={styles.previewPrimaryLink}
            >
              Посмотреть открытку
            </Link>
            <Link href="/support?from=manage" className={styles.managerSupportLink}>
              Поддержка
            </Link>
            <Link href="/account" className={styles.managerSupportLink}>
              Мои открытки
            </Link>
            <div className={styles.publishNote}>
              <span>Приватная ссылка получателя откроется после передачи открытки.</span>
            </div>
          </div>
        </header>

        <nav className={styles.tabBar} aria-label="Разделы управления открыткой">
          {tabItems.map((item) => {
            const count = getEditorTabCount(item.id, {
              congratulations: allContributions.length,
              photos: activePhotoCount,
              giftVotes: giftVoteCount
            });
            const ariaLabel = count === null ? item.label : `${item.label}, ${count}`;

            return (
              <Link
                key={item.id}
                href={`${getManagePath(manageToken)}?tab=${item.id}`}
                prefetch={false}
                className={`${styles.tabLink} ${activeTab === item.id ? styles.tabLinkActive : ""}`}
                aria-current={activeTab === item.id ? "page" : undefined}
                aria-label={ariaLabel}
              >
                <span className={styles.tabLabelDesktop}>{item.label}</span>
                <span className={styles.tabLabelMobile} aria-hidden="true">
                  <span className={styles.tabMobileIconWrap}>
                    <EditorTabIcon tab={item.id} />
                    {count === null ? null : (
                      <span className={styles.tabMobileBadge}>{count}</span>
                    )}
                  </span>
                  <span className={styles.tabMobileText}>{item.mobileLabel}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        {activeTab === "design" ? (
          <>
          <div className={`${styles.editorWorkspace} ${styles.designStudio}`}>
            <div className={`${styles.editorMain} ${styles.designMain}`}>

              <section className={`${styles.panel} ${styles.basicsSection}`} id="basics-section">
                <div className={styles.sectionStepHeader}>
                  <span className={styles.sectionStepNumber}>1</span>
                  <div className={styles.sectionStepText}>
                    <h2 className={styles.sectionTitle}>Основа открытки</h2>
                  </div>
                </div>

                <BasicsSettingsForm manageToken={manageToken} card={card} />
              </section>

              <section className={`${styles.studioPanel} ${styles.compositionSection}`} id="composition-section">
                <div className={styles.sectionStepHeader}>
                  <span className={styles.sectionStepNumber}>2</span>
                  <div className={styles.sectionStepText}>
                    <h2 className={styles.sectionTitle}>Состав открытки</h2>
                  </div>
                </div>

                <BlockSettingsForm
                  cardId={card.id}
                  manageToken={manageToken}
                  options={blockOptions}
                  initialLayoutMode={layoutMode}
                  initialMediaLayout={mediaLayout}
                  initialBlockOrder={initialBlockOrder}
                  messageAssignedPhotoCount={messageAssignedPhotoCount}
                  memoryAssignedPhotoCount={memoryAssignedPhotoCount}
                  initialMemoryPhotoCount={memoryPhotoCount}
                  initialMemoryTitle={memoryTitle}
                  initialMemoryDescription={memoryDescription}
                  requiredBlockIds={requiredLayoutBlockIds}
                  initialMainGreetingContributionId={mainGreetingContributionId}
                  mainGreetingStatusText={mainGreetingStatusText}
                   initialBestQuotes={generatedQuoteCandidates}
                   initialSelectedBestQuotes={generatedQuotes}
                  bestQuotesAreStale={effectiveQuotesAreStale}
                  canGenerateBestQuotes={hasEnoughMeaningfulQuoteSources(visibleContributions)}
                  bestQuotesMinimumContributionCount={BEST_QUOTE_MIN_CONTRIBUTION_COUNT}
                  initialQualities={generatedQualities}
                  qualitiesAreStale={qualitiesAreStale}
                  canGenerateQualities={visibleContributions.length >= QUALITY_MIN_CONTRIBUTION_COUNT}
                  initialAiUsage={aiUsage}
                  isContentEditable={lifecycle.deliveryStatus !== "DELIVERED"}
                  readiness={blockReadiness}
                  visibleContributions={
                    mainGreetingContribution
                      ? [{
                          id: mainGreetingContribution.id,
                          authorName: mainGreetingContribution.authorName,
                          message: mainGreetingContribution.message
                        }]
                      : []
                  }
                />
              </section>
            </div>

            <DesignRail
              steps={organizerJourney.steps}
              completedCount={organizerJourney.completedCount}
              lifecycleLabel={lifecycleLabel}
              persistenceKey={`card-preparation:${manageToken}`}
              actionLinks={journeyActionLinks}
              templateCard={
                <EditorSidebarCard
                  className={`${styles.sidebarCard} ${styles.templateSection}`}
                  id="template-section"
                >
                  <div className={styles.sidebarCardHeader}>
                    <div>
                      <h2>Шаблон открытки</h2>
                      <p>Выбранный стиль и настроение</p>
                    </div>
                  </div>

                  <TemplateSummary
                    manageToken={manageToken}
                    templates={cardTemplates}
                    initialTemplateId={selectedTemplate?.id ?? null}
                  />
                </EditorSidebarCard>
              }
            >
                {lifecycle.deliveryStatus === "DELIVERED" ? (
                  <EditorSidebarCard className={`${styles.lifecycleSidebarCard} ${styles.statusContent}`}>
                    <div className={styles.statusCopy}>
                      <h3>{giftAccessible ? "Приватная ссылка получателя" : "Доступ получателя приостановлен"}</h3>
                      <p>{giftAccessible ? "Готовая открытка уже передана и больше не меняется." : "Передача уже была выполнена, но доступ по приватной ссылке получателя сейчас отключён."}</p>
                      {giftAccessible ? <>
                        <LinkPurposeList
                          audience={`Только получателю — ${recipientName}`}
                          purpose="Открыть готовую открытку без инструментов организатора"
                          nextStep="Скопируйте ссылку и отправьте её получателю лично"
                          tone="recipient"
                        />
                        <p className={styles.recipientPrivacyNote}>
                          <span aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                              <rect x="5" y="10" width="14" height="10" rx="2" />
                              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                            </svg>
                          </span>
                          <span><strong>Приватная ссылка.</strong> Не отправляйте её в общий чат участников.</span>
                        </p>
                      </> : null}
                    </div>
                    {giftAccessible ? <div className={styles.statusActions}>
                      <CopyLinkButton value={getGiftPath(card.finalSlug)} label="Скопировать приватную ссылку получателя" cardId={card.id} telemetrySource="gift" className={`${styles.statusSecondaryAction} ${styles.recipientLinkAction}`} />
                    </div> : null}
                  </EditorSidebarCard>
                ) : lifecycle.collectionStatus === "DRAFT" ? (
                  !collectionReady ? <EditorSidebarCard className={`${styles.lifecycleSidebarCard} ${styles.statusContent}`}>
                    <div className={styles.statusCopy}>
                      <h3>Что осталось заполнить</h3>
                      <ul className={styles.lifecycleMissingList}>
                        {!card.recipientName.trim() ? <li>Имя получателя</li> : null}
                        {!card.fromLabel.trim() ? <li>От кого открытка</li> : null}
                        {!card.occasionText.trim() ? <li>Надпись события</li> : null}
                        {!card.templateId ? <li>Шаблон открытки</li> : null}
                      </ul>
                    </div>
                  </EditorSidebarCard>
                  : null
                ) : lifecycle.collectionStatus === "OPEN" ? (
                  <ParticipantLinkCard
                    manageToken={manageToken}
                    participantLink={participantLink}
                    contributionCount={visibleContributions.length}
                    lifecycle={lifecycle}
                  />
                ) : lifecycle.paymentStatus === "PAID" || lifecycle.hasAdminAccess ? (
                  <EditorSidebarCard className={`${styles.lifecycleSidebarCard} ${styles.statusContent}`}>
                    <div className={styles.statusCopy}>
                      <h3>Передача получателю</h3>
                      <p>Проверьте финальную версию. После передачи содержимое и настройки открытки станут неизменяемыми.</p>
                      <p className={styles.paymentConfirmed}>{lifecycle.hasAdminAccess ? "✓ Оплата не требуется: доступ предоставлен администратором" : "✓ Оплата подтверждена"}</p>
                    </div>
                    <div className={styles.statusActions}>
                      <form action={openCollectionAction}><input type="hidden" name="manageToken" value={manageToken} /><button type="submit" className={styles.statusSecondaryAction}>Открыть сбор снова</button></form>
                    </div>
                  </EditorSidebarCard>
                ) : (
                  <EditorSidebarCard className={`${styles.lifecycleSidebarCard} ${styles.statusContent} ${styles.statusContentStacked}`}>
                    <div className={styles.statusCopy}>
                      <h3>Оплата и передача</h3>
                      <p>Проверьте поздравления, фотографии и оформление. Для передачи открытки получателю нужна подтверждённая оплата.</p>
                    </div>
                    <div className={`${styles.statusActions} ${styles.paymentPanel}`}>
                      <div className={styles.statusPrice}><strong>Финальная открытка</strong><span>399 ₽ единоразово</span></div>
                      <p className={styles.statusActionHint}>Оплата откроет расширенный лимит AI и возможность передать открытку.</p>
                      <PaymentCheckoutButton manageToken={manageToken} className={styles.statusPrimaryAction} containerClassName={styles.paymentCheckout} fieldClassName={styles.paymentEmailField} consentClassName={styles.paymentConsent} messageClassName={styles.paymentMessage} />
                      <form action={openCollectionAction}><input type="hidden" name="manageToken" value={manageToken} /><button type="submit" className={styles.statusSecondaryAction}>Открыть сбор снова</button></form>
                    </div>
                  </EditorSidebarCard>
                )}
            </DesignRail>
          </div>
          <DesignStickyActions
            manageToken={manageToken}
            primaryAction={stickyPrimaryAction}
            deliveryVersion={card.updatedAt}
            deliveryWarnings={deliveryWarnings}
          />
          </>
        ) : activeTab === "gift" ? (
          <>
          <div className={`${styles.editorWorkspace} ${styles.giftEditorWorkspace}`}>
            <div className={`${styles.editorMain} ${styles.giftPollTabShell}`}>
              <GiftPollSettingsForm
                manageToken={manageToken}
                recipientName={card.recipientName}
                publicSlug={card.publicSlug}
                poll={giftPoll}
                eligibleVoterCount={eligibleGiftPollVoterCount}
                collectionIsOpen={lifecycle.collectionStatus === "OPEN"}
              />
            </div>
            <aside
              className={`${styles.editorSidebar} ${styles.giftContextRail}`}
              aria-label="Панель выбора подарка"
            >
              <PreparationProgress
                steps={organizerJourney.steps}
                completedCount={organizerJourney.completedCount}
                lifecycleLabel={lifecycleLabel}
                persistenceKey={`card-preparation:${manageToken}`}
              />
              {!giftPoll ? (
              <EditorSidebarCard className={styles.giftStateCard}>
                <div className={styles.giftStateHeader}>
                  <h2>Состояние подарка</h2>
                  <span>Не настроено</span>
                </div>
                <ul className={styles.giftStateSummary}>
                  <li><span aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="5" /><circle cx="9" cy="12" r="3" /></svg></span>Голосование не включено</li>
                  <li><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3.5 10.5h17v10h-17zM2.5 6.5h19v4h-19zM12 6.5v14" /></svg></span>Варианты подарка не добавлены</li>
                  <li><span aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.3" /><path d="M3.5 20c.6-3.2 2.5-5 5.5-5s4.9 1.8 5.5 5M15 16.2c2.7-.4 4.6.8 5.2 3.8" /></svg></span>Голосование пока недоступно участникам</li>
                </ul>
              </EditorSidebarCard>
              ) : null}
              {lifecycle.collectionStatus === "OPEN" ? (
                <ParticipantLinkCard
                  manageToken={manageToken}
                  participantLink={participantLink}
                  contributionCount={visibleContributions.length}
                  lifecycle={lifecycle}
                />
              ) : null}
            </aside>
          </div>
          <DesignStickyActions manageToken={manageToken} primaryAction={giftStickyAction} mobileOnly />
          </>
        ) : (
          <ContentStudio
            key={allContributions.map((contribution) => contribution.id).join(":")}
            manageToken={manageToken}
            allContributions={allContributions}
            mediaAssets={mediaAssets}
            mediaLayout={mediaLayout}
            messagePhotosEnabled={messagePhotosEnabled}
            momentsEnabled={momentsEnabled}
            occasionText={occasionText}
            cardId={card.id}
            mainGreetingContributionId={mainGreetingContributionId}
            focus={contentFocus}
            section={activeTab}
            journeySteps={organizerJourney.steps}
            journeyCompletedCount={organizerJourney.completedCount}
            lifecycle={lifecycle}
            lifecycleLabel={lifecycleLabel}
            participantLink={participantLink}
            collectionReady={collectionReady}
            giftAccessible={giftAccessible}
            stickyAction={contentStickyAction}
            greetingMode={process.env.AI_GREETING_MODE === "ladder" ? "ladder" : process.env.AI_GREETING_MODE === "matrix" ? "matrix" : "classic"}
          />
        )}
      </div>
    </main>
  );
}
