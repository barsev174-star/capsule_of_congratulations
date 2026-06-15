import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCardDraftByManageToken,
  listAllContributionsByCardId,
  listCardMediaAssetsByCardId,
  listContributionsByCardId
} from "@/lib/cards/repository";
import { cardTemplates } from "@/lib/cards/templates";
import { finalCardLayouts } from "@/lib/final-card/layouts";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type { FinalCardOptionalBlockId } from "@/lib/final-card/types";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";
import { buildReminderText } from "@/lib/manage/reminder";
import { BasicsSettingsForm } from "./basics-settings-form";
import { BlockSettingsForm } from "./block-settings-form";
import { ContributionEditor } from "./contribution-editor";
import { MediaManager } from "./media-manager";
import { TemplateSettingsForm } from "./template-settings-form";
import { moveContributionAction, setContributionStatusAction } from "./actions";
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
  { id: "content", label: "Поздравления и фото" }
] as const;

const starterSteps = [
  "Укажите, кому и от кого эта открытка.",
  "Коротко опишите повод, чтобы у открытки появился живой контекст.",
  "Потом выберите структуру, шаблон и позовите участников."
];

export default async function ManagePage({ params, searchParams }: Props) {
  const { manageToken } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "content" ? "content" : "design";
  const card = await getCardDraftByManageToken(manageToken);

  if (!card) {
    notFound();
  }

  const allContributions = await listAllContributionsByCardId(card.id);
  const visibleContributions = await listContributionsByCardId(card.id);
  const mediaAssets = await listCardMediaAssetsByCardId(card.id);
  const reminderText = buildReminderText(card, visibleContributions.length);
  const model = buildFinalCardViewModel(card, visibleContributions, mediaAssets);
  const availableModel = buildFinalCardViewModel({ ...card, finalBlockSettings: null }, visibleContributions, mediaAssets);
  const style = cardTemplates.find((template) => template.id === card.templateId)?.id ?? "warm-classic";
  const selectedTemplate = cardTemplates.find((template) => template.id === card.templateId) ?? cardTemplates[0];
  const layoutMode = card.finalMessageSettings?.layoutMode ?? "grid-2";
  const mediaLayout = card.finalMessageSettings?.mediaLayout ?? "portrait";
  const layoutProfile = getFinalCardMessageLayoutProfile(layoutMode);
  const showAllLink = visibleContributions.length > layoutProfile.cardsPerPage;
  const optionalLayoutBlocks = finalCardLayouts[style].blocks.filter((block) => !block.required);

  const blockMeta: Record<FinalCardOptionalBlockId, { label: string; description: string }> = {
    summary: {
      label: "Вводный блок",
      description: "Коротко объясняет, по какому поводу собрана открытка."
    },
    qualities: {
      label: "Качества",
      description: "Подсвечивает, за что именно любят и ценят человека."
    },
    memories: {
      label: "Моменты и фото",
      description: "Дает место под фотографии, подписи и теплые визуальные детали."
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

  const isBlankBasics =
    !card.recipientName.trim() &&
    !card.fromLabel.trim() &&
    !card.occasionText.trim() &&
    !card.organizerName.trim() &&
    !card.organizerEmail.trim();

  const recipientName = card.recipientName || "нового получателя";
  const fromLabel = card.fromLabel || "пока не указано";
  const occasionText = card.occasionText || "пока не указан";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroTop}>
            <div>
              <p className={styles.eyebrow}>Секретная ссылка организатора</p>
              <h1 className={styles.title}>{isBlankBasics ? "Новый черновик открытки" : `Открытка для ${recipientName}`}</h1>
              <p className={styles.subtitle}>
                Здесь отдельно собраны оформление открытки и работа с поздравлениями, чтобы весь путь был понятнее и
                спокойнее.
              </p>
            </div>

            <div className={styles.heroSummary}>
              <span className={styles.heroSummaryLabel}>Сейчас выбран шаблон</span>
              <strong>{selectedTemplate.name}</strong>
              <span className={styles.heroSummaryLabel}>
                {showAllLink ? "Есть отдельный экран со всеми поздравлениями" : "Все поздравления живут только внутри открытки"}
              </span>
            </div>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>Повод: {occasionText}</div>
            <div className={styles.stat}>Сообщений: {allContributions.length}</div>
            <div className={styles.stat}>Видимых: {visibleContributions.length}</div>
            <div className={styles.stat}>Сетка: {layoutMode}</div>
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
        </section>

        {activeTab === "design" ? (
          <>
            {isBlankBasics ? (
              <section className={styles.welcomeCard}>
                <div className={styles.welcomeIntro}>
                  <p className={styles.eyebrow}>С чего начать</p>
                  <h2 className={styles.sectionTitle}>Сначала заполните основу открытки</h2>
                  <p className={styles.hint}>
                    Это новый пустой черновик. Ниже все уже готово для работы: сначала заполните базовые данные, потом
                    соберите структуру и после этого выберите шаблон.
                  </p>
                </div>
                <div className={styles.welcomeSteps}>
                  {starterSteps.map((step, index) => (
                    <article key={step} className={styles.welcomeStep}>
                      <span className={styles.welcomeStepNumber}>0{index + 1}</span>
                      <p className={styles.previewText}>{step}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Шаг 1</p>
                  <h2 className={styles.sectionTitle}>Основа открытки</h2>
                </div>
                <p className={styles.hint}>
                  Здесь можно заполнить и исправить все базовые данные. Если где-то ошиблись раньше, возвращаться никуда
                  не нужно.
                </p>
              </div>

              <BasicsSettingsForm manageToken={manageToken} card={card} />
            </section>

            <section className={styles.studioPanel}>
              <div className={styles.studioPanelHeader}>
                <div>
                  <p className={styles.eyebrow}>Шаг 2</p>
                  <h2 className={styles.sectionTitle}>Состав открытки</h2>
                </div>
                <p className={styles.studioLead}>
                  Здесь видно, как сейчас собран итоговый экран: какие блоки в нем есть, что можно убрать и как будут
                  выглядеть поздравления.
                </p>
              </div>

              <BlockSettingsForm
                manageToken={manageToken}
                options={blockOptions}
                initialLayoutMode={layoutMode}
                initialMediaLayout={mediaLayout}
              />
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Шаг 3</p>
                  <h2 className={styles.sectionTitle}>Шаблоны и настроение открытки</h2>
                </div>
                <p className={styles.hint}>
                  Выбор шаблона теперь живет здесь, после структуры. Так проще смотреть все варианты и выбирать по
                  реальному ощущению.
                </p>
              </div>

              <TemplateSettingsForm
                manageToken={manageToken}
                templates={cardTemplates}
                initialTemplateId={selectedTemplate.id}
                initialLayoutMode={layoutMode}
                initialMediaLayout={mediaLayout}
                blockState={blockState}
              />
            </section>

            <section className={styles.actionsCard}>
              <h2 className={styles.sectionTitle}>Что сейчас увидит получатель</h2>
              <div className={styles.summaryList}>
                <p className={styles.previewText}>
                  Итоговая открытка собрана для <strong>{recipientName}</strong> от <strong>{fromLabel}</strong>.
                </p>
                <p className={styles.previewText}>
                  В блок поздравлений попадет <strong>{visibleContributions.length}</strong> видимых сообщений.
                </p>
                <p className={styles.previewText}>
                  Безопасный лимит для текущей сетки: <strong>{layoutProfile.maxChars}</strong> символов на карточку.
                </p>
                <p className={styles.previewText}>
                  Текущая структура: <code>{model.blocks.map((block) => block.id).join(", ")}</code>
                </p>
              </div>
            </section>
          </>
        ) : (
          <div className={styles.layout}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>Поздравления</h2>
                  <p className={styles.hint}>
                    Здесь редактируем тексты, меняем порядок и сразу видим, насколько каждое поздравление укладывается
                    в текущую сетку.
                  </p>
                </div>
                <span className={styles.infoBadge}>{allContributions.length} записей</span>
              </div>

              {allContributions.length === 0 ? (
                <p className={styles.empty}>Пока поздравлений нет. Сначала участники должны добавить свои сообщения.</p>
              ) : (
                <div className={styles.contributionList}>
                  {allContributions.map((contribution) => {
                    const overflow = contribution.message.length - layoutProfile.maxChars;
                    const isTooLong = overflow > 0;

                    return (
                      <article
                        key={contribution.id}
                        className={`${styles.contributionCard} ${isTooLong ? styles.contributionCardWarn : ""}`}
                      >
                        <div className={styles.contributionHeader}>
                          <div className={styles.contributionIdentity}>
                            <span className={styles.author}>{contribution.authorName}</span>
                            {contribution.authorRole ? <span className={styles.meta}>· {contribution.authorRole}</span> : null}
                          </div>

                          <div className={styles.badgeRow}>
                            <span className={styles.sortBadge}>#{contribution.sortOrder + 1}</span>
                            <span className={styles.sortBadge} title="Символы / лимит">
                              {contribution.message.length} / {layoutProfile.maxChars}
                            </span>
                            <span className={styles.statusBadge}>{contribution.status}</span>
                          </div>
                        </div>

                        <div className={styles.contributionSummary}>
                          <span className={isTooLong ? styles.limitWarning : styles.limitOk}>
                            {isTooLong
                              ? `Нужно сократить на ${overflow} символов`
                              : "Карточка укладывается в текущий формат"}
                          </span>
                        </div>

                        <ContributionEditor
                          contributionId={contribution.id}
                          manageToken={manageToken}
                          initialMessage={contribution.message}
                          messageLimit={layoutProfile.maxChars}
                        />

                        <div className={styles.controls}>
                          <form action={moveContributionAction}>
                            <input type="hidden" name="manageToken" value={manageToken} />
                            <input type="hidden" name="contributionId" value={contribution.id} />
                            <input type="hidden" name="direction" value="up" />
                            <button type="submit" className={styles.secondaryButton}>
                              Выше
                            </button>
                          </form>
                          <form action={moveContributionAction}>
                            <input type="hidden" name="manageToken" value={manageToken} />
                            <input type="hidden" name="contributionId" value={contribution.id} />
                            <input type="hidden" name="direction" value="down" />
                            <button type="submit" className={styles.secondaryButton}>
                              Ниже
                            </button>
                          </form>
                          <form action={setContributionStatusAction}>
                            <input type="hidden" name="manageToken" value={manageToken} />
                            <input type="hidden" name="contributionId" value={contribution.id} />
                            <input type="hidden" name="status" value="visible" />
                            <button type="submit" className={styles.button}>
                              Показать
                            </button>
                          </form>
                          <form action={setContributionStatusAction}>
                            <input type="hidden" name="manageToken" value={manageToken} />
                            <input type="hidden" name="contributionId" value={contribution.id} />
                            <input type="hidden" name="status" value="hidden" />
                            <button type="submit" className={styles.secondaryButton}>
                              Скрыть
                            </button>
                          </form>
                          <form action={setContributionStatusAction}>
                            <input type="hidden" name="manageToken" value={manageToken} />
                            <input type="hidden" name="contributionId" value={contribution.id} />
                            <input type="hidden" name="status" value="deleted" />
                            <button type="submit" className={styles.dangerButton}>
                              Удалить
                            </button>
                          </form>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <div className={styles.layoutRight}>
              <MediaManager manageToken={manageToken} mediaAssets={mediaAssets} mediaLayout={mediaLayout} />

              <section className={styles.actionsCard}>
                <h2 className={styles.sectionTitle}>Быстрые ссылки</h2>
                <div className={styles.linksList}>
                  <p className={styles.line}>
                    Участники: <code>/card/{card.publicSlug}</code>
                  </p>
                  <p className={styles.line}>
                    Финальная открытка: <code>/gift/{card.finalSlug}</code>
                  </p>
                  <p className={styles.line}>
                    Все поздравления: <code>/gift/{card.finalSlug}/messages</code>
                  </p>
                </div>
              </section>

              <section className={styles.actionsCard}>
                <h2 className={styles.sectionTitle}>Подсказка для чата</h2>
                <p className={styles.previewText}>
                  Напоминание для участников: <code>{reminderText}</code>
                </p>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
