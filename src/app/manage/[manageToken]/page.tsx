import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import {
  getCardDraftByManageToken,
  listAllContributionsByCardId,
  listCardMediaAssetsByCardId,
  listContributionsByCardId
} from "@/lib/cards/repository";
import { cardTemplates } from "@/lib/cards/templates";
import { finalCardLayouts } from "@/lib/final-card/layouts";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type { FinalCardBlockId, FinalCardOptionalBlockId } from "@/lib/final-card/types";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";
import { BasicsSettingsForm } from "./basics-settings-form";
import { BlockSettingsForm } from "./block-settings-form";
import { ContentStudio } from "./content-studio";
import { TemplateSettingsForm } from "./template-settings-form";
import styles from "./manage-page.module.css";

type Props = {
  params: Promise<{
    manageToken: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
};

const tabItems = [
  { id: "design", label: "Оформление открытки" },
  { id: "content", label: "Поздравления и фото" },
  { id: "preview", label: "Предпросмотр" }
] as const;

type ManageTab = (typeof tabItems)[number]["id"];

const stepItems = [
  {
    id: 1,
    title: "Основа открытки",
    subtitle: "Заполните основные данные"
  },
  {
    id: 2,
    title: "Состав открытки",
    subtitle: "Настройте структуру и блоки"
  }
] as const;

const managedBlockIds: FinalCardBlockId[] = ["hero", "summary", "qualities", "messages", "memories", "quotes", "closing"];

const layoutModeLabels: Record<string, string> = {
  "grid-2": "grid-2",
  "carousel-1": "carousel-1",
  "carousel-2": "carousel-2",
  "column-media": "column-media"
};

const blockPreviewLabels: Partial<Record<FinalCardBlockId, string>> = {
  summary: "Главное поздравление",
  quotes: "Лучшие фразы",
  messages: "Поздравления"
};

const formatEventDate = (value: string | null) => {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
};

export default async function ManagePage({ params, searchParams }: Props) {
  const { manageToken } = await params;
  const { tab } = await searchParams;
  const activeTab: ManageTab = tabItems.some((item) => item.id === tab) ? (tab as ManageTab) : "design";
  const card = await getCardDraftByManageToken(manageToken);

  if (!card) {
    notFound();
  }

  const allContributions = await listAllContributionsByCardId(card.id);
  const visibleContributions = await listContributionsByCardId(card.id);
  const mediaAssets = await listCardMediaAssetsByCardId(card.id);
  const model = buildFinalCardViewModel(card, visibleContributions, mediaAssets);
  const availableModel = buildFinalCardViewModel({ ...card, finalBlockSettings: null }, visibleContributions, mediaAssets);
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

  const recipientName = card.recipientName.trim() || "Кристина";
  const occasionText = card.occasionText.trim() || "За выпускной";
  const previewMessages = visibleContributions.slice(0, 1);
  const quotePreview = model.quotes[0] || "Спасибо тебе за твою доброту, поддержку и за то, что ты такая, какая есть.";
  const previewMessage = previewMessages[0];
  const formattedEventDate = formatEventDate(card.eventDate ?? null);
  const hiddenContributions = allContributions.filter((contribution) => contribution.status === "hidden");
  const tooLongContributions = visibleContributions.filter((contribution) => {
    const recommendedLimit = contribution.id === mainGreetingContributionId ? 500 : layoutProfile.maxChars;
    return contribution.message.length > recommendedLimit;
  });
  const needsMedia = layoutMode === "column-media";
  const messageMediaAssets = mediaAssets.filter((asset) => ["portrait", "landscape-a", "landscape-b", "landscape-c"].includes(asset.slot));
  const missingMedia = needsMedia && messageMediaAssets.length === 0;
  const previewWarnings = [
    tooLongContributions.length > 0
      ? `${tooLongContributions.length} поздравлений длиннее рекомендованной длины.`
      : "",
    missingMedia ? "Для выбранной раскладки рядом с поздравлениями стоит добавить фото." : "",
    hiddenContributions.length > 0 ? `${hiddenContributions.length} поздравлений скрыто и не попадет в открытку.` : ""
  ].filter(Boolean);
  const activeBlockLabels = model.blocks.map((block) => {
    if (block.id === "hero") {
      return "Обложка";
    }

    if (block.id === "closing") {
      return "Финал";
    }

    return blockPreviewLabels[block.id] ?? block.id;
  });

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroTop}>
            <div className={styles.heroContent}>
              <p className={styles.heroBreadcrumbs}>
                <span>Организатор: {card.organizerName.trim() || "Евсей"}</span>
                <span>Повод: {occasionText}</span>
              </p>
              <h1 className={styles.title}>Открытка для {recipientName}</h1>
              <p className={styles.subtitle}>
                Создайте красивую открытку и соберите искренние поздравления от всех участников. Всё сохранится,
                ничего не потеряется между шагами.
              </p>

              <div className={styles.stats}>
                <div className={styles.stat}>Повод: {occasionText}</div>
                <div className={styles.stat}>Сообщений: {allContributions.length}</div>
                <div className={styles.stat}>Видимых: {visibleContributions.length}</div>
                <div className={styles.stat}>Сетка: {layoutModeLabels[layoutMode] ?? layoutMode}</div>
              </div>

              <nav className={styles.tabBar} aria-label="Разделы управления открыткой">
                {tabItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/manage/${manageToken}?tab=${item.id}`}
                    className={`${styles.tabLink} ${activeTab === item.id ? styles.tabLinkActive : ""}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <aside className={styles.heroTemplateCard}>
              <div className={styles.heroTemplateInfo}>
                <span className={styles.heroTemplateLabel}>Текущий шаблон</span>
                <strong className={styles.heroTemplateName}>{selectedTemplate.name}</strong>
              </div>

              <div
                className={styles.heroTemplateThumb}
                style={
                  {
                    "--template-accent": selectedTemplate.accent
                  } as CSSProperties
                }
                aria-hidden="true"
              >
                <div className={styles.heroTemplateThumbPaper}>
                  <span>{recipientName}</span>
                </div>
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
            </aside>
          </div>
        </section>

        {activeTab === "design" ? (
          <div className={styles.designStudio}>
            <div className={styles.designMain}>
              <section className={styles.stepperCard}>
                <div className={styles.stepperGrid}>
                  {stepItems.map((item, index) => (
                    <div key={item.id} className={styles.stepperItem}>
                      <div className={`${styles.stepperDot} ${index === 0 ? styles.stepperDotActive : ""}`}>{item.id}</div>
                      <div className={styles.stepperText}>
                        <strong>{item.title}</strong>
                        <span>{item.subtitle}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.stepperLine}>
                  <span className={styles.stepperLineFill} />
                  <span className={styles.stepperLineKnob} />
                </div>
              </section>

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
                />
              </section>
            </div>

            <aside className={styles.designRail}>
              <section className={styles.previewPanel}>
                <div className={styles.previewPanelHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Предпросмотр</h2>
                    <p className={styles.previewStatusLine}>
                      <span className={styles.previewStatusDot} />
                      <span>Предпросмотр обновляется автоматически</span>
                    </p>
                  </div>
                </div>

                <div className={styles.previewFrame}>
                  <article
                    className={styles.previewMock}
                    style={
                      {
                        "--preview-accent": selectedTemplate.accent
                      } as CSSProperties
                    }
                  >
                    <section className={styles.previewHeroCard}>
                      <div className={styles.previewHeroFloral} />
                      <div className={styles.previewHeroText}>
                        <h3 className={styles.previewHeroTitle}>{recipientName},</h3>
                        <p className={styles.previewHeroSubtitle}>эта открытка для тебя!</p>
                      </div>
                      <div className={styles.previewHeroOccasion}>
                        <strong>{occasionText}</strong>
                        <span>
                          от {card.fromLabel.trim() || "Евсея и всей группы"}
                          {formattedEventDate ? ` • ${formattedEventDate}` : ""}
                        </span>
                      </div>
                    </section>

                    <section className={styles.previewQuoteCard}>
                      <span className={styles.previewQuoteMark}>“</span>
                      <p>{quotePreview}</p>
                      <div className={styles.previewDots}>
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                    </section>

                    <section className={styles.previewMessageSection}>
                      <span className={styles.previewMessageLabel}>{blockPreviewLabels.messages}</span>
                      <article className={styles.previewSingleMessage}>
                        <div className={styles.previewSingleAvatar} />
                        <div className={styles.previewSingleBody}>
                          <strong>{previewMessage?.authorName || "Аня"}</strong>
                          <p>
                            {previewMessage?.message.slice(0, 118) ||
                              "Крис, ты невероятная! Пусть новый этап жизни принесёт много счастья и возможностей!"}
                          </p>
                        </div>
                      </article>
                    </section>

                    <section className={styles.previewFinalCard}>
                      <span>Спасибо, что ты с нами!</span>
                      <p>Вперёд — к мечтам!</p>
                    </section>
                  </article>
                </div>

                <Link href={`/gift/${card.finalSlug}`} target="_blank" className={styles.previewLinkButton}>
                  Открыть полный просмотр
                </Link>
              </section>
            </aside>
          </div>
        ) : activeTab === "preview" ? (
          <section className={styles.fullPreviewStage}>
            <div className={styles.fullPreviewHeader}>
              <div>
                <span className={styles.previewKicker}>Финальная проверка</span>
                <h2>Предпросмотр открытки</h2>
                <p>
                  Здесь можно спокойно посмотреть, как открытка ощущается целиком, перед тем как отправлять ссылку или переходить к публикации.
                </p>
              </div>
              <div className={styles.fullPreviewActions}>
                <Link href={`/gift/${card.finalSlug}`} target="_blank" className={styles.previewPrimaryLink}>
                  Открыть публичную версию
                </Link>
                <Link href={`/manage/${manageToken}?tab=design`} className={styles.previewSecondaryLink}>
                  Вернуться к оформлению
                </Link>
              </div>
            </div>

            <div className={styles.fullPreviewLayout}>
              <section className={styles.embeddedPreviewCard}>
                <div className={styles.embeddedPreviewTop}>
                  <div>
                    <span className={styles.previewKicker}>Настоящий результат</span>
                    <h3>Публичная открытка внутри редактора</h3>
                  </div>
                  <Link href={`/gift/${card.finalSlug}`} target="_blank" className={styles.previewSecondaryLink}>
                    Открыть отдельно
                  </Link>
                </div>
                <iframe
                  className={styles.embeddedPreviewFrame}
                  src={`/gift/${card.finalSlug}`}
                  title="Предпросмотр публичной открытки"
                />
              </section>

              <aside className={styles.fullPreviewChecklist}>
                <section>
                  <h3>Готовность</h3>
                  <div className={styles.fullPreviewMetric}>
                    <span>Активных поздравлений</span>
                    <strong>{visibleContributions.length}</strong>
                  </div>
                  <div className={styles.fullPreviewMetric}>
                    <span>Фото добавлено</span>
                    <strong>{mediaAssets.length}</strong>
                  </div>
                  <div className={styles.fullPreviewMetric}>
                    <span>Шаблон</span>
                    <strong>{selectedTemplate.name}</strong>
                  </div>
                </section>

                <section>
                  <h3>Что входит в открытку</h3>
                  <div className={styles.fullPreviewBlockList}>
                    {activeBlockLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </section>

                <section>
                  <h3>Проверить перед отправкой</h3>
                  {previewWarnings.length > 0 ? (
                    <ul className={styles.fullPreviewWarnings}>
                      {previewWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.fullPreviewOk}>Критичных предупреждений нет. Можно открыть публичную версию и посмотреть финальный экран.</p>
                  )}
                </section>
              </aside>
            </div>
          </section>
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
            fromLabel={card.fromLabel}
            publicSlug={card.publicSlug}
            finalSlug={card.finalSlug}
            templateAccent={selectedTemplate.accent}
            previewMessage={previewMessage}
            cardId={card.id}
            mainGreetingContributionId={mainGreetingContributionId}
          />
        )}
      </div>
    </main>
  );
}
