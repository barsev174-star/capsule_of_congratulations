import Image from "next/image";
import Link from "next/link";
import { startCardFromShowcaseAction } from "../home-actions";
import { getLandingAsset, landingAssetPaths } from "./landing-assets";
import styles from "./hero-section.module.css";

const chips = [
  { text: "Без регистрации", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )},
  { text: "Сбор бесплатно", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )},
  { text: "Оплата только перед вручением", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )}
];

export function HeroSection() {
  const heroMainSrc = getLandingAsset(landingAssetPaths.heroMain);
  const heroDecorSrc = getLandingAsset(landingAssetPaths.heroDecor);

  return (
    <section id="hero" className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.content}>
          <p className={styles.eyebrow}>Тёплые онлайн-открытки от близких</p>
          <h1 className={`${styles.title} text-balance`}>
            <span className={styles.titleLine}>Соберите открытку от всех —</span>{" "}
            <span className={styles.titleLine}>тёплый подарок, который</span>{" "}
            <span className={styles.titleLine}>хочется сохранить</span>
          </h1>
          <p className={`${styles.subtitle} text-pretty`}>
            Создайте открытку, отправьте ссылку участникам, соберите тёплые слова и передайте получателю красивый общий подарок.
          </p>

          <div className={styles.actions}>
            <form action={startCardFromShowcaseAction}>
              <button type="submit" className={styles.primaryAction}>
                Создать открытку
              </button>
            </form>
            <Link href="/example" className={styles.secondaryAction}>
              Посмотреть, как это выглядит
            </Link>
          </div>

          <div className={styles.chips}>
            {chips.map((chip) => (
              <span key={chip.text} className={styles.chip}>
                {chip.icon}
                {chip.text}
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
                width={1019}
                height={868}
                className={styles.heroAsset}
                priority
                sizes="(max-width: 1023px) 90vw, 540px"
              />
              {heroDecorSrc ? (
                <Image
                  src={heroDecorSrc}
                  alt=""
                  width={1280}
                  height={853}
                  className={styles.heroDecor}
                  sizes="(max-width: 1023px) 90vw, 540px"
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
              <span className={`${styles.decor} ${styles.decorSparkle1}`}>✶</span>
              <span className={`${styles.decor} ${styles.decorSparkle2}`}>✶</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
