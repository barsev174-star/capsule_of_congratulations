import Link from "next/link";
import styles from "./footer.module.css";

export function HomeFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <strong>Дари слова<span aria-hidden="true">♡</span></strong>
          <p>Тёплые открытки от близких</p>
        </div>
        <nav aria-label="Служебные ссылки">
          <Link href="/account">Мои открытки</Link>
          <Link href="/support?from=landing">Поддержка и предложения</Link>
        </nav>
      </div>
    </footer>
  );
}
