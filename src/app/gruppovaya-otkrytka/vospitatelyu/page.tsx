import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { FaqSection, HomeFooter, HomeHeader } from "@/app/_home";
import { TeacherLandingMotion } from "../uchitelyu/teacher-landing-motion";
import sharedStyles from "../uchitelyu/page.module.css";
import {
  caregiverCardContents,
  caregiverDemoStory,
  caregiverFaqs,
  caregiverOccasions,
  caregiverSteps,
  getCaregiverHeroNote
} from "./caregiver-landing-content";
import {
  CaregiverCreateForm,
  CaregiverExampleLink,
  CaregiverLandingTracker
} from "./caregiver-landing-client";
import styles from "./page.module.css";

const landingPath = "/gruppovaya-otkrytka/vospitatelyu";
const landingUrl = `https://slovesto.ru${landingPath}`;
const title = "Групповая онлайн-открытка воспитателю от группы — Slovesto";
const description = "Соберите по одной ссылке тёплые слова родителей и детей, добавьте фотографии группы и подарите воспитателю общую онлайн-открытку. Создание бесплатно, вручение — 399 ₽.";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: landingPath },
  openGraph: {
    title,
    description,
    url: landingPath,
    images: [{
      url: "/landing/caregiver/og-kindergarten-doodles.webp",
      width: 1200,
      height: 630,
      alt: "Slovesto — общая онлайн-открытка воспитателю от родителей и детей"
    }]
  }
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: "https://slovesto.ru/" },
      { "@type": "ListItem", position: 2, name: "Открытка воспитателю от группы", item: landingUrl }
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: caregiverFaqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer }
    }))
  }
];

const revealDelay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

const stepIcons = [
  <svg key="create" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  <svg key="link" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7.1 0l2.8-2.8a5 5 0 0 0-7-7L11.5 5.5" /><path d="M14 10a5 5 0 0 0-7.1 0l-2.8 2.8a5 5 0 0 0 7 7l1.4-1.3" /></svg>,
  <svg key="words" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="4" y="5" width="16" height="12" rx="3" /><path d="M8.5 9.5h7M8.5 12.8h4.5" /></svg>,
  <svg key="gift" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="9.5" width="16" height="10.5" rx="2" /><path d="M12 9.5V20M4 13.8h16" /><path d="M12 9.5C8.6 9.5 8.3 5.6 10.6 5.2c1.6-.3 1.4 2.6 1.4 4.3Zm0 0c3.4 0 3.7-3.9 1.4-4.3-1.6-.3-1.4 2.6-1.4 4.3Z" /></svg>
];

const priceArrow = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15" /><path d="m13.5 6 6 6-6 6" /></svg>
);

const heroNotes = [
  { role: "От ребёнка", text: "Спасибо, что учите нас дружить" },
  { role: "От семьи", text: "Рядом с Вами ребёнку спокойно" },
  { role: "Общий момент", text: "Наш первый весёлый утренник" }
] as const;

const heroNoteClasses = [
  sharedStyles.heroNoteStudent,
  sharedStyles.heroNoteParent,
  sharedStyles.heroNoteStudentSecond
];

const memories = [
  {
    title: "Фраза, которую сказал ребёнок",
    text: "Простые детские слова часто становятся самой трогательной частью общего подарка."
  },
  {
    title: "История, которую помнит семья",
    text: "Первые дни в садике, маленькая победа или забота, которую родители особенно ценят."
  },
  {
    title: "Фотография общего момента",
    text: "Праздники, прогулки и занятия сохраняют живую память о времени группы вместе."
  }
] as const;

const photoMoments = [
  { src: "/examples/kindergarten-doodles/create-together-v2.png", alt: "Дети и воспитатель вместе занимаются творчеством", caption: "Творим и открываем новое" },
  { src: "/examples/kindergarten-doodles/small-discoveries-v2.png", alt: "Воспитатель помогает ребёнку во время занятия", caption: "Маленькие открытия каждый день" },
  { src: "/examples/kindergarten-doodles/friendly-group-v2.png", alt: "Дружная группа детей вместе с воспитателем", caption: "Одна большая дружная группа" }
] as const;

