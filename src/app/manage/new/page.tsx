import Link from "next/link";
import { startCardFromShowcaseAction } from "@/app/home-actions";
import styles from "./page.module.css";

export const metadata = {
  title: "Новая открытка"
};

export default function NewManagedCardPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="new-card-title">
        <p className={styles.eyebrow}>Новая открытка</p>
        <h1 id="new-card-title">Начните с управления открыткой</h1>
        <p className={styles.copy}>
          Создадим пустой черновик и сразу откроем рабочее пространство: данные получателя, поздравления, фото и подарок.
        </p>
        <form action={startCardFromShowcaseAction}>
          <button type="submit" className={styles.primaryButton}>Открыть управление</button>
        </form>
        <Link href="/" className={styles.backLink}>Вернуться на главную</Link>
      </section>
    </main>
  );
}
