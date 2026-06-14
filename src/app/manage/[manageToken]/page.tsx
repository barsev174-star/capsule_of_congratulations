import { notFound } from "next/navigation";
import {
  getCardDraftByManageToken,
  listAllContributionsByCardId,
  listContributionsByCardId
} from "@/lib/cards/repository";
import { cardTemplates } from "@/lib/cards/templates";
import { finalCardLayouts } from "@/lib/final-card/layouts";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type { FinalCardOptionalBlockId } from "@/lib/final-card/types";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";
import { buildReminderText } from "@/lib/manage/reminder";
import { BlockSettingsForm } from "./block-settings-form";
import { ContributionEditor } from "./contribution-editor";
import { moveContributionAction, setContributionStatusAction } from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  params: Promise<{
    manageToken: string;
  }>;
};

export default async function ManagePage({ params }: Props) {
  const { manageToken } = await params;
  const card = await getCardDraftByManageToken(manageToken);

  if (!card) {
    notFound();
  }

  const allContributions = await listAllContributionsByCardId(card.id);
  const visibleContributions = await listContributionsByCardId(card.id);
  const reminderText = buildReminderText(card, visibleContributions.length);
  const model = buildFinalCardViewModel(card, visibleContributions);
  const availableModel = buildFinalCardViewModel({ ...card, finalBlockSettings: null }, visibleContributions);
  const style = cardTemplates.find((template) => template.id === card.templateId)?.id ?? "warm-classic";
  const layoutProfile = getFinalCardMessageLayoutProfile(card.finalMessageSettings?.layoutMode ?? "grid-2");
  const optionalLayoutBlocks = finalCardLayouts[style].blocks.filter((block) => !block.required);

  const blockMeta: Record<FinalCardOptionalBlockId, { label: string; description: string }> = {
    summary: {
      label: "Вводный блок",
      description: "Общий контекст и короткое вступление."
    },
    qualities: {
      label: "Качества",
      description: "Ключевые слова и общее ощущение от человека."
    },
    memories: {
      label: "Моменты / фото",
      description: "Пока это место под будущий фото- или медиа-блок."
    },
    quotes: {
      label: "Лучшие фразы",
      description: "Короткие сильные выжимки из поздравлений."
    },
    "ai-summary": {
      label: "Общее поздравление",
      description: "Пока заглушка под будущий AI-блок, который резюмирует все поздравления."
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

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroTop}>
            <div>
              <p className={styles.eyebrow}>Секретная ссылка организатора</p>
              <h1 className={styles.title}>Управление открыткой для {card.recipientName}</h1>
              <p className={styles.subtitle}>
                Здесь мы собираем не просто тексты, а сам финальный подарок: порядок поздравлений, структуру экрана
                и способ, которым человек будет читать открытку.
              </p>
            </div>

            <div className={styles.heroSummary}>
              <span className={styles.heroSummaryLabel}>Финальный формат поздравлений</span>
              <strong>{card.finalMessageSettings?.layoutMode ?? "grid-2"}</strong>
              <span className={styles.heroSummaryLabel}>
                {card.finalMessageSettings?.showAllLink
                  ? "Есть отдельный экран всех поздравлений"
                  : "Без отдельного экрана"}
              </span>
            </div>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>Повод: {card.occasionText}</div>
            <div className={styles.stat}>Шаблон: {style}</div>
            <div className={styles.stat}>Всего поздравлений: {allContributions.length}</div>
            <div className={styles.stat}>Видимых: {visibleContributions.length}</div>
          </div>
        </section>

        <section className={styles.studioPanel}>
          <div className={styles.studioPanelHeader}>
            <div>
              <p className={styles.eyebrow}>Конструктор финального экрана</p>
              <h2 className={styles.sectionTitle}>Состав открытки и блок поздравлений</h2>
            </div>
            <p className={styles.studioLead}>
              Здесь главное не список настроек, а наглядная схема: что стоит выше, что ниже и как именно будет
              выглядеть центральный блок с поздравлениями.
            </p>
          </div>

          <BlockSettingsForm
            manageToken={manageToken}
            options={blockOptions}
            initialLayoutMode={card.finalMessageSettings?.layoutMode ?? "grid-2"}
            initialMediaLayout={card.finalMessageSettings?.mediaLayout ?? "portrait"}
            initialShowAllLink={card.finalMessageSettings?.showAllLink ?? true}
          />
        </section>

        <div className={styles.layout}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Поздравления</h2>
                <p className={styles.hint}>
                  Здесь редактируем текст, меняем последовательность и сразу видим, насколько каждое поздравление
                  укладывается в лимит текущей сетки.
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
                          {contribution.authorRole ? <span className={styles.meta}> · {contribution.authorRole}</span> : null}
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
              <h2 className={styles.sectionTitle}>Что видит получатель</h2>
              <div className={styles.summaryList}>
                <p className={styles.previewText}>
                  Открытка для <strong>{card.recipientName}</strong> от <strong>{card.fromLabel}</strong>.
                </p>
                <p className={styles.previewText}>
                  Повод: <strong>{card.occasionText}</strong>
                </p>
                <p className={styles.previewText}>
                  В блок поздравлений попадет <strong>{visibleContributions.length}</strong> видимых сообщений.
                </p>
                <p className={styles.previewText}>
                  Безопасный лимит для текущего формата: <strong>{layoutProfile.maxChars}</strong> символов на одно
                  поздравление.
                </p>
                <p className={styles.previewText}>
                  Напоминание для чата: <code>{reminderText}</code>
                </p>
              </div>
            </section>

            <section className={styles.actionsCard}>
              <h2 className={styles.sectionTitle}>Кратко по структуре</h2>
              <p className={styles.previewText}>
                Сейчас на финальном экране: <code>{model.blocks.map((block) => block.id).join(", ")}</code>
              </p>
              <p className={styles.previewText}>
                Основной режим поздравлений: <code>{card.finalMessageSettings?.layoutMode ?? "grid-2"}</code>
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
