import Image from "next/image";
import Link from "next/link";
import { startCardFromShowcaseAction } from "../home-actions";
import { getLandingAsset, landingAssetPaths } from "./landing-assets";
import styles from "./hero-section.module.css";

const chips = ["Без регистрации", "За 5 минут", "Красиво на любом устройстве"];

export function HeroSection() {
  const heroMainSrc = getLandingAsset(landingAssetPaths.heroMain);
  const heroDecorSrc = getLandingAsset(landingAssetPaths.heroDecor);

  return (
    <section className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.content}>
          <p className={styles.eyebrow}>Тёплые онлайн-открытки от близких</p>
          <h1 className={`${styles.title} text-balance`}>
            Соберите открытку от всех — тёплый подарок, который хочется сохранить
          </h1>
          <p className={`${styles.subtitle} text-pretty`}>
            Создайте открытку, отправьте ссылку друзьям, коллегам или родителям — каждый добавит свои слова, а получатель откроет красивый общий подарок.
          </p>

          <div className={styles.actions}>
            <form action={startCardFromShowcaseAction}>
              <button type="submit" className={styles.primaryAction}>
                Создать открытку
              </button>
            </form>
            <Link href="#templates" className={styles.secondaryAction}>
              Посмотреть примеры
            </Link>
          </div>

          <div className={styles.chips}>
            {chips.map((chip) => (
              <span key={chip} className={styles.chip}>
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.visual} aria-hidden="true">
          {heroMainSrc ? (
            <div className={styles.assetWrap}>
              <Image
                src={heroMainSrc}
                alt=""
                width={1536}
                height={1024}
                className={styles.heroAsset}
                priority
                sizes="(max-width: 1023px) 90vw, 520px"
              />
              {heroDecorSrc ? (
                <Image
                  src={heroDecorSrc}
                  alt=""
                  width={1536}
                  height={1024}
                  className={styles.heroDecor}
                  sizes="(max-width: 1023px) 90vw, 520px"
                />
              ) : null}
            </div>
          ) : (
            <div className={styles.composition}>
              {/* Decorative background glow */}
              <div className={styles.glow} />

              {/* Gift card with recipient name */}
              <div className={styles.giftCard}>
                <span className={styles.giftCardHeart}>♥</span>
                <p className={styles.giftCardName}>Кристина Сергеевна</p>
                <p className={styles.giftCardOccasion}>С Днём Рождения!</p>
              </div>

              {/* Main envelope */}
              <div className={styles.envelope}>
                <div className={styles.envelopeBack} />
                <div className={styles.envelopeLetter}>
                  <span className={styles.letterHeart}>♥</span>
                  <div className={styles.letterLines}>
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <div className={styles.envelopeFlapLeft} />
                <div className={styles.envelopeFlapRight} />
                <div className={styles.envelopeFlapBottom} />
                <div className={styles.envelopeSeal}>♥</div>
              </div>

              {/* Floating greeting note cards */}
              <div className={styles.noteCardTop}>
                <span className={styles.noteHeart}>♥</span>
                <p className={styles.noteText}>Спасибо за ваше тепло и поддержку!</p>
                <span className={styles.noteAuthor}>от коллег</span>
              </div>

              <div className={styles.noteCardRight}>
                <span className={styles.noteHeart}>♥</span>
                <p className={styles.noteText}>Желаем здоровья, радости и счастливых моментов!</p>
                <span className={styles.noteAuthor}>от 5 класса</span>
              </div>

              {/* Photo polaroid */}
              <div className={styles.polaroid}>
                <div className={styles.polaroidFrame}>
                  <div className={styles.polaroidPhoto}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                </div>
                <p className={styles.polaroidCaption}>Наши моменты ♡</p>
              </div>

              {/* Decorative elements */}
              <span className={`${styles.decor} ${styles.decorHeart1}`}>♡</span>
              <span className={`${styles.decor} ${styles.decorHeart2}`}>♥</span>
              <span className={`${styles.decor} ${styles.decorSparkle1}`}>✦</span>
              <span className={`${styles.decor} ${styles.decorSparkle2}`}>✦</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
