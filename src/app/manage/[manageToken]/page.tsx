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
import { finalCardLayouts } from "@/lib/final-card/layouts";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import { getGiftPath, getJoinUrl, getManagePath, getPreviewPath } from "@/lib/routes/card-links";
import { pluralize } from "@/lib/i18n/pluralize";
import type { FinalCardBlockId, FinalCardOptionalBlockId } from "@/lib/final-card/types";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";
import { BasicsSettingsForm } from "./basics-settings-form";
import { BlockSettingsForm } from "./block-settings-form";
import { ContentStudio } from "./content-studio";
import { CopyLinkButton } from "./copy-link-button";
import { TemplateSettingsForm } from "./template-settings-form";
import styles from "./manage-page.module.css";
import { getAiCardInsight, getAiUsageSummary } from "@/lib/ai/repository";
import { buildContributionFingerprint } from "@/lib/ai/card-insights";
import { getCardLifecycleByManageToken } from "@/lib/cards/lifecycle-repository";
import { getCardLifecycleLabel, isGiftAccessible } from "@/lib/cards/lifecycle";
import { closeCollectionAction, deliverCardAction, openCollectionAction } from "./actions";
import { getGiftPollForManage } from "@/lib/gift-polls/repository";
import { GiftPollSettingsForm } from "./gift-poll-settings-form";
import { PaymentCheckoutButton } from "./payment-checkout-button";

