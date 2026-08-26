import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { FaqSection, HomeFooter, HomeHeader } from "@/app/_home";
import { birthdayExampleCardModel, birthdayPhotos } from "@/lib/birthday-example";
import { BIRTHDAY_LANDING_PATH } from "@/lib/landing-attribution";
import { TeacherLandingMotion } from "../uchitelyu/teacher-landing-motion";
import shared from "../uchitelyu/page.module.css";
import { BirthdayCreateForm, BirthdayExampleLink, BirthdayLandingTracker } from "./birthday-landing-client";
import { birthdayContents, birthdayFaqs, birthdaySteps, birthdayVoices } from "./birthday-landing-content";
import styles from "./page.module.css";

const title = "Групповая онлайн-открытка на день рождения — Slovesto";
const description = "Соберите поздравления друзей и родных по одной ссылке, добавьте общие фото и подарите имениннику открытку от всех. Создание бесплатно, готовая открытка — 399 ₽.";
const landingUrl = `https://slovesto.ru${BIRTHDAY_LANDING_PATH}`;
const stats = `${birthdayExampleCardModel.participantCount} поздравлений · ${birthdayExampleCardModel.mediaAssets.length} фото`;
const moments = [birthdayPhotos[0], birthdayPhotos[1], birthdayPhotos[3]];
const delay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

export const revalidate = 3600;
export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: BIRTHDAY_LANDING_PATH },
  openGraph: {
    title, description, url: BIRTHDAY_LANDING_PATH,
    images: [{ url: "/landing/birthday/og-birthday-v2.jpg", width: 1200, height: 630, alt: "Открытка на день рождения от друзей и семьи — Slovesto" }]
  }
};

const structuredData = [
  {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: "https://slovesto.ru/" },
      { "@type": "ListItem", position: 2, name: "Открытка на день рождения", item: landingUrl }
    ]
  },
  {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: birthdayFaqs.map(([question, answer]) => ({
      "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer }
    }))
  }
];

function Arrow() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>;
}

