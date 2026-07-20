import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import styles from "./footer.module.css";

export function HomeFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <section className={styles.brandColumn}>
          <BrandLogo />
          <p className={styles.tagline}>Групповые онлайн-открытки,<br />поздравления и подарки</p>
          <p className={styles.details}>Исполнитель: Барыкина Кристина Сергеевна<br />Плательщик НПД · ИНН 745210969451<br />г. Челябинск</p>
        </section>
        <nav className={styles.column} aria-label="Сервис">
          <h2>Сервис</h2>
          <Link href="/account">Мои открытки</Link>
          <Link href="/create">Создать открытку</Link>
          <Link href="/example">Пример открытки</Link>
        </nav>
        <section className={styles.column} aria-labelledby="footer-support">
          <h2 id="footer-support">Поддержка</h2>
          <a className={styles.contactLink} href="mailto:support@slovesto.ru">
            <span className={styles.contactIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4.5 7 7.5 5.7L19.5 7" /></svg></span>
            <span>support@slovesto.ru</span>
          </a>
          <a className={styles.contactLink} href="https://t.me/barsev174">
            <span className={styles.contactIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m20.4 4.7-3 14.1c-.2 1-1 1.3-1.8.8l-4.6-3.4-2.2 2.1c-.2.2-.4.4-.8.4l.3-4.7 8.6-7.8c.4-.3-.1-.5-.5-.2l-10.6 6.7-4.5-1.4c-1-.3-1-1 .2-1.5L19.1 3c.8-.3 1.6.2 1.3 1.7Z" /></svg></span>
            <span>Telegram</span>
          </a>
          <p className={styles.replyTime}>Обычно отвечаем в течение рабочего дня</p>
        </section>
        <nav className={styles.column} aria-label="Документы">
          <h2>Документы</h2>
          <Link href="/offer">Публичная оферта</Link>
          <Link href="/privacy">Политика обработки данных</Link>
          <Link href="/refunds">Правила возврата</Link>
        </nav>
      </div>
      <div className={styles.bottomLine}>
        <span>© 2026 Slovesto</span>
        <span>Место, где слова становятся подарком</span>
      </div>
    </footer>
  );
}
