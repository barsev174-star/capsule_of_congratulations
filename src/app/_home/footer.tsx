import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AnalyticsPreferencesButton } from "@/components/analytics/yandex-metrika-consent";
import { FooterGroup } from "./footer-group";
import styles from "./footer.module.css";

export function HomeFooter({ variant = "default" }: { variant?: "default" | "neutral" }) {
  return (
    <footer className={`${styles.footer} ${variant === "neutral" ? styles.neutral : ""}`}>
      <div className={styles.inner}>
        <section className={styles.brandColumn}>
          <BrandLogo />
          <p className={styles.tagline}>Групповые онлайн-открытки,<br />поздравления и подарки</p>
          <p className={styles.details}>Исполнитель: Барыкина Кристина Сергеевна<br />Плательщик НПД · ИНН 745210969451<br />г. Челябинск</p>
        </section>
        <FooterGroup title="Сервис">
          <nav className={styles.groupNav} aria-label="Сервис">
            <Link href="/account">Мои открытки</Link>
            <Link href="/create" data-home-action="create" data-home-placement="footer">Создать открытку</Link>
            <Link href="/example" data-home-action="example" data-home-placement="footer">Пример открытки</Link>
          </nav>
        </FooterGroup>
        <FooterGroup
          title="Поддержка"
          pinned={
            <a className={styles.contactLink} href="mailto:support@slovesto.ru">
              <span className={styles.contactIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4.5 7 7.5 5.7L19.5 7" /></svg></span>
              <span>support@slovesto.ru</span>
            </a>
          }
        >
          <p className={styles.replyTime}>Обычно отвечаем в течение рабочего дня</p>
        </FooterGroup>
        <FooterGroup title="Документы">
          <nav className={styles.groupNav} aria-label="Документы">
            <Link href="/offer">Публичная оферта</Link>
            <Link href="/privacy">Политика обработки данных</Link>
            <Link href="/refunds">Правила возврата</Link>
            <AnalyticsPreferencesButton className={styles.analyticsButton} />
          </nav>
        </FooterGroup>
      </div>
      <div className={styles.bottomLine}>
        <span>© 2026 Slovesto</span>
        <span>Место, где слова становятся подарком</span>
      </div>
    </footer>
  );
}
