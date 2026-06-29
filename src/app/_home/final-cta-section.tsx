import Image from "next/image";
import { startCardFromShowcaseAction } from "../home-actions";
import { getLandingAsset, landingAssetPaths } from "./landing-assets";
import styles from "./final-cta-section.module.css";

export function FinalCtaSection() {
  const ctaEnvelopeSrc = getLandingAsset(landingAssetPaths.ctaEnvelope);

  return (
    <section className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.card}>
          <div className={styles.decorLeft} aria-hidden="true">
            {ctaEnvelopeSrc ? (
              <Image src={ctaEnvelopeSrc} alt="" width={120} height={120} className={styles.decorImage} />
            ) : (
              <div className={styles.decorEnvelope}>
                <span>♥</span>
              </div>
            )}
          </div>

          <div className={styles.decorRight} aria-hidden="true">
            <span className={styles.decorHeart}>♡</span>
            <span className={styles.decorSparkle}>✦</span>
          </div>

          <h2 className={`${styles.title} text-balance`}>
            Соберите первую открытку уже сейчас
          </h2>
          <p className={styles.subtitle}>
            Собрать открытку можно бесплатно. Оплата нужна только для публикации финальной ссылки.
          </p>
          <form action={startCardFromShowcaseAction}>
            <button type="submit" className={styles.ctaButton}>
              Создать открытку
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </form>
          <p className={styles.hint}>Это займёт меньше минуты</p>
        </div>
      </div>
    </section>
  );
}
