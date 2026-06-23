import Link from "next/link";
import { CreateCardForm } from "./create-form";
import styles from "./create-form.module.css";

export default function CreatePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.lead}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Создание открытки</p>
            <h1 className={styles.title}>Сначала основа, потом оформление</h1>
            <p className={styles.subtitle}>
              Заполните несколько базовых полей. После этого откроется управление открыткой: ссылки, поздравления,
              фото, предпросмотр и финальный подарок.
            </p>
            <Link href="/" className={styles.backLink}>
              Вернуться на лендинг
            </Link>
          </div>
        </section>

        <CreateCardForm />
      </div>
    </main>
  );
}
