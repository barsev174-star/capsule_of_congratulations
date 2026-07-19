"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { GiftIntro } from "@/components/gift-intro/gift-intro";
import { exampleCardModel, routeAdventureDemoCardModel } from "@/lib/example-card";
import { startCardFromShowcaseAction } from "../home-actions";
import styles from "./example.module.css";

type Props = {
  children: ReactNode;
  routeChildren: ReactNode;
};

const heroChips = [
  { text: "от друзей и коллег", icon: "people" as const },
  { text: "С днём рождения!", icon: "cake" as const },
  { text: "6 поздравлений", icon: "heart" as const },
  { text: "до 280 символов", icon: "pencil" as const }
];

const previewFeatures = [
  "поздравления от участников",
  "фотографии и моменты",
  "общее письмо",
  "лучшие фразы"
];

const previewContributions = exampleCardModel.contributions.slice(0, 2);

export const ExampleExperience = ({ children, routeChildren }: Props) => {
  const [started, setStarted] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<"paper-birthday" | "route-adventure">("paper-birthday");
  const selectedDemoModel = selectedTemplateId === "route-adventure" ? routeAdventureDemoCardModel : exampleCardModel;

  const openDemo = () => {
    setStarted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (started) {
    return (
      <GiftIntro
        slug={selectedDemoModel.finalSlug}
        recipientName={selectedDemoModel.recipientName}
        subtitle={selectedTemplateId === "route-adventure" ? "для тебя собрали друзья" : "для тебя собрали тёплые слова"}
        fromLabel={selectedDemoModel.fromLabel}
        templateId={selectedTemplateId}
        animationId="envelope"
        accent={selectedTemplateId === "route-adventure" ? "#b08a4a" : "#df4f73"}
        forceIntro
      >
        {selectedTemplateId === "route-adventure" ? routeChildren : children}
      </GiftIntro>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Slovesto — на главную">
            <BrandLogo variant="marketing" />
          </Link>
          <span className={styles.demoBadge}>Демонстрационная открытка</span>
        </header>

        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Посмотрите подарок глазами получателя</p>
            <h1 id="hero-title" className={styles.heroTitle}>
              Посмотрите, какой подарок получится из ваших слов
            </h1>
            <p className={styles.heroSubtitle}>
              Выберите пример и способ открытия. Внутри — поздравления, фотографии и тёплые слова,
              собранные в один подарок.
            </p>
            <div className={styles.heroActions}>
              <button type="button" className={styles.primaryButton} onClick={openDemo}>
                <span aria-hidden="true">▶</span>
                Открыть демонстрационную открытку
              </button>
              <form action={startCardFromShowcaseAction}>
                <button type="submit" className={styles.secondaryButton}>
                  Создать такую же
                </button>
              </form>
            </div>
            <div className={styles.heroChips}>
              {heroChips.map((chip) => (
                <span key={chip.text} className={styles.heroChip}>
                  <ChipIcon name={chip.icon} />
                  {chip.text}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.heroAssetWrap}>
              <Image
                src="/assets/example/hero-envelope.png"
                alt=""
                width={1536}
                height={1024}
                className={styles.heroAsset}
                priority
                sizes="(max-width: 1020px) 90vw, 540px"
              />
            </div>
          </div>
        </section>

        <section className={styles.block} aria-labelledby="template-heading">
          <div className={styles.blockHeader}>
            <span className={styles.blockNumber}>1</span>
            <div>
              <h2 id="template-heading">Выберите пример открытки</h2>
              <p>Оба примера уже доступны: выберите настроение, которое подходит вашему подарку.</p>
            </div>
          </div>

          <div className={styles.templateGrid}>
            <button
              type="button"
              className={`${styles.templateCard} ${styles.templateCardSelectable} ${selectedTemplateId === "paper-birthday" ? styles.templateCardActive : ""}`}
              onClick={() => setSelectedTemplateId("paper-birthday")}
              aria-pressed={selectedTemplateId === "paper-birthday"}
            >
              <div className={styles.templateCardThumb}>
                <Image
                  src="/assets/example/template-paper-thumb.png"
                  alt=""
                  fill
                  sizes="(max-width: 640px) 45vw, 220px"
                  className={styles.templateThumbImage}
                />
              </div>
              <div className={styles.templateCardMeta}>
                <span className={selectedTemplateId === "paper-birthday" ? styles.badgeTemplateSelected : styles.badgeTemplateAvailable}>
                  {selectedTemplateId === "paper-birthday" ? "✓ Выбрано" : "Выбрать"}
                </span>
                <strong>Бумажный классический</strong>
                <span>День рождения от друзей и коллег</span>
              </div>
            </button>

            <button
              type="button"
              className={`${styles.templateCard} ${styles.templateCardSelectable} ${styles.templateCardRoute} ${selectedTemplateId === "route-adventure" ? styles.templateCardActive : ""}`}
              onClick={() => setSelectedTemplateId("route-adventure")}
              aria-pressed={selectedTemplateId === "route-adventure"}
            >
              <div className={styles.templateCardThumb}>
                <Image
                  src="/assets/landing/template-route-adventure-preview.png"
                  alt=""
                  fill
                  sizes="(max-width: 640px) 45vw, 220px"
                  className={styles.templateThumbImage}
                />
              </div>
              <div className={styles.templateCardMeta}>
                <span className={selectedTemplateId === "route-adventure" ? styles.badgeTemplateSelected : styles.badgeTemplateAvailable}>
                  {selectedTemplateId === "route-adventure" ? "✓ Выбрано" : "Выбрать"}
                </span>
                <strong>Маршрут</strong>
                <span>Приключения, горы и тёплые воспоминания от друзей</span>
              </div>
            </button>
          </div>

          <p className={styles.blockFooter}>
            Выберите шаблон и нажмите «Открыть демонстрационную открытку».
          </p>
        </section>

        <section className={styles.block} aria-labelledby="animation-heading">
          <div className={styles.blockHeader}>
            <span className={styles.blockNumber}>2</span>
            <div>
              <h2 id="animation-heading">Выберите анимацию открытия</h2>
              <p>Получатель сначала увидит конверт, а затем открытка раскроется на экране.</p>
            </div>
          </div>

          <div className={styles.animationLayout}>
            <div className={styles.animationAssetWrap}>
              <Image
                src="/assets/example/animation-envelope.png"
                alt=""
                width={1254}
                height={1254}
                className={styles.animationAsset}
                sizes="(max-width: 640px) 160px, 220px"
              />
            </div>

            <div className={styles.animationInfo}>
              <span className={styles.badgeSelected}>Выбрано</span>
              <strong>Конверт с открыткой</strong>
              <p>Мягкое открытие клапана и появление готовой открытки.</p>
              <button type="button" className={styles.ghostButton} onClick={openDemo}>
                <span aria-hidden="true">▶</span>
                Запустить анимацию
              </button>
            </div>

            <div className={styles.animationScene}>
              <div className={styles.animationSceneStep}>
                <div className={styles.paperEnvelopeClosed}>
                  <Image
                    src="/assets/gift/envelope-closed.png"
                    alt=""
                    fill
                    sizes="180px"
                    className={styles.storyEnvelopeAsset}
                  />
                  <div className={styles.paperEnvelopeClosedFlap} />
                  <div className={styles.paperEnvelopeClosedSeal}>♡</div>
                </div>
                <span>Сначала конверт</span>
              </div>
              <span className={styles.animationSceneArrow} aria-hidden="true">→</span>
              <div className={styles.animationSceneStep}>
                <div className={styles.paperCardOpen}>
                  <Image
                    src="/assets/gift/envelope-open.png"
                    alt=""
                    fill
                    sizes="180px"
                    className={styles.storyEnvelopeAsset}
                  />
                  <div className={styles.paperCardOpenCard} />
                  <div className={styles.paperCardOpenEnvelope}>
                    <div className={styles.paperCardOpenSeal}>♡</div>
                  </div>
                </div>
                <span>Затем открытка раскроется</span>
              </div>
            </div>
          </div>

          <p className={styles.blockFooter}>Позже добавим листание страниц и мягкое появление.</p>
        </section>

        <section className={styles.block} aria-labelledby="preview-heading">
          <div className={styles.blockHeader}>
            <span className={styles.blockNumber}>3</span>
            <div>
              <h2 id="preview-heading">Посмотрите открытку глазами получателя</h2>
              <p>
                Откройте пример и увидьте, как поздравления, фото и тёплые слова превращаются в
                готовый подарок.
              </p>
            </div>
          </div>

          <div className={styles.previewLayout}>
            <div className={styles.previewVisual}>
              <Image
                src="/assets/example/gift-preview-neutral.png"
                alt=""
                fill
                className={styles.previewAsset}
                sizes="(max-width: 900px) 70vw, 420px"
              />
            </div>

            <div className={styles.previewContent}>
              <h3>Не просто список сообщений</h3>
              <p>
                Получатель увидит красивую страницу с поздравлениями, фотографиями и словами,
                которые хочется сохранить.
              </p>
              <button type="button" className={styles.primaryButton} onClick={openDemo}>
                Открыть демонстрационную открытку
                <span aria-hidden="true">→</span>
              </button>
              <ul className={styles.previewFeatures}>
                {previewFeatures.map((feature) => (
                  <li key={feature}>
                    <span aria-hidden="true">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.bottomCta} aria-labelledby="bottom-cta-title">
          <div className={styles.bottomCtaDecor} aria-hidden="true">
            <span>✉</span>
          </div>
          <div className={styles.bottomCtaText}>
            <h2 id="bottom-cta-title">Хотите собрать такую же открытку?</h2>
            <p>Создайте открытку, отправьте ссылку друзьям — и получите готовый подарок от всех.</p>
          </div>
          <form action={startCardFromShowcaseAction}>
            <button type="submit" className={styles.primaryButton}>
              Создать открытку
              <span aria-hidden="true">♡</span>
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};

function ChipIcon({ name }: { name: "people" | "cake" | "heart" | "pencil" }) {
  if (name === "people") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17" cy="9" r="2.8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 19c0-2.8 2.5-5 6-5s6 2.2 6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M15 17.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "cake") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 16h16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M4 16l3-3 3 3 4-4 3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 7v3m0-3c0-1.5 2-2 2-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 7c0-1.5-2-2-2-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 21h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
