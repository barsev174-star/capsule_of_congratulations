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

const formatCount = (count: number) => {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return `${count} поздравлений`;
  }

  if (last === 1) {
    return `${count} поздравление`;
  }

  if (last >= 2 && last <= 4) {
    return `${count} поздравления`;
  }

  return `${count} поздравлений`;
};

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || "Д";
const previewContributionsLimit = 6;

export default async function JoinCardPage({ params }: Props) {
  const { slug } = await params;
  const card = await getCardDraftByPublicSlug(slug);

  if (!card) {
    notFound();
  }

  const contributions = await listContributionsByCardId(card.id);
  const layoutProfile = getFinalCardMessageLayoutProfile(card.finalMessageSettings?.layoutMode ?? "grid-2");
  const recipientName = card.recipientName || "дорогого человека";
  const fromLabel = card.fromLabel?.trim();
  const occasionText = card.occasionText || "повод пока уточняется";
  const previewContributions = contributions.slice(0, previewContributionsLimit);
  const hasMoreContributions = contributions.length > previewContributionsLimit;
  const isClosed = card.status === "closed";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <div className={styles.brandLockup}>
              <span className={styles.brandText}>Дари слова</span>
              <span className={styles.brandTagline}>дарите слова красиво</span>
            </div>
            <span className={styles.brandMark}>♡</span>
          </div>
          <div className={styles.trustBadge}>
            <span className={styles.shieldIcon} aria-hidden="true" />
            <span>Ваше поздравление попадёт в общий подарок</span>
          </div>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Ваше поздравление</p>
            <h1 className={styles.title}>{recipientName}</h1>
            <p className={styles.heroSubline}>ждёт ваших тёплых слов</p>
            <p className={styles.subtitle}>
              Открытка уже готовится. Добавьте несколько тёплых слов — они станут частью общего подарка.
            </p>
            <div className={styles.stats}>
              {fromLabel ? (
                <div className={`${styles.stat} ${styles.fromStat}`}>
                  <span className={`${styles.statIcon} ${styles.senderIcon}`} aria-hidden="true" />
                  <strong>{fromLabel}</strong>
                </div>
              ) : null}
              <div className={styles.stat}>
                <span className={`${styles.statIcon} ${styles.occasionIcon}`} aria-hidden="true" />
                <strong>{occasionText}</strong>
              </div>
              <div className={styles.stat}>
                <span className={`${styles.statIcon} ${styles.peopleIcon}`} aria-hidden="true" />
                <strong>{formatCount(contributions.length)}</strong>
              </div>
              <div className={styles.stat}>
                <span className={`${styles.statIcon} ${styles.pencilIcon}`} aria-hidden="true" />
                <strong>до {layoutProfile.maxChars} символов</strong>
              </div>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.heroAssetFrame}>
              <img className={styles.heroAsset} src="/join-envelope.png" alt="" />
            </div>
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
              variant="join"
              greetingMode={process.env.AI_GREETING_MODE === "ladder" ? "ladder" : process.env.AI_GREETING_MODE === "matrix" ? "matrix" : "classic"}
            />
          )}

          <section className={styles.listCard}>
            <div className={styles.listCardTop}>
              <div className={styles.cardHeader}>
                <span className={`${styles.cardIcon} ${styles.peopleIcon}`} aria-hidden="true" />
                <div>
                  <h2 className={styles.sectionTitle}>Уже добавили</h2>
                  <p className={styles.hint}>Посмотрите, что написали другие, и добавьте свой личный штрих.</p>
                </div>
              </div>
              {hasMoreContributions ? (
                <button type="button" className={styles.showAllButton}>
                  Показать все
                  <span aria-hidden="true">›</span>
                </button>
              ) : null}
            </div>

            {contributions.length === 0 ? (
              <p className={styles.empty}>Пока никто не добавил поздравление. Ваше может быть первым.</p>
            ) : (
              <div className={styles.list}>
                {previewContributions.map((contribution) => (
                  <article key={contribution.id} className={styles.listItem}>
                    <div className={styles.listHeader}>
                      <span className={styles.avatar} aria-hidden="true">{getInitial(contribution.authorName)}</span>
                      <span>
                        <span className={styles.author}>{contribution.authorName}</span>
                        {contribution.authorRole ? <span className={styles.role}>{contribution.authorRole}</span> : null}
                      </span>
                    </div>
                    <p className={styles.listText}>{contribution.message}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className={styles.footerNote}>
            <span className={styles.footerIcon} aria-hidden="true" />
            <p>Ваши слова попадут в открытку и будут видны получателю после публикации.</p>
            <span className={styles.footerHeart} aria-hidden="true" />
          </aside>
        </div>
      </div>
    </main>
  );
}