export default function CaregiverLandingPage() {
  const heroNote = getCaregiverHeroNote();

  return (
    <div className={`${sharedStyles.page} ${styles.caregiverPage}`} data-teacher-landing data-caregiver-landing>
      <CaregiverLandingTracker />
      <TeacherLandingMotion />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <HomeHeader variant="caregiver" />

      <main>
        <div className={sharedStyles.breadcrumbWrap}>
          <nav className={sharedStyles.breadcrumb} aria-label="Хлебные крошки">
            <Link href="/">Главная</Link>
            <span aria-hidden="true">→</span>
            <span aria-current="page">Открытка воспитателю от группы</span>
          </nav>
        </div>

        <section className={`${sharedStyles.section} ${sharedStyles.hero}`} aria-labelledby="caregiver-landing-title">
          <div className={`${sharedStyles.shell} ${sharedStyles.heroGrid}`}>
            <div className={sharedStyles.heroCopy}>
              <p className={sharedStyles.eyebrow}>Открытка от всей группы — слова родителей и детей</p>
              <h1 id="caregiver-landing-title">Онлайн&#8209;открытка воспитателю от родителей и детей</h1>
              <p className={sharedStyles.heroText}>Соберите по одной ссылке слова каждой семьи и фотографии группы — получится общий подарок о времени, которое воспитатель прожил рядом с детьми.</p>
              <div className={sharedStyles.heroActions}>
                <CaregiverCreateForm placement="hero" buttonClassName={sharedStyles.primaryButton}>Собрать открытку воспитателю</CaregiverCreateForm>
                <CaregiverExampleLink className={sharedStyles.secondaryButton}>Посмотреть пример</CaregiverExampleLink>
              </div>
              <p className={sharedStyles.trustLine}>Без регистрации · До 100 поздравлений · Приватная ссылка для вручения</p>
              <p className={sharedStyles.trustLinePrice}>Сбор и просмотр бесплатно · 399 ₽ за всю открытку, не за каждого участника</p>
            </div>

            <div className={sharedStyles.heroVisual} data-teacher-reveal style={revealDelay(60)}>
              <div className={sharedStyles.heroStack}>
                <div className={sharedStyles.heroSheet} aria-hidden="true" />
                <div className={sharedStyles.heroPaper} data-caregiver-art>
                  <Image
                    className={styles.heroMood}
                    src="/templates/kindergarten-doodles/preview.webp"
                    alt="Настроение шаблона «Детство в рисунках»: детские рисунки, цветы, игрушки и мягкая акварель"
                    width={1200}
                    height={630}
                    priority
                    sizes="(max-width: 859px) 92vw, 44vw"
                  />
                </div>
                {heroNotes.map((note, index) => (
                  <div key={note.role} className={`${sharedStyles.heroNote} ${heroNoteClasses[index]}`}>
                    <span>{note.role}</span>
                    <p>«{note.text}»</p>
                  </div>
                ))}
              </div>
              <p className={sharedStyles.heroCaption}>Шаблон «Детство в рисунках» · {caregiverDemoStory.stats}</p>
              <aside className={sharedStyles.occasionNote} aria-label="Ближайший повод для открытки воспитателю">
                <strong>{heroNote.title}</strong>
                <span>{heroNote.text}</span>
                <div className={sharedStyles.occasionMarkers}>
                  {heroNote.markers.map((marker) => <span key={marker}>{marker}</span>)}
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className={`${sharedStyles.section} ${sharedStyles.subtleSection}`} aria-labelledby="memories-title">
          <div className={sharedStyles.shell}>
            <div className={sharedStyles.sectionHeading} data-teacher-reveal>
              <p className={sharedStyles.eyebrow}>У каждой семьи — своё</p>
              <h2 id="memories-title">Не одна общая подпись, а много живых воспоминаний</h2>
              <p>Открытка собирает вместе то, что легко потеряется в родительском чате: детские фразы, личную благодарность и моменты из жизни группы.</p>
            </div>
            <div className={styles.memoryGrid}>
              {memories.map((memory, index) => (
                <article key={memory.title} className={styles.memoryCard} data-teacher-reveal style={revealDelay(80 + index * 80)}>
                  <span className={styles.memoryIndex}>0{index + 1}</span>
                  <h3>{memory.title}</h3>
                  <p>{memory.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className={sharedStyles.section} aria-labelledby="steps-title">
          <div className={sharedStyles.shell}>
            <div className={sharedStyles.sectionHeading} data-teacher-reveal>
              <p className={sharedStyles.eyebrow}>Одна ссылка в родительский чат</p>
              <h2 id="steps-title">Собрать общий подарок можно без сложной организации</h2>
              <p>Каждая семья пишет свои слова самостоятельно, а организатор отвечает только за итоговую открытку.</p>
            </div>
            <ol className={sharedStyles.stepsTrack} data-teacher-reveal-line>
              {caregiverSteps.map(([number, stepTitle, stepText], index) => (
                <li key={number} className={sharedStyles.stepItem} data-teacher-reveal style={revealDelay(120 + index * 70)}>
                  <span className={sharedStyles.stepMarker}>{stepIcons[index]}</span>
                  <div className={sharedStyles.stepBody}>
                    <span className={sharedStyles.stepIndex}>0{number}</span>
                    <h3>{stepTitle}</h3>
                    <p>{stepText}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`${sharedStyles.section} ${sharedStyles.exampleSection}`} aria-labelledby="example-title">
          <div className={`${sharedStyles.shell} ${sharedStyles.exampleCard}`}>
            <CaregiverExampleLink className={sharedStyles.exampleShot}>
              <Image
                className={styles.exampleImage}
                src="/landing/caregiver/og-kindergarten-doodles.webp"
                alt={`Интерактивный пример открытки ${caregiverDemoStory.recipientDative} в шаблоне «Детство в рисунках»`}
                width={1200}
                height={630}
                sizes="(max-width: 859px) 92vw, 52vw"
              />
              <span className={sharedStyles.examplePlay} aria-hidden="true">▶</span>
            </CaregiverExampleLink>
            <div className={sharedStyles.exampleCopy} data-teacher-reveal>
              <p className={sharedStyles.eyebrow}>Интерактивный пример</p>
              <h2 id="example-title">Посмотрите открытку глазами воспитателя</h2>
              <p>Откройте уже собранный подарок для {caregiverDemoStory.recipientGenitive}: поздравления семей, фотографии группы, тёплые качества и лучшие фразы в живом оформлении «Детство в рисунках».</p>
              <div className={sharedStyles.stackActions}>
                <CaregiverExampleLink className={sharedStyles.primaryLink}><span aria-hidden="true">▶</span> Открыть пример открытки</CaregiverExampleLink>
                <CaregiverCreateForm placement="example" buttonClassName={sharedStyles.secondaryButton}>Сделать такую для воспитателя</CaregiverCreateForm>
              </div>
            </div>
          </div>
        </section>

        <section className={`${sharedStyles.section} ${sharedStyles.subtleSection}`} aria-labelledby="contents-title">
          <div className={sharedStyles.shell}>
            <div className={sharedStyles.sectionHeading} data-teacher-reveal>
              <p className={sharedStyles.eyebrow}>Внутри готового подарка</p>
              <h2 id="contents-title">Всё, что хочется сохранить о времени в детском саду</h2>
              <p>Не картинка из чата, а цельная открытка, к которой воспитатель сможет возвращаться.</p>
            </div>
            <ul className={sharedStyles.contentsPanel} data-teacher-reveal style={revealDelay(100)}>
              {caregiverCardContents.map((item, index) => (
                <li key={item.title} className={sharedStyles.contentsItem}>
                  <span className={sharedStyles.contentsIndex} aria-hidden="true">0{index + 1}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={sharedStyles.section} aria-labelledby="words-title">
          <div className={sharedStyles.shell}>
            <div className={sharedStyles.sectionHeading} data-teacher-reveal>
              <p className={sharedStyles.eyebrow}>Что написать</p>
              <h2 id="words-title">Слова ребёнка и родителей звучат по-разному — и это ценно</h2>
              <p>Не нужно сочинять торжественную речь. Лучше всего работают конкретные, узнаваемые детали.</p>
            </div>
            <div className={styles.promptWrap}>
              <div className={styles.promptGrid}>
                <article className={styles.promptCard} data-teacher-reveal style={revealDelay(80)}>
                  <span>От ребёнка</span>
                  <h3>Спросите о любимом моменте</h3>
                  <p>Что воспитатель делает особенно здорово? Какая игра, прогулка или история запомнилась?</p>
                  <p className={styles.promptExample}>«Спасибо, что читаете нам смешные сказки и помогаете мириться».</p>
                </article>
                <article className={styles.promptCard} data-teacher-reveal style={revealDelay(160)}>
                  <span>От родителей</span>
                  <h3>Поблагодарите за конкретное</h3>
                  <p>Вспомните адаптацию, новый навык ребёнка или поддержку, которая была важна вашей семье.</p>
                  <p className={styles.promptExample}>«Спасибо, что рядом с Вами Миша стал увереннее и каждое утро идёт в группу с радостью».</p>
                </article>
              </div>
              <div className={styles.photoHeading}>
                <h3>Какие фотографии можно добавить</h3>
                <p>Живые кадры занятий, прогулок, праздников и обычных дней, по которым воспитатель узнает свою группу.</p>
              </div>
              <div className={styles.photoStrip} aria-label="Примеры фотографий в открытке">
                {photoMoments.map((photo) => (
                  <figure key={photo.src} className={styles.photoCard}>
                    <Image src={photo.src} alt={photo.alt} width={1536} height={1024} sizes="(max-width: 699px) 220px, 31vw" />
                    <span>{photo.caption}</span>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={`${sharedStyles.section} ${sharedStyles.subtleSection}`} aria-labelledby="occasions-title">
          <div className={sharedStyles.shell}>
            <div className={sharedStyles.sectionHeading} data-teacher-reveal>
              <p className={sharedStyles.eyebrow}>Не только 27 сентября</p>
              <h2 id="occasions-title">Когда подарить общую открытку воспитателю</h2>
            </div>
            <div className={sharedStyles.occasionGrid}>
              {caregiverOccasions.map((occasion, index) => (
                <article key={occasion.title} className={sharedStyles.occasionItem} data-teacher-reveal style={revealDelay(80 + index * 80)}>
                  <strong><span className={sharedStyles.occasionDot} aria-hidden="true" />{occasion.title}</strong>
                  <p>{occasion.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="price" className={sharedStyles.section} aria-labelledby="price-title">
          <div className={sharedStyles.shell}>
            <article className={sharedStyles.priceCard} data-teacher-reveal>
              <div className={sharedStyles.priceHead}>
                <p className={sharedStyles.eyebrow}>Прозрачная цена</p>
                <h2 id="price-title">Сначала соберите и посмотрите. Оплатите только перед вручением</h2>
              </div>
              <div className={sharedStyles.priceFlow}>
                <div className={sharedStyles.priceState}>
                  <span>Пока открытка собирается</span>
                  <strong>0 ₽</strong>
                  <p>Создание, приглашение семей, настройка и предварительный просмотр.</p>
                </div>
                <span className={sharedStyles.priceArrow}>{priceArrow}</span>
                <div className={`${sharedStyles.priceState} ${sharedStyles.priceStateFinal}`}>
                  <span>Когда подарок готов</span>
                  <strong>399 ₽ <small>за всю открытку</small></strong>
                  <p>Не за каждого участника. Финальная передача воспитателю — по приватной ссылке.</p>
                </div>
              </div>
              <p className={sharedStyles.priceConclusion}>Оплата не завершает сбор автоматически — организатор сам выбирает момент вручения.</p>
            </article>
          </div>
        </section>

        <FaqSection items={caregiverFaqs} variant="neutral" title="Частые вопросы об открытке воспитателю" />

        <section className={`${sharedStyles.section} ${sharedStyles.finalSection}`} aria-labelledby="final-title">
          <div className={`${sharedStyles.shell} ${sharedStyles.finalCard}`} data-teacher-reveal>
            <p className={sharedStyles.eyebrow}>Слова каждой семьи — в одном подарке</p>
            <h2 id="final-title">Соберите слова всей группы в один тёплый подарок</h2>
            <p>Начните бесплатно, отправьте одну ссылку в родительский чат и добавьте фотографии, когда поздравления будут собраны.</p>
            <CaregiverCreateForm placement="final" buttonClassName={sharedStyles.primaryButton}>Собрать открытку воспитателю</CaregiverCreateForm>
            <span>Без регистрации · До 100 поздравлений · Приватная ссылка для вручения</span>
          </div>
        </section>
      </main>

      <HomeFooter variant="neutral" />
    </div>
  );
}
