import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { FaqSection, HomeFooter, HomeHeader } from "@/app/_home";
import {
  teacherCardContents,
  teacherDemoStory,
  teacherFaqs,
  teacherHeroNote,
  teacherOccasionScenarios,
  teacherOccasionsCompact,
  teacherSteps
} from "./teacher-landing-content";
import { TeacherCreateForm, TeacherExampleLink, TeacherLandingTracker } from "./teacher-landing-client";
import { TeacherLandingMotion } from "./teacher-landing-motion";
import styles from "./page.module.css";

const landingPath = "/gruppovaya-otkrytka/uchitelyu";
const landingUrl = `https://slovesto.ru${landingPath}`;
const title = "Групповая онлайн-открытка учителю от класса — Slovesto";
const description = "Соберите поздравления учеников и родителей по одной ссылке, добавьте фотографии класса и подарите учителю общую онлайн-открытку. Создание бесплатно, передача — 399 ₽.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: landingPath },
  openGraph: {
    title,
    description,
    url: landingPath,
    images: [{
      url: "/landing/teacher/og-school-classic.webp",
      width: 1200,
      height: 630,
      alt: "Slovesto — групповая открытка учителю от класса: поздравления и фотографии по одной ссылке"
    }]
  }
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: "https://slovesto.ru/" },
      { "@type": "ListItem", position: 2, name: "Открытка учителю от класса", item: landingUrl }
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: teacherFaqs.map(([question, answer]) => ({
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

const photoIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10.2" r="1.6" /><path d="M4.5 17.5 10 12.5l3.5 3 3-2.6 3 2.6" /></svg>
);

const bridgeArrow = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15" /><path d="m13.5 6 6 6-6 6" /></svg>
);

const mergeIcon = (
  <svg viewBox="0 0 120 240" fill="none" preserveAspectRatio="none" aria-hidden="true">
    <path d="M2 40C55 40 65 105 108 117" stroke="rgba(0, 0, 0, 0.18)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    <path d="M2 120L108 120" stroke="rgba(0, 0, 0, 0.18)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    <path d="M2 200C55 200 65 135 108 123" stroke="rgba(0, 0, 0, 0.18)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    <path d="M100 112L118 120L100 128" stroke="#e9652f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
  </svg>
);

const downArrow = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v15" /><path d="m6 13.5 6 6 6-6" /></svg>
);

const envelopeIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="m3.5 7.5 8.5 6 8.5-6" /></svg>
);

const heroNoteClasses = [styles.heroNoteStudent, styles.heroNoteParent, styles.heroNoteGraduate];

/* Короткие фрагменты из текстов ученика, родителя и выпускника — только для hero */
const heroNotes = [
  { role: "Ученик", text: "Помогаете не бояться сложных задач" },
  { role: "Родитель", text: "Спасибо за внимание к детям" },
  { role: "Выпускник", text: "До сих пор вспоминаю ваши уроки" }
] as const;

type ChatFragment =
  | { kind: "message"; who: string; text: string }
  | { kind: "photo"; label: string };

/* Фрагменты чата складываются в открытку Анны Сергеевны из того же демо-сюжета */
const chatFragments: readonly ChatFragment[] = [
  { kind: "message", who: "Ученик", text: "Спасибо, что объясняете ещё раз, если непонятно" },
  { kind: "message", who: "Родитель", text: "Благодарны за внимание и поддержку" },
  { kind: "photo", label: "фотография класса" },
  { kind: "message", who: "Выпускник", text: "Ваши уроки вспоминаю до сих пор" },
  { kind: "message", who: "Ученица", text: "С Вами хочется стараться" }
];

const chatRevealDelays = [60, 120, 170, 220, 270];

const participantFlows = [
  { title: "От учеников", text: "Пожелания, школьные истории и воспоминания." },
  { title: "От родителей", text: "Благодарность за внимание, поддержку и работу с классом." },
  { title: "От выпускников", text: "Слова тех, кто спустя годы помнит учителя." }
] as const;

