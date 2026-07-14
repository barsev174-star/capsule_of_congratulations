import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import styles from "./footer.module.css";

export function HomeFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <BrandLogo />
          <p>Групповые онлайн-открытки, поздравления и подарки</p>
        </div>
        <nav aria-label="Служебные ссылки">
          <Link href="/account">Мои открытки</Link>
          <Link href="/support?from=landing">Поддержка и предложения</Link>
        </nav>
      </div>
    </footer>
  );
}
