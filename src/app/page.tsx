import Link from "next/link";
import { cardTemplates } from "@/lib/cards/templates";
import { startCardFromShowcaseAction } from "./home-actions";
import styles from "./page.module.css";

const highlights = [
  {
    title: "Создать без хаоса",
    text: "Один человек собирает открытку, остальные просто переходят по ссылке и оставляют теплые слова без бесконечных сообщений в чате."
  },
  {
    title: "Собрать красиво",
    text: "Шаблон выбирается уже после структуры, поэтому можно спокойно посмотреть все варианты и не бояться ошибиться на старте."
  },
  {
    title: "Подарить как событие",
    text: "Получатель открывает не набор карточек, а цельную цифровую открытку с атмосферой, ритмом и ощущением общего подарка."
  }
];

const steps = [
  "Нажмите «Создать открытку» и сразу попадите в экран управления новым черновиком.",
  "Заполните основу открытки, выберите структуру, сетку поздравлений и шаблон среди всех вариантов.",
  "Позовите участников, соберите поздравления и откройте финальную открытку."
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Витрина групповой открытки</p>
          <h1 className={styles.title}>Онлайн-открытка, которую хочется не просто прочитать, а подарить</h1>
          <p className={styles.subtitle}>
            Сначала смысл, потом структура, потом стиль. Без отдельного промежуточного экрана создания и без раннего
            выбора шаблона, который мешает и ограничивает.
          </p>
          <div className={styles.actions}>
            <form action={startCardFromShowcaseAction}>
              <button type="submit" className={styles.primaryAction}>
                Создать открытку
              </button>
            </form>
            <Link href="/roadmap" className={styles.secondaryAction}>
              Посмотреть этапы
            </Link>
          </div>
        </section>

        <section className={styles.previewSection} aria-label="Примеры готовых открыток">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Примеры</p>
            <h2 className={styles.sectionTitle}>Готовые темы, между которыми можно выбирать уже внутри управления</h2>
          </div>

          <div className={styles.previewGrid}>
            {cardTemplates.map((template) => (
              <article key={template.id} className={styles.previewCard}>
                <div className={styles.previewSwatch} style={{ background: template.accent }} />
                <h3 className={styles.cardTitle}>{template.name}</h3>
                <p className={styles.cardText}>{template.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.grid} aria-label="Ценность продукта">
          {highlights.map((item) => (
            <article key={item.title} className={styles.card}>
              <h2 className={styles.cardTitle}>{item.title}</h2>
              <p className={styles.cardText}>{item.text}</p>
            </article>
          ))}
        </section>

        <section className={styles.stepsSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Как это работает</p>
            <h2 className={styles.sectionTitle}>Путь стал короче и понятнее</h2>
          </div>

          <div className={styles.stepsGrid}>
            {steps.map((step, index) => (
              <article key={step} className={styles.stepCard}>
                <span className={styles.stepNumber}>0{index + 1}</span>
                <p className={styles.cardText}>{step}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
