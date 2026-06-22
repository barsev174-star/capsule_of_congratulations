import { notFound } from "next/navigation";
import { getCardDraftByPublicSlug, listContributionsByCardId } from "@/lib/cards/repository";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import { ParticipantForm } from "./participant-form";
import styles from "./participant-page.module.css";

type Props = {
  params: Promise<{
    publicSlug: string;
  }>;
};

export default async function ParticipantCardPage({ params }: Props) {
  const { publicSlug } = await params;
  const card = await getCardDraftByPublicSlug(publicSlug);

  if (!card) {
    notFound();
  }

  const contributions = await listContributionsByCardId(card.id);
  const layoutProfile = getFinalCardMessageLayoutProfile(card.finalMessageSettings?.layoutMode ?? "grid-2");
  const recipientName = card.recipientName || "дорогого человека";
  const fromLabel = card.fromLabel || "группы";
  const occasionText = card.occasionText || "повод пока уточняется";
  const isClosed = card.status === "closed";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Ссылка для участников</p>
          <h1 className={styles.title}>Собираем открытку для {recipientName}</h1>
          <p className={styles.subtitle}>
            Открытку уже создали от группы <strong>{fromLabel}</strong>. Здесь можно добавить личное поздравление,
            которое увидят организатор и получатель.
          </p>
          <div className={styles.stats}>
            <div className={styles.stat}>Повод: {occasionText}</div>
            <div className={styles.stat}>Уже собрано: {contributions.length}</div>
            <div className={styles.stat}>Шаблон: {card.templateId}</div>
            <div className={styles.stat}>Лимит для текущего формата: {layoutProfile.maxChars} символов</div>
            {card.eventDate ? <div className={styles.stat}>Дата события: {card.eventDate}</div> : null}
          </div>
        </section>

        <div className={styles.layout}>
          {isClosed ? (
            <section className={styles.formCard}>
              <h2 className={styles.sectionTitle}>Сбор поздравлений закрыт</h2>
              <p className={styles.hint}>
                Организатор уже завершил сбор материалов для этой открытки. Спасибо, что заглянули по ссылке.
              </p>
            </section>
          ) : (
            <ParticipantForm
              cardId={card.id}
              publicSlug={publicSlug}
              recipientName={recipientName}
              occasionText={occasionText}
              messageLimit={layoutProfile.maxChars}
            />
          )}

          <section className={styles.listCard}>
            <h2 className={styles.sectionTitle}>Что уже добавили</h2>
            <p className={styles.hint}>
              Повод открытки: <strong>{occasionText}</strong>. Ниже видны уже опубликованные поздравления, чтобы можно
              было не повторяться.
            </p>

            {contributions.length === 0 ? (
              <p className={styles.empty}>Пока поздравлений нет. Можно стать первым человеком, который добавит теплые слова.</p>
            ) : (
              <div className={styles.list}>
                {contributions.map((contribution) => (
                  <article key={contribution.id} className={styles.listItem}>
                    <div className={styles.listHeader}>
                      <span className={styles.author}>{contribution.authorName}</span>
                      {contribution.authorRole ? <span className={styles.role}>· {contribution.authorRole}</span> : null}
                    </div>
                    <p className={styles.message}>{contribution.message}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