export default function TeacherLandingPage() {
  return (
    <div className={styles.page} data-teacher-landing>
      <TeacherLandingTracker />
      <TeacherLandingMotion />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <HomeHeader variant="teacher" />
      <main>
        <div className={styles.breadcrumbWrap}>
          <nav className={styles.breadcrumb} aria-label="Хлебные крошки">
            <Link href="/">Главная</Link>
            <span aria-hidden="true">→</span>
            <span aria-current="page">Открытка учителю от класса</span>
          </nav>
        </div>

        <section className={`${styles.section} ${styles.hero}`} aria-labelledby="teacher-landing-title">
          <div className={`${styles.shell} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Открытка от учеников, родителей и выпускников</p>
              <h1 id="teacher-landing-title">Групповая онлайн&#8209;открытка учителю от всего класса</h1>
              <p className={styles.heroText}>Соберите личные поздравления учеников, родителей и выпускников по одной ссылке, добавьте фотографии класса и превратите всё в одну красивую открытку для учителя.</p>
              <div className={styles.heroActions}>
                <TeacherCreateForm placement="hero" buttonClassName={styles.primaryButton}>Собрать открытку учителю</TeacherCreateForm>
                <TeacherExampleLink className={styles.secondaryButton}>Посмотреть пример</TeacherExampleLink>
              </div>
              <p className={styles.trustLine}>До 100 поздравлений · Участникам не нужна регистрация · Начать можно бесплатно</p>
              <p className={styles.trustLinePrice}>399 ₽ за всю готовую открытку — только после просмотра результата</p>
            </div>
            <div className={styles.heroVisual} data-teacher-reveal style={revealDelay(60)}>
              <div className={styles.heroStack}>
                <div className={styles.heroSheet} aria-hidden="true" />
                <div className={styles.heroPaper}>
                  <Image
                    src="/landing/teacher/example-school-classic-hero.webp"
                    alt={`Готовая открытка учителю ${teacherDemoStory.recipientDative} — ${teacherDemoStory.occasion}, ${teacherDemoStory.stats}`}
                    width={1200}
                    height={630}
                    priority
                    sizes="(max-width: 859px) 92vw, 44vw"
                  />
                </div>
                {heroNotes.map((note, index) => (
                  <div key={note.role} className={`${styles.heroNote} ${heroNoteClasses[index]}`}>
                    <span>{note.role}</span>
                    <p>«{note.text}»</p>
                  </div>
                ))}
              </div>
              <p className={styles.heroCaption}>Пример готовой открытки — {teacherDemoStory.recipient}, {teacherDemoStory.occasion} · {teacherDemoStory.stats}</p>
              <aside className={styles.occasionNote} aria-label="Ближайший школьный повод">
                <strong>{teacherHeroNote.title}</strong>
                <span>{teacherHeroNote.text}</span>
                <div className={styles.occasionMarkers}>
                  {teacherHeroNote.markers.map((marker) => (
                    <span key={marker}>{marker}</span>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.subtleSection}`} aria-labelledby="chaos-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading} data-teacher-reveal>
              <p className={styles.eyebrow}>Из сообщений — в подарок</p>
              <h2 id="chaos-title">В чате всё вперемешку. В открытке — одна история</h2>
              <p>Поздравления приходят в разное время и разного объёма. Организатор собирает их вместе с фотографиями и превращает в цельный подарок для учителя.</p>
            </div>
            <div className={styles.chaosGrid}>
              <div className={styles.chaosSide}>
                <p className={styles.chaosLabel} data-teacher-reveal>В чате</p>
                <div className={styles.chatPane}>
                  {chatFragments.map((fragment, index) => fragment.kind === "photo" ? (
                    <div key="photo" className={styles.chatPhoto} data-teacher-reveal style={revealDelay(chatRevealDelays[index])}>
                      {photoIcon}
                      <span>+ {fragment.label}</span>
                    </div>
                  ) : (
                    <p key={`${fragment.who}-${index}`} className={styles.chatMsg} data-teacher-reveal style={revealDelay(chatRevealDelays[index])}>
                      {fragment.text}
                      <span>{fragment.who}</span>
                    </p>
                  ))}
                </div>
              </div>
              <div className={styles.chaosBridge} data-teacher-reveal style={revealDelay(300)}>
                {bridgeArrow}
                <span>Slovesto собирает вместе</span>
              </div>
              <div className={styles.chaosSide}>
                <p className={styles.chaosLabel} data-teacher-reveal style={revealDelay(300)}>В открытке</p>
                <article className={styles.orderCard} data-teacher-reveal style={revealDelay(340)}>
                  <div className={styles.orderPreview}>
                    <Image
                      src="/landing/teacher/example-school-classic-messages.webp"
                      alt={`Блок «Поздравления» готовой открытки ${teacherDemoStory.recipientDative}: личные сообщения с именами авторов и фотография учителя`}
                      width={1200}
                      height={900}
                      sizes="(max-width: 859px) 88vw, 30vw"
                    />
                  </div>
                  <h3>Открытка {teacherDemoStory.recipientDative}</h3>
                  <p className={styles.orderMeta}>{teacherDemoStory.occasion} · {teacherDemoStory.stats}</p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className={styles.section} aria-labelledby="steps-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading} data-teacher-reveal>
              <p className={styles.eyebrow}>Простой сбор</p>
              <h2 id="steps-title">Одна ссылка для всего класса</h2>
              <p>Ученикам и родителям не нужно разбираться в макете — они просто добавляют поздравления.</p>
            </div>
            <ol className={styles.stepsTrack} data-teacher-reveal-line>
              {teacherSteps.map(([number, stepTitle, stepText], index) => (
                <li key={number} className={styles.stepItem} data-teacher-reveal style={revealDelay(120 + index * 70)}>
                  <span className={styles.stepMarker}>{stepIcons[index]}</span>
                  <div className={styles.stepBody}>
                    <span className={styles.stepIndex}>0{number}</span>
                    <h3>{stepTitle}</h3>
                    <p>{stepText}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`${styles.section} ${styles.subtleSection}`} aria-labelledby="contents-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading} data-teacher-reveal>
              <p className={styles.eyebrow}>Внутри подарка</p>
              <h2 id="contents-title">Что будет в готовой открытке учителю</h2>
            </div>
            <ul className={styles.contentsPanel} data-teacher-reveal style={revealDelay(120)}>
              {teacherCardContents.map((item, index) => (
                <li key={item.title} className={styles.contentsItem}>
                  <span className={styles.contentsIndex} aria-hidden="true">0{index + 1}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={`${styles.section} ${styles.exampleSection}`} aria-labelledby="example-title">
          <div className={`${styles.shell} ${styles.exampleCard}`}>
            <TeacherExampleLink className={styles.exampleShot}>
              <Image
                src="/landing/teacher/example-school-classic-moments.webp"
                alt={`Блоки «Моменты» и «Лучшие фразы» готовой открытки ${teacherDemoStory.recipientDative}: фотографии класса и выбранные тёплые строки`}
                width={1200}
                height={628}
                sizes="(max-width: 859px) 92vw, 52vw"
              />
              <span className={styles.examplePlay} aria-hidden="true">▶</span>
            </TeacherExampleLink>
            <div className={styles.exampleCopy} data-teacher-reveal>
              <p className={styles.eyebrow}>Интерактивный пример</p>
              <h2 id="example-title">Посмотрите открытку глазами учителя</h2>
              <p>Откройте уже собранный подарок для {teacherDemoStory.recipientGenitive} — с личными поздравлениями учеников, родителей и выпускников, фотографиями и лучшими фразами в классическом школьном оформлении.</p>
              <div className={styles.stackActions}>
                <TeacherExampleLink className={styles.primaryLink}><span aria-hidden="true">▶</span> Открыть пример открытки</TeacherExampleLink>
                <TeacherCreateForm placement="example" buttonClassName={styles.secondaryButton}>Сделать такую для нашего учителя</TeacherCreateForm>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="participants-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading} data-teacher-reveal>
              <p className={styles.eyebrow}>Вместе или по отдельности</p>
              <h2 id="participants-title">Ученики, родители и выпускники — в одной открытке</h2>
              <p>Каждый добавляет свои слова, а итог остаётся аккуратным и цельным.</p>
            </div>
            <div className={styles.flowsGrid}>
              <div className={styles.flowList}>
                {participantFlows.map((flow, index) => (
                  <article key={flow.title} className={styles.flowItem} data-teacher-reveal style={revealDelay(60 + index * 70)}>
                    <strong>{flow.title}</strong>
                    <p>{flow.text}</p>
                  </article>
                ))}
              </div>
              <div className={styles.flowMerge} data-teacher-reveal style={revealDelay(240)}>{mergeIcon}</div>
              <div className={styles.flowArrowDown} aria-hidden="true" data-teacher-reveal style={revealDelay(240)}>{downArrow}</div>
              <div className={styles.flowResult} data-teacher-reveal style={revealDelay(300)}>
                <span className={styles.flowResultIcon}>{envelopeIcon}</span>
                <strong>Одна открытка от всего класса</strong>
                <p>Голоса учеников, родителей и выпускников — в одном общем подарке для учителя.</p>
              </div>
            </div>
            <p className={styles.flowsNote} data-teacher-reveal style={revealDelay(340)}>Организатор собирает всё вместе, добавляет фотографии и проверяет открытку перед вручением.</p>
          </div>
        </section>

        <section className={`${styles.section} ${styles.subtleSection}`} aria-labelledby="occasions-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading} data-teacher-reveal>
              <p className={styles.eyebrow}>Весь учебный год</p>
              <h2 id="occasions-title">Открытка учителю на 1 сентября, День учителя и выпускной</h2>
            </div>
            <div className={styles.occasionGrid} data-teacher-reveal style={revealDelay(100)}>
              {teacherOccasionScenarios.map((occasion) => (
                <div key={occasion.title} className={styles.occasionItem}>
                  <strong><span className={styles.occasionDot} aria-hidden="true" />{occasion.title}</strong>
                  <p>{occasion.text}</p>
                </div>
              ))}
            </div>
            <p className={styles.occasionsCompact} data-teacher-reveal style={revealDelay(180)}>
              А ещё: {teacherOccasionsCompact.join(", ").toLowerCase()} — подойдёт для любого школьного повода.
            </p>
          </div>
        </section>

        <section id="price" className={styles.section} aria-labelledby="price-title">
          <div className={`${styles.shell} ${styles.priceCard}`}>
            <div className={styles.priceHead} data-teacher-reveal>
              <p className={styles.eyebrow}>Без оплаты на старте</p>
              <h2 id="price-title">Сколько стоит групповая открытка учителю</h2>
            </div>
            <div className={styles.priceFlow}>
              <div className={styles.priceState} data-teacher-reveal style={revealDelay(90)}>
                <span>Пока собираете</span>
                <strong>Бесплатно</strong>
                <p>Создание, приглашение участников, сбор и модерация поздравлений, фотографии и предварительный просмотр.</p>
              </div>
              <div className={styles.priceArrow} aria-hidden="true" data-teacher-reveal style={revealDelay(180)}>{bridgeArrow}</div>
              <div className={`${styles.priceState} ${styles.priceStateFinal}`} data-teacher-reveal style={revealDelay(260)}>
                <span>Когда подарок готов</span>
                <strong>399 ₽ <small>за всю готовую открытку</small></strong>
                <p>Один платёж за всю открытку. Без оплаты за участника, подписки и регулярных платежей.</p>
              </div>
            </div>
            <p className={styles.priceConclusion} data-teacher-reveal style={revealDelay(300)}>Сначала убедитесь, что открытка получилась. Оплачивайте только когда будете готовы её вручить.</p>
          </div>
        </section>

        <FaqSection items={teacherFaqs} variant="neutral" title="Частые вопросы об открытке учителю" />

        <section className={`${styles.section} ${styles.finalSection}`} aria-labelledby="final-title">
          <div className={`${styles.shell} ${styles.finalCard}`}>
            <h2 id="final-title" data-teacher-reveal>Соберите слова класса, которые учителю захочется сохранить</h2>
            <p data-teacher-reveal style={revealDelay(80)}>Создать открытку можно сейчас, а приглашать учеников и родителей — когда будете готовы.</p>
            <div data-teacher-reveal style={revealDelay(160)}>
              <TeacherCreateForm placement="final" buttonClassName={styles.primaryButton}>Собрать открытку учителю</TeacherCreateForm>
            </div>
            <span>Без регистрации · Начать бесплатно</span>
          </div>
        </section>
      </main>
      <HomeFooter variant="neutral" />
    </div>
  );
}
