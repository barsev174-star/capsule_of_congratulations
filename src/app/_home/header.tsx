import Link from "next/link";
import { startCardFromShowcaseAction } from "../home-actions";
import styles from "./header.module.css";

const navItems = [
  { href: "#how-it-works", label: "Как это работает" },
  { href: "#cases", label: "Случаи" },
  { href: "#templates", label: "Примеры" },
  { href: "#faq", label: "FAQ" },
  { href: "/account", label: "Мои открытки" }
];

export function HomeHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.shell}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark} aria-hidden="true">
            ♡
          </span>
          <span className={styles.logoLockup}>
            <span className={styles.logoText}>Дари слова</span>
            <span className={styles.logoTagline}>тёплые открытки от близких</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Главная навигация">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
        </nav>

        <form action={startCardFromShowcaseAction} className={styles.ctaForm}>
          <button type="submit" className={styles.ctaButton}>
            Создать открытку
          </button>
        </form>
      </div>
    </header>
  );
}
