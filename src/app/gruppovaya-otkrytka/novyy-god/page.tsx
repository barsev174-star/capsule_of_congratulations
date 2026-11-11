import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FaqSection, HomeFooter, HomeHeader } from "@/app/_home";
import { WinterGiftPreview } from "@/components/gift-intro/winter-gift-scene";
import { CARD_CONTRIBUTION_LIMIT } from "@/lib/contributions/limits";
import { BIRTHDAY_LANDING_PATH, COLLEAGUE_LANDING_PATH, NEW_YEAR_LANDING_PATH, TEACHER_LANDING_PATH } from "@/lib/landing-attribution";
import { newYearThemeCatalog } from "@/templates/new-year/catalog";
import shared from "../uchitelyu/page.module.css";
import { NewYearCreateForm, NewYearDemoLink, NewYearLandingTracker } from "./new-year-landing-client";
import { newYearAudiences, newYearContents, newYearFaqs, newYearSteps } from "./new-year-landing-content";
import styles from "./page.module.css";

const title = "Групповая открытка на Новый год онлайн — поздравления от всех | Slovesto";
const description = "Соберите новогодние поздравления от семьи, друзей или коллег в одной онлайн-открытке. Добавьте фотографии и вручите красивый подарок. Сбор бесплатно, готовая открытка — 399 ₽.";
const ogImage = { url: "/landing/new-year/og-new-year.jpg", width: 1200, height: 630, alt: "Красное и зелёное оформления групповой новогодней открытки Slovesto" };

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: NEW_YEAR_LANDING_PATH },
  openGraph: { type: "website", locale: "ru_RU", siteName: "Slovesto", title, description, url: NEW_YEAR_LANDING_PATH, images: [ogImage] },
  twitter: { card: "summary_large_image", title, description, images: [ogImage] }
};

const structuredData = [
  {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: "https://slovesto.ru/" },
      { "@type": "ListItem", position: 2, name: "Открытка на Новый год", item: `https://slovesto.ru${NEW_YEAR_LANDING_PATH}` }
    ]
  },
  {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: newYearFaqs.map(([name, text]) => ({
      "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text }
    }))
  }
];

const themes = [
  { id: "red", recipient: "Наталья", demoLabel: "Открытка Натальи", createLabel: "Создать красную открытку", ...newYearThemeCatalog.red },
  { id: "green", recipient: "Дмитрий", demoLabel: "Открытка Дмитрия", createLabel: "Создать зелёную открытку", ...newYearThemeCatalog.green, description: "Атмосферное зимнее оформление в глубоких зелёных и золотых оттенках." }
] as const;

const messages = [
  ["Семейный чат", "Наташенька, с Новым годом! Пусть впереди будет больше счастливых дней."],
  ["От подруги", "Помнишь, как мы встретили полночь на улице? До сих пор улыбаюсь."],
  ["От сестры", "Желаю нам ещё больше совместных вечеров и разговоров до полуночи!"]
] as const;

const createLabel = "Создать новогоднюю открытку";
const primaryButton = `${shared.primaryButton} ${styles.primaryButton}`;
const secondaryButton = `${shared.secondaryButton} ${styles.secondaryButton}`;

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

function FirSprig({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 176 116" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M3 100C51 93 94 62 167 16M34 92C53 71 62 48 65 30M58 80C79 82 104 84 127 72M78 69C98 49 107 29 111 12M104 53C123 54 146 46 161 35M130 37C143 22 149 11 151 3" />
      <path d="m16 97 3-20m6 17 5-28m7 23-1-16m11 7-5-21m12 10-3-21m8 10-1-19m4 10 10-12M52 83l26 14m-14-15 24 12m-12-11 24 8m-10-8 22 2m-8-5 19-2M69 74l2-24m10 16 1-26m9 15-1-25m9 12 1-22m4 11 13-12M108 52l14 10m-4-9 23 4m-10-7 19 1m-8-5 17-2M128 38l2-16m9 5 1-17m5 8 14-7" />
    </svg>
  );
}

