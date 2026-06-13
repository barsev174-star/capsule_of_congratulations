import { CreateCardForm } from "./create-form";
import styles from "./create-form.module.css";

export default function CreatePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.lead}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Блок 2 — создание открытки</p>
            <h1 className={styles.title}>Создайте черновик групповой открытки за один проход</h1>
            <p className={styles.subtitle}>
              Мы начинаем с трех сценариев: для учителя, воспитателя и коллеги. В этом блоке важно
              проверить, что организатор без регистрации понимает форму, выбирает стиль и сразу получает
              рабочие ссылки.
            </p>
          </div>

          <div className={styles.tipCard}>
            <h2>Что уже сделано в проекте</h2>
            <ul>
              <li>Поднят каркас приложения на Next.js и TypeScript.</li>
              <li>Настроены тесты и базовое структурированное логирование.</li>
              <li>Зафиксированы 4 шаблона первой версии.</li>
            </ul>
          </div>
        </section>

        <CreateCardForm />
      </div>
    </main>
  );
}
