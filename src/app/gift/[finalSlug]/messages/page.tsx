import Link from "next/link";
import { notFound } from "next/navigation";
import { listCardDrafts, listContributionsByCardId } from "@/lib/cards/repository";
import { getGiftPath } from "@/lib/routes/card-links";
import styles from "./page.module.css";

type Props = {
  params: Promise<{
    finalSlug: string;
  }>;
};

export default async function GiftMessagesPage({ params }: Props) {
  const { finalSlug } = await params;
  const cards = await listCardDrafts();
  const card = cards.find((item) => item.finalSlug === finalSlug);

  if (!card) {
    notFound();
  }

  const contributions = await listContributionsByCardId(card.id);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Все поздравления в одном месте</p>
          <h1 className={styles.title}>Сообщения для {card.recipientName}</h1>
          <p className={styles.subtitle}>
            Здесь удобно читать все поздравления подряд без остальных блоков открытки.
          </p>
          <div className={styles.heroMeta}>
            <span className={styles.pill}>{contributions.length} сообщений</span>
            <span className={styles.pill}>{card.occasionText}</span>
          </div>
          <Link href={getGiftPath(card.finalSlug)} className={styles.backLink}>
            Вернуться к открытке
          </Link>
        </section>

        <section className={styles.list}>
          {contributions.map((item, index) => (
            <article key={item.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.author}>{item.authorName}</span>
                  {item.authorRole ? <span className={styles.role}> · {item.authorRole}</span> : null}
                </div>
                <span className={styles.index}>#{index + 1}</span>
              </div>
              <p className={styles.message}>{item.message}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