export default function NewYearLandingPage() {
  return (
    <div className={`${shared.page} ${styles.page}`}>
      <NewYearLandingTracker />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <HomeHeader variant="new-year" />
      <main>
        <nav className={shared.breadcrumb} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link><Arrow /><span aria-current="page">Открытка на Новый год</span>
        </nav>

        <section className={`${shared.section} ${styles.hero}`} aria-labelledby="new-year-title">
          <FirSprig className={`${styles.firSprig} ${styles.firLeft}`} />
          <FirSprig className={`${styles.firSprig} ${styles.firRight}`} />
          <div className={`${shared.shell} ${styles.heroGrid}`}>
            <div className={styles.heroHeading}>
              <p className={styles.eyebrow}>Один новогодний подарок — от всех</p>
              <h1 id="new-year-title">Групповая открытка на Новый год — один подарок от всех</h1>
            </div>
            <div className={styles.coverStack}>
              {themes.map(({ id, name, preview, demoLabel }) => (
                <NewYearDemoLink key={id} theme={id} placement="hero" className={styles.cover} label={`Посмотреть пример. ${demoLabel}`}>
                  <Image src={preview} alt="" width={1120} height={521} preload={id === "red"} loading={id === "green" ? "eager" : undefined} sizes="(max-width: 879px) 46vw, (max-width: 1240px) 43vw, 530px" />
                  <span className={styles.coverCaption}>{name}<Arrow /></span>
                </NewYearDemoLink>
              ))}
              <span className={styles.sparkles} aria-hidden="true"><span /><span /><span /></span>
            </div>
            <div className={styles.heroCopy}>
              <p className={styles.lead}>Соберите поздравления от семьи, друзей или коллег в одну праздничную открытку. Каждый добавит свои тёплые слова по ссылке, а вы дополните подарок фотографиями и вручите его по-особенному.</p>
              <div className={styles.actions}>
                <NewYearCreateForm placement="hero" buttonClassName={primaryButton}>{createLabel}</NewYearCreateForm>
                <a className={secondaryButton} href="#examples">Посмотреть примеры</a>
              </div>
              <p className={styles.trust}>Начните бесплатно · До {CARD_CONTRIBUTION_LIMIT} поздравлений · 399 ₽ за готовую открытку</p>
            </div>
          </div>
        </section>

        <section className={`${shared.section} ${shared.subtleSection}`} aria-labelledby="comparison-title">
          <div className={shared.shell}>
            <div className={`${shared.sectionHeading} ${styles.heading}`}>
              <h2 id="comparison-title">В новогоднем чате пожелания быстро теряются. В открытке — остаются.</h2>
              <p>Кто-то напишет несколько слов, кто-то вспомнит общую историю, а кто-то найдёт пожелание, которое запомнится надолго.</p>
              <p>Отправьте одну ссылку всем, кого хотите пригласить. Slovesto поможет объединить поздравления в красивый подарок.</p>
            </div>
            <div className={styles.comparison}>
              <div className={styles.chat}>
                <h3>Сообщения в чатах</h3>
                <ul>
                  {messages.map(([author, message]) => (
                    <li key={author}><strong>{author}</strong><p>{message}</p></li>
                  ))}
                </ul>
              </div>
              <span className={styles.comparisonArrow}><Arrow /></span>
              <NewYearDemoLink placement="comparison" className={styles.comparisonCard} label="Посмотреть готовую открытку Натальи">
                <Image src="/landing/new-year/example-messages.webp" alt="Личные поздравления и семейные снимки в открытке Натальи" width={1000} height={520} sizes="(max-width: 699px) 90vw, (max-width: 1200px) 56vw, 650px" />
                <span className={styles.coverCaption}>Один подарок с поздравлениями и фото<Arrow /></span>
              </NewYearDemoLink>
            </div>
          </div>
        </section>

        <section id="how-it-works" className={shared.section} aria-labelledby="steps-title">
          <div className={shared.shell}>
            <div className={`${shared.sectionHeading} ${styles.heading}`}><h2 id="steps-title">Как это работает</h2></div>
            <ol className={`${shared.stepsTrack} ${styles.steps}`}>
              {newYearSteps.map(([step, text], index) => (
                <li className={shared.stepItem} key={step}>
                  <span className={shared.stepMarker} aria-hidden="true">{index + 1}</span>
                  <div className={shared.stepBody}><h3>{step}</h3><p>{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="examples" className={`${shared.section} ${shared.subtleSection}`} aria-labelledby="examples-title">
          <div className={shared.shell}>
            <div className={`${shared.sectionHeading} ${styles.heading}`}><h2 id="examples-title">Два праздничных настроения. Один особенный подарок.</h2></div>
            <div className={styles.examplesGrid}>
              {themes.map(({ id, recipient, name, demoLabel, createLabel, description }) => (
                <article key={id} className={styles.example}>
                  <NewYearDemoLink theme={id} placement="examples" className={styles.exampleImage} label={`Открыть пример. ${demoLabel}`}>
                    <Image src={`/landing/new-year/example-${id}.webp`} alt={`Демонстрационная новогодняя открытка. Получатель — ${recipient}`} width={1000} height={432} sizes="(max-width: 699px) 88vw, (max-width: 1200px) 45vw, 545px" />
                  </NewYearDemoLink>
                  <div className={styles.exampleCopy}>
                    <h3>{name}</h3>
                    <p>{description}</p>
                    <p className={styles.demoLabel}>{demoLabel}</p>
                    <div className={styles.actions}>
                      <NewYearCreateForm theme={id} placement="examples" buttonClassName={primaryButton}>{createLabel}</NewYearCreateForm>
                      <NewYearDemoLink theme={id} placement="examples" className={secondaryButton} label={`Посмотреть открытку — ${recipient}`}>Посмотреть открытку</NewYearDemoLink>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={shared.section} aria-labelledby="delivery-title">
          <div className={`${shared.shell} ${styles.featureGrid}`}>
            <NewYearDemoLink placement="animation" className={styles.deliveryArt} label="Посмотреть анимацию «Волшебная доставка»">
              <span className={styles.deliveryScene}>
                <WinterGiftPreview theme="red" templatePreviewSrc={newYearThemeCatalog.red.preview} />
              </span>
              <span className={styles.previewPlay} aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path d="M6 3.5a1 1 0 0 1 1.55-.83l10 6.5a1 1 0 0 1 0 1.66l-10 6.5A1 1 0 0 1 6 16.5z" /></svg>
              </span>
            </NewYearDemoLink>
            <div className={`${shared.exampleCopy} ${styles.featureCopy}`}>
              <p className={styles.eyebrow}>Волшебная доставка</p>
              <h2 id="delivery-title">Пусть вручение открытки станет маленьким новогодним чудом</h2>
              <p>Зимняя ночь, снег, сани с оленями и подарок, приготовленный специально для получателя. Один клик — и волшебная доставка превращается в открытку с тёплыми словами.</p>
              <NewYearDemoLink placement="animation" className={primaryButton}><span className={styles.play} aria-hidden="true">▶</span>Посмотреть анимацию</NewYearDemoLink>
            </div>
          </div>
        </section>

        <section className={`${shared.section} ${shared.subtleSection}`} aria-labelledby="contents-title">
          <div className={shared.shell}>
            <div className={`${shared.sectionHeading} ${styles.heading}`}><h2 id="contents-title">Больше, чем просто новогоднее пожелание</h2></div>
            <div className={`${styles.featureGrid} ${styles.contentsGrid}`}>
              <figure className={styles.moments}>
                <Image src="/landing/new-year/example-moments.webp" alt="Три фотографии с подписями в разделе «Моменты» новогодней открытки" width={1000} height={439} sizes="(max-width: 699px) 90vw, (max-width: 1200px) 46vw, 560px" />
                <figcaption>Семейные моменты из открытки Натальи</figcaption>
              </figure>
              <ul className={styles.contents}>
                {newYearContents.map(([item, text]) => (
                  <li key={item}><h3>{item}</h3><p>{text}</p></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={shared.section} aria-labelledby="audiences-title">
          <div className={shared.shell}>
            <div className={`${shared.sectionHeading} ${styles.heading}`}><h2 id="audiences-title">Для каждого, кому хочется сказать что-то особенное</h2></div>
            <ul className={styles.audiences}>
              {newYearAudiences.map(([audience, text]) => (
                <li key={audience}><h3>{audience}</h3><p>{text}</p></li>
              ))}
            </ul>
          </div>
        </section>

        <section id="price" className={`${shared.section} ${shared.subtleSection}`} aria-labelledby="price-title">
          <div className={shared.shell}>
            <div className={shared.priceCard}>
              <div className={shared.priceHead}><h2 id="price-title">Сначала соберите поздравления. Оплатите перед вручением.</h2></div>
              <div className={shared.priceFlow}>
                <div className={shared.priceState}><span>Пока открытка собирается</span><strong>Бесплатно</strong><p>Создание, приглашение участников, сбор поздравлений, настройка и предварительный просмотр.</p></div>
                <span className={`${shared.priceArrow} ${styles.priceArrow}`}><Arrow /></span>
                <div className={`${shared.priceState} ${shared.priceStateFinal}`}><span>Когда подарок готов</span><strong>399 ₽ <small>за всю открытку</small></strong><p>Финальная подготовка и передача получателю по приватной ссылке.</p></div>
              </div>
              <p className={shared.priceConclusion}>До {CARD_CONTRIBUTION_LIMIT} поздравлений. Цена одинакова при любом количестве участников в пределах лимита.</p>
            </div>
          </div>
        </section>

        <FaqSection items={newYearFaqs} variant="neutral" title="Частые вопросы о новогодней открытке" />

        <section className={shared.section} aria-labelledby="final-title">
          <div className={`${shared.shell} ${shared.finalCard} ${styles.finalCard}`}>
            <h2 id="final-title">Пусть в новом году останутся не только фотографии, но и слова, которые хочется перечитывать</h2>
            <p>Соберите близких по одной ссылке и создайте подарок, в котором будет частичка каждого.</p>
            <NewYearCreateForm placement="final" buttonClassName={primaryButton}>{createLabel}</NewYearCreateForm>
            <span>Начните бесплатно. Оплатить можно перед вручением.</span>
          </div>
          <nav className={`${shared.shell} ${styles.related}`} aria-label="Открытки для других поводов">
            <Link href={BIRTHDAY_LANDING_PATH}>На день рождения</Link>
            <Link href={COLLEAGUE_LANDING_PATH}>Коллеге</Link>
            <Link href={TEACHER_LANDING_PATH}>Учителю</Link>
            <Link href="/example">Все примеры открыток</Link>
          </nav>
        </section>
      </main>
      <HomeFooter variant="neutral" />
    </div>
  );
}
