import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { FaqSection, HomeFooter, HomeHeader } from "@/app/_home";
import { ColleagueLandingMotion } from "./colleague-landing-motion";
import sharedStyles from "../uchitelyu/page.module.css";
import {
  colleagueCardContents,
  colleagueDemoStory,
  colleagueFaqs,
  colleagueOccasions,
  colleagueSteps
} from "./colleague-landing-content";
import {
  ColleagueCreateForm,
  ColleagueExampleLink,
  ColleagueLandingTracker
} from "./colleague-landing-client";
import styles from "./page.module.css";

const landingPath = "/gruppovaya-otkrytka/kollege";
const landingUrl = `https://slovesto.ru${landingPath}`;
const title = "Групповая онлайн-открытка коллеге от команды — Slovesto";
const description = "Соберите поздравления коллег по одной ссылке, добавьте фотографии команды и подарите общую онлайн-открытку на день рождения, повышение или прощание. 399 ₽ за готовый подарок.";

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
      url: "/landing/colleague/og-team-editorial.jpg",
      width: 1200,
      height: 630,
      alt: "Slovesto — групповая онлайн-открытка коллеге от всей команды"
    }]
  }
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: "https://slovesto.ru/" },
      { "@type": "ListItem", position: 2, name: "Открытка коллеге от команды", item: landingUrl }
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: colleagueFaqs.map(([question, answer]) => ({
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

const remoteIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M3.8 9h16.4M3.8 15h16.4M12 3.5c2.2 2.4 3.2 5.2 3.2 8.5S14.2 18.1 12 20.5C9.8 18.1 8.8 15.3 8.8 12S9.8 5.9 12 3.5Z" /></svg>
);

const heroNotes = [
  { role: "От коллеги", text: "Спасибо, что всегда подхватываешь, когда всё горит" },
  { role: "От руководителя", text: "Ты сильно изменил нашу команду" },
  { role: "Общий момент", text: "Тот самый запуск, который мы пережили вместе" }
] as const;

const heroNoteClasses = [
  sharedStyles.heroNoteStudent,
  sharedStyles.heroNoteParent,
  sharedStyles.heroNoteStudentSecond
];

const stories = [
  { title: "Момент поддержки", text: "Когда человек помог, выручил или научил чему-то важному." },
  { title: "Общее дело", text: "Проект, запуск, командировка, дедлайн или маленькая победа команды." },
  { title: "История для своих", text: "Фраза, привычка или рабочий эпизод, который узнают коллеги." }
] as const;

const moments = [
  { src: "/examples/team-editorial/project-discussion.webp", alt: "Коллеги обсуждают совместный проект", caption: "Разговоры, из которых рождаются решения" },
  { src: "/examples/team-editorial/team-evening.webp", alt: "Команда проводит вечер вместе", caption: "Когда работа превращается в общее дело" },
  { src: "/examples/team-editorial/good-news.webp", alt: "Коллеги вместе отмечают хорошую новость", caption: "Хорошие новости приятнее делить вместе" }
] as const;

const prompts = [
  { label: "Конкретная история", title: "Вспомните момент помощи", text: "Когда коллега научил, поддержал или спас ситуацию — такая деталь ценнее формальной похвалы." },
  { label: "Личное качество", title: "Скажите, за что цените", text: "Не «ты отличный сотрудник», а спокойствие, точность, чувство юмора или умение слышать людей." },
  { label: "Пожелание", title: "Свяжите его с новым этапом", text: "Особенно хорошо для повышения, перехода в новую команду или ухода в другую компанию." }
] as const;

export default function ColleagueLandingPage() {
  return (
    <div className={`${sharedStyles.page} ${styles.colleaguePage}`} data-teacher-landing data-colleague-landing>
      <ColleagueLandingTracker />
      <ColleagueLandingMotion />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <HomeHeader variant="colleague" />

      <main>
        <div className={sharedStyles.breadcrumbWrap}>
          <nav className={sharedStyles.breadcrumb} aria-label="Хлебные крошки">
            <Link href="/">Главная</Link>
            <span aria-hidden="true">→</span>
            <span aria-current="page">Открытка коллеге от команды</span>
          </nav>
        </div>

        <section className={`${sharedStyles.section} ${sharedStyles.hero}`} aria-labelledby="colleague-landing-title">
          <div className={`${sharedStyles.shell} ${sharedStyles.heroGrid}`}>
            <div className={sharedStyles.heroCopy}>
              <p className={sharedStyles.eyebrow}>От всей команды — в одном подарке</p>
              <h1 id="colleague-landing-title">Групповая онлайн&#8209;открытка коллеге от всей команды</h1>
              <p className={sharedStyles.heroText}>Соберите личные слова коллег по одной ссылке, добавьте фотографии команды и превратите общие моменты в одну красивую открытку.</p>
              <div className={sharedStyles.heroActions}>
                <ColleagueCreateForm placement="hero" buttonClassName={sharedStyles.primaryButton}>Собрать открытку коллеге</ColleagueCreateForm>
                <ColleagueExampleLink className={sharedStyles.secondaryButton}>Посмотреть пример</ColleagueExampleLink>
              </div>
              <p className={sharedStyles.trustLine}>Без регистрации · До 100 поздравлений · Приватная ссылка для вручения</p>
              <p className={sharedStyles.trustLinePrice}>Сбор и просмотр бесплатно · 399 ₽ за весь подарок, не за каждого сотрудника</p>
            </div>

            <div className={sharedStyles.heroVisual} data-teacher-reveal style={revealDelay(60)}>
              <div className={sharedStyles.heroStack}>
                <div className={sharedStyles.heroSheet} aria-hidden="true" />
                <div className={`${sharedStyles.heroPaper} ${styles.heroPreview}`}>
                  <Image
                    className={styles.heroProductImage}
                    src="/landing/colleague/og-team-editorial.jpg"
                    alt={`Открытка «Вместе» для ${colleagueDemoStory.recipientGenitive}: ${colleagueDemoStory.occasion}, ${colleagueDemoStory.stats}`}
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
              <div className={styles.heroProductMeta}>
                <span>Открытка «Вместе» · {colleagueDemoStory.recipient}</span>
                <span>{colleagueDemoStory.stats}</span>
              </div>
              <div className={styles.occasionStrip} aria-label="Поводы для общей открытки коллеге">
                <span>День рождения</span><span>Повышение</span><span>Прощание</span><span>Благодарность</span>
              </div>
            </div>
          </div>
        </section>

        <section className={`${sharedStyles.section} ${sharedStyles.subtleSection}`} aria-labelledby="story-title">
          <div className={sharedStyles.shell}>
            <div className={sharedStyles.sectionHeading} data-teacher-reveal>
              <p className={sharedStyles.eyebrow}>Команда помнит больше</p>
              <h2 id="story-title">У каждого коллеги — своя история</h2>
              <p>Самые ценные слова начинаются не с должности, а с того, что вы успели прожить и сделать вместе.</p>
            </div>
            <div className={styles.storyGrid}>
              {stories.map((story, index) => (
                <article key={story.title} className={styles.storyCard} data-colleague-lift data-teacher-reveal style={revealDelay(70 + index * 80)}>
                  <span className={styles.storyIndex}>0{index + 1}</span>
                  <h3>{story.title}</h3>
                  <p>{story.text}</p>
                </article>
              ))}
            </div>
            <p className={styles.storyClosing} data-teacher-reveal style={revealDelay(320)}>Когда эти истории собираются вместе, получается не формальное «от коллектива», а подарок о человеке и его месте в команде.</p>
          </div>
        </section>

        <section id="how-it-works" className={sharedStyles.section} aria-labelledby="steps-title">
          <div className={sharedStyles.shell}>
            <div className={sharedStyles.sectionHeading} data-teacher-reveal>
              <p className={sharedStyles.eyebrow}>Одна ссылка в рабочий чат</p>
              <h2 id="steps-title">Не собирайте поздравления у коллег вручную</h2>
              <p>Не нужно писать каждому в личку и копировать тексты в документ. Отправьте одну ссылку — каждый добавит свои слова самостоятельно.</p>
            </div>
            <ol className={sharedStyles.stepsTrack} data-teacher-reveal-line>
              {colleagueSteps.map(([number, stepTitle, stepText], index) => (
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
            <ColleagueExampleLink className={sharedStyles.exampleShot} reveal>
              <Image
                className={styles.exampleImage}
                src="/landing/colleague/og-team-editorial.jpg"
                alt={`Интерактивный пример открытки ${colleagueDemoStory.recipientDative} в оформлении «Вместе»`}
                width={1200}
                height={630}
                sizes="(max-width: 859px) 92vw, 52vw"
              />
              <span className={sharedStyles.examplePlay} aria-hidden="true">▶</span>
            </ColleagueExampleLink>
            <div className={sharedStyles.exampleCopy} data-teacher-reveal>
              <p className={sharedStyles.eyebrow}>Интерактивный пример</p>
              <h2 id="example-title">Посмотрите открытку глазами коллеги</h2>
              <p>Откройте готовый подарок для {colleagueDemoStory.recipientGenitive}: личные слова коллег, фотографии, качества и общие моменты в журнальном оформлении «Вместе».</p>
              <div className={sharedStyles.stackActions}>
                <ColleagueExampleLink className={sharedStyles.primaryLink}><span aria-hidden="true">▶</span> Открыть пример открытки</ColleagueExampleLink>
                <ColleagueCreateForm placement="example" buttonClassName={sharedStyles.secondaryButton}>Сделать такую для коллеги</ColleagueCreateForm>
              </div>
            </div>
          </div>
        </section>

        <section className={`${sharedStyles.section} ${sharedStyles.subtleSection}`} aria-labelledby="contents-title">
          <div className={sharedStyles.shell}>
            <div className={sharedStyles.sectionHeading} data-teacher-reveal>
              <p className={sharedStyles.eyebrow}>Внутри готового подарка</p>
              <h2 id="contents-title">Личные слова и общие моменты — в одной открытке</h2>
              <p>Slovesto собирает разрозненные слова и фотографии в законченную открытку, которую хочется сохранить.</p>
            </div>
            <ul className={sharedStyles.contentsPanel}>
              {colleagueCardContents.map((item, index) => (
                <li key={item.title} className={`${sharedStyles.contentsItem} ${styles.contentItem}`} data-teacher-reveal style={revealDelay(index * 80)}>
                  <span className={sharedStyles.contentsIndex} aria-hidden="true">0{index + 1}</span>
                  <div><strong>{item.title}</strong><p>{item.text}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={sharedStyles.section} aria-labelledby="moments-title">
          <div className={sharedStyles.shell}>
            <div className={sharedStyles.sectionHeading} data-teacher-reveal>
              <p className={sharedStyles.eyebrow}>Добавьте фотографии и моменты, которые узнает команда</p>
              <h2 id="moments-title">Вспомните, что вы успели сделать вместе</h2>
              <p>Добавьте фотографии и конкретные рабочие истории — именно их команда узнает с первого взгляда.</p>
            </div>
            <div className={styles.momentWrap}>
              <div className={styles.momentGrid} aria-label="Примеры общих фотографий команды">
                {moments.map((moment, index) => (
                  <figure key={moment.src} className={styles.momentCard} data-colleague-lift data-teacher-reveal style={revealDelay(70 + index * 80)}>
                    <Image src={moment.src} alt={moment.alt} width={1536} height={1024} sizes="(max-width: 699px) 250px, 31vw" />
                    <figcaption>{moment.caption}</figcaption>
                  </figure>
                ))}
              </div>
              <div className={styles.promptGrid} aria-label="Подсказки для поздравления коллеге">
                {prompts.map((prompt, index) => (
                  <article key={prompt.title} className={styles.promptCard} data-colleague-lift data-teacher-reveal style={revealDelay(140 + index * 80)}>
                    <span>{prompt.label}</span><h3>{prompt.title}</h3><p>{prompt.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={`${sharedStyles.section} ${sharedStyles.subtleSection}`} aria-labelledby="occasions-title">
          <div className={sharedStyles.shell}>
            <div className={sharedStyles.sectionHeading} data-teacher-reveal>
              <p className={sharedStyles.eyebrow}>Не только день рождения</p>
              <h2 id="occasions-title">Когда подарить общую открытку коллеге</h2>
            </div>
            <div className={styles.occasionGrid}>
              {colleagueOccasions.map((occasion, index) => (
                <article key={occasion.title} className={styles.occasionCard} data-colleague-lift data-teacher-reveal style={revealDelay(70 + index * 70)}>
                  <h3><span className={styles.occasionDot} aria-hidden="true" />{occasion.title}</h3>
                  <p>{occasion.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={sharedStyles.section} aria-labelledby="remote-title">
          <div className={sharedStyles.shell}>
            <article className={styles.remoteBand} data-colleague-lift data-teacher-reveal>
              <span className={styles.remoteIcon}>{remoteIcon}</span>
              <div className={styles.remoteCopy}>
                <h2 id="remote-title">Подойдёт, даже если команда работает из разных городов</h2>
                <p>Ссылку можно отправить в любой рабочий чат. Каждый добавит поздравление, когда ему удобно, а готовую открытку можно открыть вместе на созвоне или отправить коллеге лично.</p>
              </div>
            </article>
          </div>
        </section>

        <section id="price" className={`${sharedStyles.section} ${sharedStyles.subtleSection}`} aria-labelledby="price-title">
          <div className={sharedStyles.shell}>
            <article className={sharedStyles.priceCard}>
              <div className={sharedStyles.priceHead} data-teacher-reveal>
                <p className={sharedStyles.eyebrow}>Прозрачная цена</p>
                <h2 id="price-title">Сначала соберите и посмотрите. Оплатите только перед вручением</h2>
              </div>
              <div className={sharedStyles.priceFlow}>
                <div className={sharedStyles.priceState} data-colleague-lift data-teacher-reveal style={revealDelay(80)}>
                  <span>Пока открытка собирается</span><strong>0 ₽</strong>
                  <p>Создание, ссылка для коллег, настройка и предварительный просмотр.</p>
                </div>
                <span className={sharedStyles.priceArrow}>{priceArrow}</span>
                <div className={`${sharedStyles.priceState} ${sharedStyles.priceStateFinal}`} data-colleague-lift data-teacher-reveal style={revealDelay(180)}>
                  <span>Когда подарок готов</span><strong>399 ₽ <small>за всю открытку</small></strong>
                  <p>Не за каждого сотрудника. Один платёж за весь подарок от команды.</p>
                </div>
              </div>
              <p className={sharedStyles.priceConclusion} data-teacher-reveal style={revealDelay(260)}>Оплата не завершает сбор автоматически — организатор сам выбирает момент вручения.</p>
            </article>
          </div>
        </section>

        <FaqSection items={colleagueFaqs} variant="neutral" title="Частые вопросы об открытке коллеге" />

        <section className={`${sharedStyles.section} ${sharedStyles.finalSection}`} aria-labelledby="final-title">
          <div className={`${sharedStyles.shell} ${sharedStyles.finalCard}`} data-teacher-reveal>
            <p className={sharedStyles.eyebrow}>Слова команды — в одном подарке</p>
            <h2 id="final-title">Соберите открытку, которую коллеге захочется сохранить</h2>
            <p>Начните бесплатно, отправьте одну ссылку коллегам и добавьте общие фотографии, когда слова будут собраны.</p>
            <ColleagueCreateForm placement="final" buttonClassName={sharedStyles.primaryButton}>Собрать открытку коллеге</ColleagueCreateForm>
            <span>Без регистрации · До 100 поздравлений · Приватная ссылка для вручения</span>
          </div>
        </section>
      </main>

      <HomeFooter variant="neutral" />
    </div>
  );
}
