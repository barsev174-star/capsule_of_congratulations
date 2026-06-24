import { notFound } from "next/navigation";
import { getCardDraftByPublicSlug, listContributionsByCardId } from "@/lib/cards/repository";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import { ParticipantForm } from "@/app/card/[publicSlug]/participant-form";
import styles from "@/app/card/[publicSlug]/participant-page.module.css";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function JoinCardPage({ params }: Props) {
  const { slug } = await params;
  const card = await getCardDraftByPublicSlug(slug);

  if (!card) {
    notFound();
  }

  const contributions = await listContributionsByCardId(card.id);
  const layoutProfile = getFinalCardMessageLayoutProfile(card.finalMessageSettings?.layoutMode ?? "grid-2");
  const recipientName = card.recipientName || "дорогого человека";
  const fromLabel = card.fromLabel || "команды";
  const occasionText = card.occasionText || "повод пока уточняется";
  const isClosed = card.status === "closed";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Дари слова</p>
          <h1 className={styles.title}>Добавьте теплые слова для {recipientName}</h1>
          <p className={styles.subtitle}>
            Организатор уже подготовил открытку от <strong>{fromLabel}</strong>. Напишите коротко и по-настоящему:
            ваше поздравление попадет в общий подарок и не потеряется в чате.
          </p>
          <div className={styles.stats}>
            <div className={styles.stat}>Повод: {occasionText}</div>
            <div className={styles.stat}>Уже добавили: {contributions.length}</div>
            <div className={styles.stat}>Формат: {card.templateId}</div>
            <div className={styles.stat}>Лучше до {layoutProfile.maxChars} символов</div>
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
              publicSlug={slug}
              recipientName={recipientName}
              occasionText={occasionText}
              messageLimit={layoutProfile.maxChars}
            />
          )}

          <section className={styles.listCard}>
            <h2 className={styles.sectionTitle}>Уже есть в открытке</h2>
            <p className={styles.hint}>
              Повод открытки: <strong>{occasionText}</strong>. Посмотрите, что уже написали другие, и добавьте свой
              личный штрих.
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
                    <p>{contribution.message}</p>
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
