import { notFound } from "next/navigation";
import { getCardDraftByPublicSlug, listContributionsByCardId } from "@/lib/cards/repository";
import { ParticipantForm } from "./participant-form";
import styles from "./participant-page.module.css";

type Props = {
  params: Promise<{
    publicSlug: string;
  }>;
};

const occasionLabel: Record<string, string> = {
  teacher: "учителю",
  caregiver: "воспитателю",
  colleague: "коллеге"
};

export default async function ParticipantCardPage({ params }: Props) {
  const { publicSlug } = await params;
  const card = await getCardDraftByPublicSlug(publicSlug);

  if (!card) {
    notFound();
  }

  const contributions = await listContributionsByCardId(card.id);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Ссылка для участников</p>
          <h1 className={styles.title}>Собираем поздравление {occasionLabel[card.occasion]} для {card.recipientName}</h1>
          <p className={styles.subtitle}>
            Организатор уже создал открытку от группы <strong>{card.fromLabel}</strong>. Здесь можно добавить
            личное поздравление, которое увидят организатор и получатель открытки.
          </p>
          <div className={styles.stats}>
            <div className={styles.stat}>Уже собрано: {contributions.length}</div>
            <div className={styles.stat}>Шаблон: {card.templateId}</div>
            {card.eventDate ? <div className={styles.stat}>Дата события: {card.eventDate}</div> : null}
          </div>
        </section>

        <div className={styles.layout}>
          <ParticipantForm
            cardId={card.id}
            publicSlug={publicSlug}
            recipientName={card.recipientName}
            occasion={card.occasion}
          />

          <section className={styles.listCard}>
            <h2 className={styles.sectionTitle}>Что уже добавили</h2>
            <p className={styles.hint}>
              Сейчас участники видят уже отправленные теплые слова. AI-помощник уже подключен как черновик
              генерации, а дальше будем делать его умнее и тоньше.
            </p>

            {contributions.length === 0 ? (
              <p className={styles.empty}>
                Пока еще нет поздравлений. Можно стать первым человеком, который добавит теплые слова.
              </p>
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