type Props = {
  params: Promise<{
    manageToken: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
};

const tabItems = [
  { id: "design", label: "Оформление" },
  { id: "content", label: "Поздравления и фото" },
  { id: "gift", label: "Выбор подарка" }
] as const;

type ManageTab = (typeof tabItems)[number]["id"];

const managedBlockIds: FinalCardBlockId[] = ["hero", "summary", "qualities", "messages", "memories", "quotes", "closing"];

export default async function ManagePage({ params, searchParams }: Props) {
  const { manageToken } = await params;
  const { tab } = await searchParams;
  const activeTab: ManageTab = tabItems.some((item) => item.id === tab) ? (tab as ManageTab) : "design";
  const [card, lifecycle] = await Promise.all([getCardDraftByManageToken(manageToken), getCardLifecycleByManageToken(manageToken)]);

  if (!card || !lifecycle) {
    notFound();
  }

  const [allContributions, cardTemplates, visibleContributions, mediaAssets, aiUsage, quotesInsight, qualitiesInsight, giftPoll] = await Promise.all([
    listAllContributionsByCardId(card.id),
    getCardTemplates(),
    listContributionsByCardId(card.id),
    listCardMediaAssetsByCardId(card.id),
    getAiUsageSummary(card.id),
    getAiCardInsight(card.id, "quotes"),
    getAiCardInsight(card.id, "qualities"),
    getGiftPollForManage(card.id)
  ]);
  const generatedQuotes = quotesInsight?.items.map((item) => item.text) ?? [];
  const generatedQualities = qualitiesInsight?.items.map((item) => item.text) ?? [];
  const contributionFingerprint = buildContributionFingerprint(visibleContributions);
  const eligibleGiftPollVoterCount = new Set(
    visibleContributions
      .filter((contribution) => contribution.source === "participant")
      .map((contribution) => contribution.participantTokenHash)
      .filter((token): token is string => Boolean(token))
  ).size;
  const quotesAreStale = Boolean(quotesInsight && quotesInsight.sourceFingerprint !== contributionFingerprint);
  const qualitiesAreStale = Boolean(qualitiesInsight && qualitiesInsight.sourceFingerprint !== contributionFingerprint);
  const aiContent = { quotes: generatedQuotes, qualities: generatedQualities };
  const model = buildFinalCardViewModel(card, visibleContributions, mediaAssets, aiContent);
  const availableModel = buildFinalCardViewModel(
    { ...card, finalBlockSettings: null },
    visibleContributions,
    mediaAssets,
    aiContent
  );
  const style = cardTemplates.find((template) => template.id === card.templateId)?.id ?? "warm-classic";
  const selectedTemplate = cardTemplates.find((template) => template.id === card.templateId) ?? cardTemplates[0];
  const layoutMode = card.finalMessageSettings?.layoutMode ?? "grid-2";
  const mediaLayout = card.finalMessageSettings?.mediaLayout ?? "portrait";
  const messageMediaSlots = card.finalMessageSettings?.mediaSlots ?? [];
  const memoryMediaSlots = card.finalMemorySettings?.mediaSlots ?? [];
  const messageMediaAssetIds = card.finalMessageSettings?.mediaAssetIds ?? [];
  const memoryMediaAssetIds = card.finalMemorySettings?.mediaAssetIds ?? [];
  const memoryPhotoCount = card.finalMemorySettings?.photoCount ?? 3;
  const savedMemoryTitle = card.finalMemorySettings?.title?.trim();
  const savedMemoryDescription = card.finalMemorySettings?.description?.trim();
  const memoryTitle = !savedMemoryTitle || savedMemoryTitle === "Наши воспоминания" ? "Моменты" : savedMemoryTitle;
  const memoryDescription =
    !savedMemoryDescription || savedMemoryDescription === "Столько ярких моментов, с которыми мы идём рядом с тобой."
      ? "Фото, которые хочется сохранить"
      : savedMemoryDescription;
  const layoutProfile = getFinalCardMessageLayoutProfile(layoutMode);
  const requiredLayoutBlockIds = finalCardLayouts[style].blocks
    .filter((block) => block.required)
    .map((block) => block.id);
  const optionalLayoutBlocks = finalCardLayouts[style].blocks.filter(
    (block) => !block.required && managedBlockIds.includes(block.id)
  );
  const mainGreetingContributionId = card.finalMainGreetingSettings?.contributionId ?? model.mainGreetingContributionId;
  const mainGreetingContribution = visibleContributions.find((contribution) => contribution.id === mainGreetingContributionId);
  const mainGreetingStatusText = mainGreetingContribution
    ? `Выбрано поздравление от ${mainGreetingContribution.authorName}. В открытке оно будет показано как «Самые важные слова».`
    : "Главное поздравление пока не выбрано. Откройте вкладку «Поздравления и фото» и отметьте одно активное поздравление.";

  const blockMeta: Record<FinalCardOptionalBlockId, { label: string; description: string }> = {
    summary: {
      label: "Главное поздравление",
      description: "Большой личный блок с выбранным поздравлением до общей ленты."
    },
    qualities: {
      label: "Качества",
      description: "Подсвечивает, за что именно любят и ценят человека."
    },
    memories: {
      label: "Моменты",
      description: "Добавляет до трех фото с короткими подписями в отдельный теплый блок."
    },
    quotes: {
      label: "Лучшие фразы",
      description: "Выносит самые сильные короткие строки из поздравлений."
    },
    "ai-summary": {
      label: "Общее поздравление",
      description: "Сводный блок, который собирает общий голос группы."
    }
  };

  const availableBlockIds = availableModel.blocks.map((block) => block.id);
  const blockOptions = optionalLayoutBlocks.map((block) => ({
    id: block.id as FinalCardOptionalBlockId,
    label: blockMeta[block.id as FinalCardOptionalBlockId].label,
    description: blockMeta[block.id as FinalCardOptionalBlockId].description,
    checked: card.finalBlockSettings?.[block.id as FinalCardOptionalBlockId] ?? true,
    disabled: !availableBlockIds.includes(block.id)
  }));
  const blockState = Object.fromEntries(
    blockOptions.map((option) => [option.id, card.finalBlockSettings?.[option.id] ?? true])
  ) as Record<FinalCardOptionalBlockId, boolean>;
  const savedBlockOrder = card.finalBlockOrder?.filter((blockId) => managedBlockIds.includes(blockId)) ?? [];
  const initialBlockOrder = [...savedBlockOrder, ...managedBlockIds.filter((blockId) => !savedBlockOrder.includes(blockId))];

  const recipientName = card.recipientName.trim() || "нового получателя";
  const fromLabel = card.fromLabel.trim() || "группы";
  const occasionText = card.occasionText.trim() || "повод не указан";
  const previewMessages = visibleContributions.slice(0, 1);
  const previewMessage = previewMessages[0];
  const participantLink = getJoinUrl(card.publicSlug);
  const lifecycleLabel = getCardLifecycleLabel(lifecycle);
  const giftAccessible = isGiftAccessible(lifecycle);
  const paymentRequired = process.env.PUBLICATION_MODE === "paid";
  const aiLimitTotal = aiUsage.limit;
  const aiLimitRemaining = aiUsage.remaining;
  const templatePalette = ["#eaded2", "#f4c59e", selectedTemplate.accent, "#5a3927", "#a8b792"];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.managerHeader}>
          <div className={styles.managerBrand}>
            <Link href="/" className={styles.brandName}>
              <BrandLogo />
            </Link>
          </div>

          <div className={styles.managerTitleGroup}>
            <span className={styles.managerKicker}>Редактор открытки</span>
            <h1 className={styles.managerTitle}>{recipientName}</h1>
            <div className={styles.managerChips} aria-label="Сводка открытки">
              <span>{lifecycleLabel}</span>
              <span>{fromLabel}</span>
              <span>{allContributions.length} поздравлений</span>
              <span>{mediaAssets.length} фото</span>
              <span className={styles.aiChip}>AI: осталось {aiLimitRemaining} из {aiLimitTotal}</span>
            </div>
          </div>

          <div className={styles.managerActions}>
            {lifecycle.collectionStatus === "OPEN" && lifecycle.deliveryStatus === "PREPARING" ? (
              <CopyLinkButton value={participantLink} label="Копировать ссылку" cardId={card.id} telemetrySource="participant" />
            ) : null}
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
              <span>Финальная ссылка откроется после передачи получателю.</span>
            </div>
          </div>
        </header>

        <nav className={styles.tabBar} aria-label="Разделы управления открыткой">
          {tabItems.map((item) => (
            <Link
              key={item.id}
              href={`${getManagePath(manageToken)}?tab=${item.id}`}
              className={`${styles.tabLink} ${activeTab === item.id ? styles.tabLinkActive : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {activeTab === "design" ? (
          <div className={styles.designStudio}>
            <div className={styles.designMain}>

              <section className={styles.panel} id="basics-section">
                <div className={styles.sectionStepHeader}>
                  <span className={styles.sectionStepNumber}>1</span>
                  <div className={styles.sectionStepText}>
                    <h2 className={styles.sectionTitle}>Основа открытки</h2>
                  </div>
                </div>

                <BasicsSettingsForm manageToken={manageToken} card={card} />
              </section>

              <section className={styles.studioPanel} id="composition-section">
                <div className={styles.sectionStepHeader}>
                  <span className={styles.sectionStepNumber}>2</span>
                  <div className={styles.sectionStepText}>
                    <h2 className={styles.sectionTitle}>Состав открытки</h2>
                  </div>
                </div>

                <BlockSettingsForm
                  manageToken={manageToken}
                  options={blockOptions}
                  initialLayoutMode={layoutMode}
                  initialMediaLayout={mediaLayout}
                  initialBlockOrder={initialBlockOrder}
                  mediaAssets={mediaAssets}
                  initialMessageMediaSlots={messageMediaSlots}
                  initialMemoryMediaSlots={memoryMediaSlots}
                  initialMessageMediaAssetIds={messageMediaAssetIds}
                  initialMemoryMediaAssetIds={memoryMediaAssetIds}
                  initialMemoryPhotoCount={memoryPhotoCount}
                  initialMemoryTitle={memoryTitle}
                  initialMemoryDescription={memoryDescription}
                  requiredBlockIds={requiredLayoutBlockIds}
                  initialMainGreetingContributionId={mainGreetingContributionId}
                  mainGreetingStatusText={mainGreetingStatusText}
                  initialBestQuotes={generatedQuotes}
                  bestQuotesAreStale={quotesAreStale}
                  canGenerateBestQuotes={visibleContributions.length >= 2}
                  initialQualities={generatedQualities}
                  qualitiesAreStale={qualitiesAreStale}
                  canGenerateQualities={visibleContributions.length >= 2}
                  initialAiUsage={aiUsage}
                />
              </section>
            </div>

            <aside className={styles.designRail}>
              <section className={styles.sidebarCard}>
                <div className={styles.sidebarCardHeader}>
                  <div>
                    <h2>Шаблон открытки</h2>
                    <p>Выбранный стиль и настроение</p>
                  </div>
                </div>

                <div className={styles.templateSummary}>
                  {selectedTemplate.id === "paper-birthday" ? (
                    <div className={styles.templatePreviewWrap}>
                      {/* Intentional fixed preview asset inside a CSS-sized template frame. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/templates/warm-classic-preview.png"
                        alt={selectedTemplate.name}
                        className={styles.templatePreviewImage}
                      />
                    </div>
                  ) : (
                    <div className={styles.templatePreviewPlaceholder}>
                      <span className={styles.templatePreviewPlaceholderIcon}>🎨</span>
                      <span className={styles.templatePreviewPlaceholderText}>Другие шаблоны появятся позже</span>
                    </div>
                  )}
                  <div className={styles.templateSummaryText}>
                    <div className={styles.templateNameRow}>
                      <strong>{selectedTemplate.name}</strong>
                      <span>Рекомендуем</span>
                    </div>
                    <p>{selectedTemplate.description}</p>
                    <div className={styles.paletteRow} aria-label="Цветовая палитра">
                      {templatePalette.map((color) => (
                        <span key={color} style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <TemplateSettingsForm
                      manageToken={manageToken}
                      templates={cardTemplates}
                      initialTemplateId={selectedTemplate.id}
                      initialLayoutMode={layoutMode}
                      initialMediaLayout={mediaLayout}
                      initialBlockOrder={initialBlockOrder}
                      blockState={blockState}
                      variant="hero"
                    />
                  </div>
                </div>
              </section>

              <section className={styles.sidebarCard}>
                <div className={styles.sidebarCardHeader}>
                  <div>
                    <h2>Анимация открытки</h2>
                    <p>Как получатель увидит вашу открытку</p>
                  </div>
                </div>
                <div className={styles.animationRow}>
                  <div className={styles.envelopeIcon} aria-hidden="true">
                    <span />
                  </div>
                  <div>
                    <div className={styles.templateNameRow}>
                      <strong>Конверт с открыткой</strong>
                      <span>Выбрано</span>
                    </div>
                    <p>Красивый момент вручения: конверт открывается, и открытка появляется плавно и с теплом.</p>
                  </div>
                </div>
                <p className={styles.lockedHint}>Анимация будет доступна получателю после публикации.</p>
              </section>

              <section className={styles.sidebarCard}>
                <div className={styles.sidebarCardHeader}>
                  <div>
                    <h2>Пригласить участников</h2>
                    <p>Отправьте ссылку в чат, чтобы гости добавили поздравления и фото.</p>
                  </div>
                </div>
                <div className={styles.inviteBlock}>
                  <div className={styles.inviteMain}>
                    <div className={styles.inviteStatusLine}>
                      <strong>Форма участника</strong>
                      <span className={styles.inviteBadge}>Ссылка активна</span>
                    </div>
                    <span className={styles.inviteHint}>По этой ссылке можно добавить поздравление</span>
                  </div>
                  <div className={styles.inviteActions}>
                    <CopyLinkButton
                      value={participantLink}
                      cardId={card.id}
                      telemetrySource="participant"
                      copiedLabel="Ссылка скопирована"
                      className={styles.inviteCopyButton}
                    />
                    <Link
                      href={participantLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.inviteOpenButton}
                    >
                      Открыть форму
                    </Link>
                  </div>
                </div>
                <div className={styles.inviteCounter}>
                  <span className={styles.inviteCounterIcon}>👥</span>
                  <span>
                    Уже добавили: {visibleContributions.length}{" "}
                    {pluralize(visibleContributions.length, {
                      one: "поздравление",
                      few: "поздравления",
                      many: "поздравлений"
                    })}
                  </span>
                </div>
              </section>

              <section className={`${styles.sidebarCard} ${styles.publishCard}`}>
                <div className={styles.sidebarCardHeader}>
                  <div>
                    <h2>Статус открытки</h2>
                    <p>
                      Сбор, оплата и передача управляются отдельно. После передачи содержимое фиксируется.
                    </p>
                  </div>
                </div>
                {giftAccessible ? (
                  <>
                    <div className={styles.publishPriceRow}>
                      <strong>Передана получателю</strong>
                      <Link href={getGiftPath(card.finalSlug)} className={styles.publishButton}>
                        Открыть открытку
                      </Link>
                    </div>
                    <p className={styles.paymentFineprint}>Финальная ссылка готова — её можно отправлять получателю</p>
                  </>
                ) : lifecycle.collectionStatus === "DRAFT" ? (
                  <>
                    <form action={openCollectionAction} className={styles.publishPriceRow}>
                      <input type="hidden" name="manageToken" value={manageToken} />
                      <strong>Черновик</strong>
                      <button type="submit" className={styles.publishButton}>
                        Открыть сбор
                      </button>
                    </form>
                    <p className={styles.paymentFineprint}>Ссылка участника станет доступна после открытия сбора.</p>
                  </>
                ) : lifecycle.collectionStatus === "OPEN" ? (
                  <>
                    <form action={closeCollectionAction} className={styles.publishPriceRow}>
                      <input type="hidden" name="manageToken" value={manageToken} />
                      <strong>Сбор открыт</strong>
                      <button type="submit" className={styles.publishButton}>Закрыть сбор</button>
                    </form>
                    <p className={styles.paymentFineprint}>После закрытия можно проверить открытку и перейти к оплате.</p>
                  </>
                ) : lifecycle.paymentStatus === "PAID" || !paymentRequired ? (
                  <>
                    <form action={deliverCardAction} className={styles.publishPriceRow}>
                      <input type="hidden" name="manageToken" value={manageToken} />
                      <strong>{paymentRequired ? "Готова к передаче" : "Готова к передаче бесплатно"}</strong>
                      <button type="submit" className={styles.publishButton}>Передать получателю</button>
                    </form>
                    <form action={openCollectionAction} className={styles.publishPriceRow}>
                      <input type="hidden" name="manageToken" value={manageToken} />
                      <strong>Нужно ещё поздравление?</strong>
                      <button type="submit" className={styles.publishButton}>Открыть сбор снова</button>
                    </form>
                    <p className={styles.paymentFineprint}>После передачи редактирование станет недоступно.</p>
                  </>
                ) : (
                  <>
                    <div className={styles.publishPriceRow}>
                      <strong>Финальная подготовка</strong>
                      <PaymentCheckoutButton manageToken={manageToken} className={styles.publishButton} />
                    </div>
                    <form action={openCollectionAction} className={styles.publishPriceRow}>
                      <input type="hidden" name="manageToken" value={manageToken} />
                      <strong>Нужно ещё поздравление?</strong>
                      <button type="submit" className={styles.publishButton}>Открыть сбор снова</button>
                    </form>
                    <p className={styles.paymentFineprint}>Передача станет доступна после подтверждённой оплаты.</p>
                  </>
                )}
              </section>
            </aside>
          </div>
        ) : activeTab === "gift" ? (
          <div className={styles.giftPollTabShell}>
            <GiftPollSettingsForm manageToken={manageToken} recipientName={card.recipientName} publicSlug={card.publicSlug} poll={giftPoll} eligibleVoterCount={eligibleGiftPollVoterCount} />
          </div>
        ) : (
          <ContentStudio
            key={allContributions.map((contribution) => contribution.id).join(":")}
            manageToken={manageToken}
            allContributions={allContributions}
            mediaAssets={mediaAssets}
            mediaLayout={mediaLayout}
            messageLimit={layoutProfile.maxChars}
            recipientName={recipientName}
            occasionText={occasionText}
            fromLabel={fromLabel}
            publicSlug={card.publicSlug}
            templateAccent={selectedTemplate.accent}
            previewMessage={previewMessage}
            cardId={card.id}
            mainGreetingContributionId={mainGreetingContributionId}
            greetingMode={process.env.AI_GREETING_MODE === "ladder" ? "ladder" : process.env.AI_GREETING_MODE === "matrix" ? "matrix" : "classic"}
          />
        )}
      </div>
    </main>
  );
}
