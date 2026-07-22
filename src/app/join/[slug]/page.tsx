import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { getCardDraftByPublicSlug, listAllContributionsByCardId, listContributionsByCardId } from "@/lib/cards/repository";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import { ParticipantForm } from "@/app/card/[publicSlug]/participant-form";
import { ContributionsStrip } from "@/app/card/[publicSlug]/contributions-strip";
import { EventReminderForm } from "./reminder-form";
import { getMinimumReminderEventDate } from "@/lib/reminders/validation";
import styles from "@/app/card/[publicSlug]/participant-page.module.css";
import { JourneyEvent } from "@/components/telemetry/journey-event";
import { CARD_CONTRIBUTION_LIMIT } from "@/lib/contributions/limits";
import { getCardLifecycleByPublicSlug } from "@/lib/cards/lifecycle-repository";

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

export default async function JoinCardPage({ params }: Props) {
  const { slug } = await params;
  const [card, lifecycle] = await Promise.all([getCardDraftByPublicSlug(slug), getCardLifecycleByPublicSlug(slug)]);

  if (!card || !lifecycle || lifecycle.collectionStatus === "DRAFT" || lifecycle.purgedAt !== null) {
    notFound();
  }

  const [contributions, allContributions] = await Promise.all([
    listContributionsByCardId(card.id),
    listAllContributionsByCardId(card.id)
  ]);
  const contributionCount = allContributions.filter((item) => item.status !== "deleted").length;
  const layoutProfile = getFinalCardMessageLayoutProfile(card.finalMessageSettings?.layoutMode ?? "grid-2");
  const recipientName = card.recipientName || "дорогого человека";
  const fromLabel = card.fromLabel?.trim();
  const occasionText = card.occasionText || "повод пока уточняется";
  const isClosed = lifecycle.collectionStatus !== "OPEN" || lifecycle.deliveryStatus === "DELIVERED";
  const isLimitReached = contributionCount >= CARD_CONTRIBUTION_LIMIT;

  return (
    <main className={styles.page}>
      <JourneyEvent event="funnel.participant_form_opened" cardId={card.id} route="join" />
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <BrandLogo />
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
              {/* Intentional decorative asset: CSS controls its intrinsic paper composition. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.heroAsset} src="/join-envelope.png" alt="" />
            </div>
          </div>
        </section>

        <div className={styles.layout}>
          {isClosed || isLimitReached ? (
            <section className={styles.formCard}>
              <h2 className={styles.sectionTitle}>{isLimitReached ? "Открытка собрана" : "Сбор поздравлений завершён"}</h2>
              <p className={styles.hint}>
                {isLimitReached
                  ? `В открытке уже ${CARD_CONTRIBUTION_LIMIT} поздравлений — максимальное количество. Спасибо, что хотели присоединиться.`
                  : "Организатор уже готовит открытку к передаче. Добавить новое поздравление больше нельзя."}
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

          <section className={styles.contribStrip} aria-labelledby="contrib-strip-title">
            <div className={styles.contribStripHead}>
              <div className={styles.cardHeader}>
                <span className={`${styles.cardIcon} ${styles.contribPeopleIcon}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" focusable="false">
                    <circle cx="9" cy="8" r="3.25" />
                    <path d="M3.75 19c.4-3.1 2.35-5.05 5.25-5.05s4.85 1.95 5.25 5.05" />
                    <circle cx="17" cy="9" r="2.5" />
                    <path d="M15.1 14.35c.57-.27 1.2-.4 1.9-.4 2.15 0 3.72 1.35 4.05 3.6" />
                  </svg>
                </span>
                <div>
                  <h2 id="contrib-strip-title" className={styles.sectionTitle}>Уже добавили</h2>
                  <p className={styles.hint}>Открытка постепенно наполняется тёплыми словами.</p>
                </div>
              </div>
              {contributions.length > 0 ? (
                <span className={styles.contribStripCount}>{formatCount(contributions.length)}</span>
              ) : null}
            </div>

            {contributions.length === 0 ? (
              <p className={styles.empty}>Пока никто не добавил поздравление. Ваше может быть первым.</p>
            ) : (
              <ContributionsStrip
                items={contributions.map((contribution) => ({
                  id: contribution.id,
                  authorName: contribution.authorName,
                  authorRole: contribution.authorRole,
                  message: contribution.message
                }))}
              />
            )}
          </section>

          <section className={styles.valuePreview} aria-labelledby="value-preview-title">
            <div className={styles.valuePreviewCopy}>
              <p className={styles.valuePreviewEyebrow}>Готовая открытка</p>
              <h2 id="value-preview-title">Так получатель увидит общий подарок</h2>
              <p>
                Ваше поздравление станет частью красивой страницы с тёплыми словами, фото и поздравлениями от всех.
              </p>
              <Link href="/example" className={styles.valuePreviewButton}>
                Посмотреть пример открытки
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className={styles.valuePreviewVisual} aria-hidden="true">
              <div className={styles.valuePreviewPage}>
                <span className={styles.valuePreviewEvent}>С днём рождения!</span>
                <span className={styles.valuePreviewFrom}>от друзей и близких</span>
                <Image
                  className={styles.valuePreviewSeal}
                  src="/templates/scrapbook-clean/heart-sticker-puffy-gold.png"
                  alt=""
                  width={70}
                  height={70}
                />
                <Image
                  className={styles.valuePreviewFlowers}
                  src="/templates/scrapbook-clean/footer-floral-cluster.png"
                  alt=""
                  width={320}
                  height={120}
                />
              </div>
              <div className={`${styles.valuePreviewPhoto} ${styles.valuePreviewPhotoMain}`}>
                <Image src="/examples/kristina/4.jpg" alt="" fill sizes="320px" loading="eager" />
              </div>
              <div className={`${styles.valuePreviewPhoto} ${styles.valuePreviewPhotoBack}`}>
                <Image src="/examples/kristina/6.jpg" alt="" fill sizes="260px" loading="eager" />
              </div>
            </div>
          </section>

          <EventReminderForm sourceCardId={card.id} minimumEventDate={getMinimumReminderEventDate()} />

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