export default function BirthdayLandingPage() {
  return (
    <div className={`${shared.page} ${styles.birthdayPage}`} data-teacher-landing data-birthday-landing>
      <BirthdayLandingTracker />
      <TeacherLandingMotion faqReveal="items" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <HomeHeader variant="birthday" />
      <main>
        <div className={shared.breadcrumbWrap}>
          <nav className={shared.breadcrumb} aria-label="Хлебные крошки">
            <Link href="/">Главная</Link><span aria-hidden="true">→</span><span aria-current="page">Открытка на день рождения</span>
          </nav>
        </div>

        <section className={`${shared.section} ${shared.hero} ${styles.hero}`} aria-labelledby="birthday-title">
          <div className={`${shared.shell} ${shared.heroGrid} ${styles.heroGrid}`}>
            <div className={`${shared.heroCopy} ${styles.heroCopy}`}>
              <p className={shared.eyebrow}>Ваши люди. Ваши слова. Один подарок.</p>
              <h1 id="birthday-title"><span>Групповая онлайн&#8209;открытка</span>{" "}<span>на день рождения</span>{" "}<span>от друзей и близких</span></h1>
              <p className={shared.heroText}>Соберите в одном подарке слова людей, которые важны имениннику. Отправьте ссылку друзьям и родным, добавьте общие фотографии — и подарите открытку от всех.</p>
              <div className={shared.heroActions}>
                <BirthdayCreateForm placement="hero" buttonClassName={`${shared.primaryButton} ${styles.action}`}>Собрать открытку на день рождения</BirthdayCreateForm>
                <BirthdayExampleLink placement="hero" className={`${shared.secondaryButton} ${styles.action}`}>Посмотреть пример</BirthdayExampleLink>
              </div>
              <p className={shared.trustLine}>До 100 поздравлений · Участникам не нужна регистрация</p>
              <p className={shared.trustLinePrice}>Начать бесплатно · 399 ₽ за всю готовую открытку</p>
            </div>
            <div className={`${shared.heroVisual} ${styles.heroVisual}`} data-teacher-reveal>
              <div className={styles.productStage}>
                <BirthdayExampleLink placement="hero" className={styles.productPreview}>
                  <Image src="/landing/birthday/example-hero-v2.webp" alt={`Кристина, с днём рождения! Пример открытки от друзей и семьи: ${stats}`} width={1100} height={594} priority sizes="(max-width: 859px) 92vw, 44vw" />
                  <span className={styles.previewHint}><span aria-hidden="true">▶</span> Открыть подарок</span>
                </BirthdayExampleLink>
                <div className={`${styles.floatingNote} ${styles.noteFriend}`}><span>От подруги</span><p>«Спасибо, что рядом с тобой можно быть собой»</p></div>
                <figure className={styles.heroPhoto}>
                  <Image src={birthdayPhotos[0].src} alt={birthdayPhotos[0].alt} width={220} height={220} sizes="(max-width: 599px) 110px, 150px" />
                  <figcaption>Помнишь этот день?</figcaption>
                </figure>
                <div className={`${styles.floatingNote} ${styles.noteFamily}`}><span>От брата</span><p>«Любой план Б — лучшая часть дня»</p></div>
              </div>
              <p className={styles.productCaption}><strong>Кристина · от друзей и семьи</strong><span>{stats}</span></p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className={`${shared.section} ${shared.subtleSection}`} aria-labelledby="steps-title">
          <div className={shared.shell}>
            <div className={shared.sectionHeading} data-teacher-reveal>
              <p className={shared.eyebrow}>Одна ссылка друзьям и родным</p>
              <h2 id="steps-title">Не 20 сообщений в разных чатах, а один подарок от всех</h2>
              <p>Не нужно пересылать поздравления себе и собирать их вручную. Каждый добавит свои слова по ссылке.</p>
            </div>
            <div className={styles.chatToGift}>
              <div className={styles.chatMessages} aria-label="Поздравления из разных чатов">
                <p data-teacher-reveal><span>Семейный чат</span>«Кристиночка, обнимаем!»</p>
                <p data-teacher-reveal style={delay(90)}><span>Друзья</span>«Помнишь нашу поездку?»</p>
              </div>
              <span className={styles.flowArrow}><Arrow /></span>
              <div className={styles.oneGift} data-teacher-reveal style={delay(180)}><span className={styles.giftMark} aria-hidden="true">♡</span><div><strong>Кристина, с днём рождения!</strong><p>Слова каждого — рядом с общими фотографиями.</p></div></div>
            </div>
            <ol className={shared.stepsTrack}>
              {birthdaySteps.map(([stepTitle, text], index) => (
                <li key={stepTitle} className={shared.stepItem} data-teacher-reveal style={delay(index * 70)}>
                  <span className={shared.stepMarker} aria-hidden="true">{index + 1}</span>
                  <div className={shared.stepBody}><h3>{stepTitle}</h3><p>{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={shared.section} aria-labelledby="example-title">
          <div className={`${shared.shell} ${styles.exampleGrid}`}>
            <div data-teacher-reveal>
              <BirthdayExampleLink className={styles.examplePreview}>
                <Image src="/landing/birthday/example-messages-v2.webp" alt="Личные поздравления Кристине от подруги, мамы и брата в готовой открытке" width={1100} height={594} sizes="(max-width: 859px) 92vw, 48vw" />
                <span className={styles.previewHint}><span aria-hidden="true">▶</span> Посмотреть, что внутри</span>
              </BirthdayExampleLink>
            </div>
            <div className={shared.exampleCopy} data-teacher-reveal style={delay(90)}>
              <p className={shared.eyebrow}>Настоящий интерактивный пример</p>
              <h2 id="example-title">Посмотрите подарок глазами именинника</h2>
              <p>Откройте конверт для Кристины. Внутри — слова друзей и семьи, фотографии, лучшие фразы и поздравление от всех.</p>
              <span className={styles.demoLabel}>В примере используется оформление «Бумажный классический».<br />Демонстрационная открытка · {stats}</span>
              <div className={shared.stackActions}>
                <BirthdayExampleLink className={`${shared.primaryButton} ${styles.action}`}>Открыть пример открытки</BirthdayExampleLink>
                <BirthdayCreateForm placement="example" buttonClassName={`${shared.secondaryButton} ${styles.action}`}>Создать такую на день рождения</BirthdayCreateForm>
              </div>
            </div>
          </div>
        </section>

        <section className={`${shared.section} ${shared.subtleSection}`} aria-labelledby="contents-title">
          <div className={shared.shell}>
            <div className={shared.sectionHeading} data-teacher-reveal><p className={shared.eyebrow}>Можно перечитывать и возвращаться</p><h2 id="contents-title">Что останется внутри открытки</h2></div>
            <ul className={shared.contentsPanel}>
              {birthdayContents.map(([itemTitle, text], index) => (
                <li key={itemTitle} className={shared.contentsItem} data-teacher-reveal style={delay(index * 60)}><span className={shared.contentsIndex} aria-hidden="true">0{index + 1}</span><div><strong>{itemTitle}</strong><p>{text}</p></div></li>
              ))}
            </ul>
          </div>
        </section>

        <section className={shared.section} aria-labelledby="voices-title">
          <div className={shared.shell}>
            <div className={shared.sectionHeading} data-teacher-reveal><p className={shared.eyebrow}>Круг близких людей</p><h2 id="voices-title">Каждый знает человека по-своему</h2><p>Кто-то помнит детство. Кто-то — первую поездку вместе. А кто-то разделяет каждый день. В одной открытке найдётся место всем этим историям.</p></div>
            <div className={styles.voicesGrid}>
              {birthdayVoices.map((voice, index) => (
                <div className={styles.revealCard} key={voice.role} data-teacher-reveal style={delay(index * 80)}>
                  <figure className={styles.voiceCard}>
                    <figcaption><span className={styles.avatar} aria-hidden="true">{voice.initial}</span><span><strong>{voice.name}</strong><span>{voice.role}</span></span></figcaption>
                    <blockquote>«{voice.quote}»</blockquote><p>{voice.detail}</p>
                  </figure>
                </div>
              ))}
            </div>
            <p className={styles.sectionNote}>Фразы из демонстрационной открытки. В вашей будут свои истории.</p>
          </div>
        </section>

        <section className={`${shared.section} ${shared.subtleSection}`} aria-labelledby="moments-title">
          <div className={shared.shell}>
            <div className={shared.sectionHeading} data-teacher-reveal><p className={shared.eyebrow}>Слова становятся ещё ближе с фотографиями</p><h2 id="moments-title">Добавьте то самое «а помнишь?»</h2><p>Поездку, семейный праздник, старый снимок из архива. Не обязательно идеальное фото — важнее, чтобы именинник узнал ваш общий момент.</p></div>
            <div className={styles.momentsGrid}>
              {moments.map((photo, index) => (
                <div className={styles.revealCard} key={photo.src} data-teacher-reveal style={delay(index * 80)}>
                  <figure className={styles.momentCard}>
                    <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(max-width: 599px) 92vw, 31vw" />
                    <figcaption>{photo.caption}</figcaption>
                  </figure>
                </div>
              ))}
            </div>
            <div className={styles.remoteBand} data-teacher-reveal>
              <span className={styles.remoteIcon} aria-hidden="true">↗</span>
              <div><h3>Даже если все живут в разных городах</h3><p>Для общей открытки не нужно собираться в одном месте. Каждый напишет в удобное время, а подарок можно открыть вместе на видеозвонке.</p></div>
            </div>
            <p className={styles.alternative}>Вас связывают путешествия? <BirthdayExampleLink alternative placement="moments">Посмотрите оформление «Маршрут» <span aria-hidden="true">→</span></BirthdayExampleLink></p>
          </div>
        </section>

        <section id="price" className={shared.section} aria-labelledby="price-title">
          <div className={shared.shell}>
            <article className={shared.priceCard}>
              <div className={shared.priceHead} data-teacher-reveal><p className={shared.eyebrow}>Один платёж за весь подарок</p><h2 id="price-title">Сначала соберите и посмотрите.<br />Оплатите перед вручением</h2></div>
              <div className={shared.priceFlow}>
                <div className={shared.priceState} data-teacher-reveal><span>Пока открытка собирается</span><strong>0 ₽</strong><p>Создание, сбор поздравлений, фотографии, настройка и предварительный просмотр.</p></div>
                <span className={shared.priceArrow}><Arrow /></span>
                <div className={`${shared.priceState} ${shared.priceStateFinal}`} data-teacher-reveal style={delay(100)}><span>Когда подарок готов</span><strong>399 ₽ <small>за всю открытку</small></strong><p>До 100 поздравлений. Цена одна — независимо от количества участников.</p></div>
              </div>
              <p className={shared.priceConclusion}>Оплата не завершает сбор автоматически. Вы сами выбираете момент вручения.</p>
            </article>
          </div>
        </section>

        <FaqSection items={birthdayFaqs} variant="neutral" title="Частые вопросы об открытке на день рождения" />

        <section className={`${shared.section} ${shared.finalSection}`} aria-labelledby="final-title">
          <div className={`${shared.shell} ${shared.finalCard}`} data-teacher-reveal>
            <p className={shared.eyebrow}>От всех, кто рядом — даже издалека</p>
            <h2 id="final-title">Соберите слова людей, которые важны имениннику</h2>
            <p>Начните с имени. Потом пригласите друзей и родных — у каждого найдётся что сказать.</p>
            <BirthdayCreateForm placement="final" buttonClassName={`${shared.primaryButton} ${styles.action}`}>Собрать открытку на день рождения</BirthdayCreateForm>
            <span>Начать бесплатно · Оплата после просмотра результата</span>
          </div>
          <p className={styles.related}>Поздравляете рабочей командой? <Link href="/gruppovaya-otkrytka/kollege">Открытка коллеге от команды</Link></p>
        </section>
      </main>
      <HomeFooter variant="neutral" />
    </div>
  );
}
