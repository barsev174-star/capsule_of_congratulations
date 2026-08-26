"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { GiftIntro } from "@/components/gift-intro/gift-intro";
import { ScrollReveal, useScrollReveal } from "@/components/scroll-reveal/scroll-reveal";
import { exampleCardModel, kindergartenDoodlesDemoCardModel, routeAdventureDemoCardModel, schoolClassicDemoCardModel, schoolScrapbookDemoCardModel, teamEditorialDemoCardModel } from "@/lib/example-card";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import { startCardFromShowcaseAction, startColleagueCardFromShowcaseAction } from "../home-actions";
import styles from "./example.module.css";

export type DemoTemplateId = "paper-birthday" | "route-adventure" | "school-scrapbook" | "school-classic" | "kindergarten-doodles" | "team-editorial";

type Props = {
  children: ReactNode;
  routeChildren: ReactNode;
  schoolChildren: ReactNode;
  schoolClassicChildren: ReactNode;
  kindergartenDoodlesChildren: ReactNode;
  teamEditorialChildren: ReactNode;
  initialTemplateId?: DemoTemplateId;
};

type DemoStepId = "template" | "animation" | "recipient_view";

const demoSteps: { id: DemoStepId; label: string }[] = [
  { id: "template", label: "Выбор шаблона" },
  { id: "animation", label: "Анимация" },
  { id: "recipient_view", label: "Результат" }
];

const previewFeatures = [
  "поздравления от участников",
  "фотографии и моменты",
  "общее письмо",
  "лучшие фразы"
];

const previewContributions = exampleCardModel.contributions.slice(0, 2);

export const ExampleExperience = ({ children, routeChildren, schoolChildren, schoolClassicChildren, kindergartenDoodlesChildren, teamEditorialChildren, initialTemplateId }: Props) => {
  const [started, setStarted] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<DemoTemplateId>(initialTemplateId ?? "paper-birthday");
  const [activeStep, setActiveStep] = useState<DemoStepId>("template");
  const demoModelByTemplate: Record<DemoTemplateId, typeof exampleCardModel | typeof schoolScrapbookDemoCardModel> = {
    "paper-birthday": exampleCardModel,
    "route-adventure": routeAdventureDemoCardModel,
    "school-scrapbook": schoolScrapbookDemoCardModel,
    "school-classic": schoolClassicDemoCardModel,
    "kindergarten-doodles": kindergartenDoodlesDemoCardModel,
    "team-editorial": teamEditorialDemoCardModel
  };
  const demoChildrenByTemplate: Record<DemoTemplateId, ReactNode> = {
    "paper-birthday": children,
    "route-adventure": routeChildren,
    "school-scrapbook": schoolChildren,
    "school-classic": schoolClassicChildren,
    "kindergarten-doodles": kindergartenDoodlesChildren,
    "team-editorial": teamEditorialChildren
  };
  const demoIntroByTemplate: Record<DemoTemplateId, {
    subtitle: string;
    accent: string;
    kicker?: string;
    preset?: "default" | "route" | "scrapbook" | "classic";
    decor?: readonly string[];
  }> = {
    "paper-birthday": { subtitle: "для тебя собрали тёплые слова", accent: "#df4f73", preset: "default" },
    "route-adventure": { subtitle: "для тебя собрали друзья", accent: "#b08a4a", preset: "route" },
    "school-scrapbook": {
      subtitle: "для тебя собрала семья",
      accent: "#1859bd",
      kicker: "Открытка",
      preset: "scrapbook",
      decor: [
        "/templates/school-scrapbook/decor-closing-student-doodle-v1.webp",
        "/templates/school-scrapbook/decor-closing-student-girl-doodle-v3.webp"
      ]
    },
    "school-classic": {
      subtitle: "для вас собрали ученики и родители",
      accent: "#e9652f",
      kicker: "Открытка учителю",
      preset: "classic",
      decor: [
        "/templates/school-classic/decor-hero-left-v4.webp",
        "/templates/school-classic/decor-hero-right-v3.webp"
      ]
    },
    "kindergarten-doodles": {
      subtitle: "для вас собрали дети, родители и коллеги",
      accent: "#ef7665",
      kicker: "Открытка воспитателю",
      preset: "scrapbook",
      decor: [
        "/templates/kindergarten-doodles/decor-hero-drawing-v5.webp",
        "/templates/kindergarten-doodles/decor-hero-still-life.webp"
      ]
    },
    "team-editorial": {
      subtitle: "для тебя собрали коллеги",
      accent: "#2f6f70",
      kicker: "Открытка от команды",
      preset: "classic",
      decor: [
        "/templates/team-editorial/hero-left-v2.webp",
        "/templates/team-editorial/hero-right-v2.webp"
      ]
    }
  };
  const selectedDemoModel = demoModelByTemplate[selectedTemplateId];
  const createAction = selectedTemplateId === "team-editorial"
    ? startColleagueCardFromShowcaseAction
    : startCardFromShowcaseAction;

  const viewedStepsRef = useRef<Set<DemoStepId>>(new Set());

  const trackStepViewed = (step: DemoStepId) => {
    if (viewedStepsRef.current.has(step)) return;
    viewedStepsRef.current.add(step);
    sendClientTelemetry("demo_scroll_step_viewed", { route: "/example", step });
  };

  // Section reveals (also fire demo_scroll_step_viewed once per view).
  const templateSection = useScrollReveal<HTMLElement>({ variant: "fade-up", duration: 560, onReveal: () => trackStepViewed("template") });
  const animationSection = useScrollReveal<HTMLElement>({ variant: "fade-up", duration: 560, onReveal: () => trackStepViewed("animation") });
  const previewSection = useScrollReveal<HTMLElement>({ variant: "fade-up", duration: 560, onReveal: () => trackStepViewed("recipient_view") });
  const bottomCtaSection = useScrollReveal<HTMLElement>({ variant: "scale-in", duration: 520 });

  // Hero.
  const heroVisual = useScrollReveal<HTMLDivElement>({ variant: "slide-right", duration: 720, delay: 180 });

  // Animation block columns.
  const animationAsset = useScrollReveal<HTMLDivElement>({ variant: "slide-left", duration: 560 });
  const animationInfo = useScrollReveal<HTMLDivElement>({ variant: "slide-left", duration: 560, delay: 90 });
  const animationScene = useScrollReveal<HTMLDivElement>({ variant: "slide-right", duration: 560, delay: 60 });

  // Preview block columns.
  const previewVisual = useScrollReveal<HTMLDivElement>({ variant: "slide-left", duration: 700 });
  const previewTitle = useScrollReveal<HTMLHeadingElement>({ variant: "slide-right", duration: 560, delay: 60 });
  const previewText = useScrollReveal<HTMLParagraphElement>({ variant: "slide-right", duration: 560, delay: 140 });
  const previewCta = useScrollReveal<HTMLButtonElement>({ variant: "slide-right", duration: 560, delay: 220 });
  const previewFeaturesList = useScrollReveal<HTMLUListElement>({ variant: "stagger", duration: 480, delay: 280, step: 70 });

  useEffect(() => {
    sendClientTelemetry("demo_page_view", { route: "/example" });
  }, []);

  // Subtle parallax for the recipient-view collage (desktop only, reduced-motion safe).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const section = document.querySelector<HTMLElement>('[data-demo-step="recipient_view"]');
    if (!section) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (window.innerWidth < 1100) {
        section.style.removeProperty("--parallax-front");
        section.style.removeProperty("--parallax-back");
        return;
      }
      const rect = section.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) / (window.innerHeight / 2);
      const clamped = Math.max(-1, Math.min(1, offset));
      section.style.setProperty("--parallax-front", `${(-clamped * 5).toFixed(2)}px`);
      section.style.setProperty("--parallax-back", `${(-clamped * 2.5).toFixed(2)}px`);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Scroll-progress indicator: track which step section is in view.
  useEffect(() => {
    const sections = demoSteps
      .map((step) => ({ id: step.id, element: document.querySelector<HTMLElement>(`[data-demo-step="${step.id}"]`) }))
      .filter((item): item is { id: DemoStepId; element: HTMLElement } => Boolean(item.element));
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const step = sections.find((item) => item.element === entry.target);
          if (step) setActiveStep(step.id);
        });
      },
      { threshold: 0.35 }
    );
    sections.forEach((item) => observer.observe(item.element));
    return () => observer.disconnect();
  }, []);

  const selectTemplate = (templateId: DemoTemplateId) => {
    if (templateId === selectedTemplateId) return;
    setSelectedTemplateId(templateId);
    sendClientTelemetry("demo_template_selected", { route: "/example", template: templateId });
  };

  const trackCreateClicked = (source: string) => {
    sendClientTelemetry("demo_create_clicked", { route: "/example", source });
  };

  const openDemo = () => {
    sendClientTelemetry("demo_animation_started", { route: "/example", template: selectedTemplateId });
    setStarted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (started) {
    return (
      <GiftIntro
        recipientName={selectedDemoModel.recipientName}
        subtitle={demoIntroByTemplate[selectedTemplateId].subtitle}
        fromLabel={selectedDemoModel.fromLabel}
        previewKicker={demoIntroByTemplate[selectedTemplateId].kicker}
        previewPreset={demoIntroByTemplate[selectedTemplateId].preset}
        previewDecor={demoIntroByTemplate[selectedTemplateId].decor}
        templateId={selectedTemplateId}
        animationId="envelope"
        accent={demoIntroByTemplate[selectedTemplateId].accent}
        onIntroDone={() => sendClientTelemetry("demo_card_opened", { route: "/example", template: selectedTemplateId })}
      >
        {demoChildrenByTemplate[selectedTemplateId]}
      </GiftIntro>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <ScrollReveal variant="fade-down" duration={420}>
            <Link href="/" className={styles.brand} aria-label="Slovesto — на главную">
              <BrandLogo variant="marketing" />
            </Link>
          </ScrollReveal>
          <ScrollReveal variant="fade-down" duration={420} delay={100}>
            <span className={styles.demoBadge}>Демонстрационная открытка</span>
          </ScrollReveal>
        </header>

        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <ScrollReveal variant="fade-up">
              <p className={styles.eyebrow}>Посмотрите подарок глазами получателя</p>
            </ScrollReveal>
            <ScrollReveal variant="fade-up" delay={80}>
              <h1 id="hero-title" className={styles.heroTitle}>
                Посмотрите, какой подарок получится из ваших слов
              </h1>
            </ScrollReveal>
            <ScrollReveal variant="fade-up" delay={160}>
              <p className={styles.heroSubtitle}>
                Выберите пример и способ открытия. Внутри — поздравления, фотографии и тёплые слова,
                собранные в один подарок.
              </p>
            </ScrollReveal>
            <ScrollReveal variant="fade-up" delay={240}>
              <div className={styles.heroActions}>
                <button type="button" className={styles.primaryButton} onClick={openDemo}>
                  <span aria-hidden="true">▶</span>
                  Открыть демонстрационную открытку
                </button>
                <form action={createAction} onSubmit={() => trackCreateClicked("hero")}>
                  <button type="submit" className={styles.secondaryButton}>
                    Создать такую же
                  </button>
                </form>
              </div>
            </ScrollReveal>
          </div>

          <div {...heroVisual} className={styles.heroVisual} aria-hidden="true">
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

        <section
          {...templateSection}
          className={styles.block}
          aria-labelledby="template-heading"
          data-demo-step="template"
        >
          <div className={styles.blockHeader}>
            <span className={styles.blockNumber}>1</span>
            <div className={styles.blockHeaderText}>
              <h2 id="template-heading">Выберите пример открытки</h2>
              <p>Все шесть примеров уже доступны: выберите настроение, которое подходит вашему подарку.</p>
            </div>
          </div>

          <div className={styles.templateGrid}>
            <ScrollReveal variant="slide-left" duration={560}>
              <button
                type="button"
                className={`${styles.templateCard} ${styles.templateCardSelectable} ${selectedTemplateId === "paper-birthday" ? styles.templateCardActive : ""}`}
                onClick={() => selectTemplate("paper-birthday")}
                aria-pressed={selectedTemplateId === "paper-birthday"}
              >
                <div className={styles.templateCardThumb}>
                  <Image
                    src="/assets/example/template-paper-thumb.png"
                    alt=""
                    fill
                    sizes="(max-width: 640px) 92vw, (max-width: 900px) 45vw, 33vw"
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
            </ScrollReveal>

            <ScrollReveal variant="slide-right" duration={560} delay={120}>
              <button
                type="button"
                className={`${styles.templateCard} ${styles.templateCardSelectable} ${styles.templateCardRoute} ${selectedTemplateId === "route-adventure" ? styles.templateCardActive : ""}`}
                onClick={() => selectTemplate("route-adventure")}
                aria-pressed={selectedTemplateId === "route-adventure"}
              >
                <div className={styles.templateCardThumb}>
                  <Image
                    src="/assets/landing/template-route-adventure-preview.png"
                    alt=""
                    fill
                    sizes="(max-width: 640px) 92vw, (max-width: 900px) 45vw, 33vw"
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
            </ScrollReveal>

            <ScrollReveal variant="slide-right" duration={560} delay={240}>
              <button
                type="button"
                className={`${styles.templateCard} ${styles.templateCardSelectable} ${selectedTemplateId === "team-editorial" ? styles.templateCardActive : ""}`}
                onClick={() => selectTemplate("team-editorial")}
                aria-pressed={selectedTemplateId === "team-editorial"}
              >
                <div className={styles.templateCardThumb}>
                  <Image
                    src="/templates/team-editorial/preview-v4.webp"
                    alt=""
                    fill
                    sizes="(max-width: 640px) 92vw, (max-width: 900px) 45vw, 33vw"
                    className={styles.templateThumbImage}
                  />
                </div>
                <div className={styles.templateCardMeta}>
                  <span className={selectedTemplateId === "team-editorial" ? styles.badgeTemplateSelected : styles.badgeTemplateAvailable}>
                    {selectedTemplateId === "team-editorial" ? "✓ Выбрано" : "Выбрать"}
                  </span>
                  <strong>Вместе</strong>
                  <span>Повышение, важный этап или благодарность от команды</span>
                </div>
              </button>
            </ScrollReveal>

            <ScrollReveal variant="slide-right" duration={560} delay={320}>
              <button
                type="button"
                className={`${styles.templateCard} ${styles.templateCardSelectable} ${selectedTemplateId === "school-classic" ? styles.templateCardActive : ""}`}
                onClick={() => selectTemplate("school-classic")}
                aria-pressed={selectedTemplateId === "school-classic"}
              >
                <div className={styles.templateCardThumb}>
                  <Image
                    src="/templates/school-classic/preview-v6.webp"
                    alt=""
                    fill
                    sizes="(max-width: 640px) 92vw, (max-width: 900px) 45vw, 25vw"
                    className={styles.templateThumbImage}
                  />
                </div>
                <div className={styles.templateCardMeta}>
                  <span className={selectedTemplateId === "school-classic" ? styles.badgeTemplateSelected : styles.badgeTemplateAvailable}>
                    {selectedTemplateId === "school-classic" ? "✓ Выбрано" : "Выбрать"}
                  </span>
                  <strong>Школьный классический</strong>
                  <span>Благодарность учителю от учеников и родителей</span>
                </div>
              </button>
            </ScrollReveal>

            <ScrollReveal variant="slide-right" duration={560} delay={400}>
              <button
                type="button"
                className={`${styles.templateCard} ${styles.templateCardSelectable} ${selectedTemplateId === "school-scrapbook" ? styles.templateCardActive : ""}`}
                onClick={() => selectTemplate("school-scrapbook")}
                aria-pressed={selectedTemplateId === "school-scrapbook"}
              >
                <div className={styles.templateCardThumb}>
                  <Image
                    src="/templates/school-scrapbook/preview.webp"
                    alt=""
                    fill
                    sizes="(max-width: 640px) 92vw, (max-width: 900px) 45vw, 33vw"
                    className={styles.templateThumbImage}
                  />
                </div>
                <div className={styles.templateCardMeta}>
                  <span className={selectedTemplateId === "school-scrapbook" ? styles.badgeTemplateSelected : styles.badgeTemplateAvailable}>
                    {selectedTemplateId === "school-scrapbook" ? "✓ Выбрано" : "Выбрать"}
                  </span>
                  <strong>Школьный коллаж</strong>
                  <span>Первое сентября, школа, семья и друзья</span>
                </div>
              </button>
            </ScrollReveal>

            <ScrollReveal variant="slide-right" duration={560} delay={480}>
              <button
                type="button"
                className={`${styles.templateCard} ${styles.templateCardSelectable} ${selectedTemplateId === "kindergarten-doodles" ? styles.templateCardActive : ""}`}
                onClick={() => selectTemplate("kindergarten-doodles")}
                aria-pressed={selectedTemplateId === "kindergarten-doodles"}
              >
                <div className={styles.templateCardThumb}>
                  <Image
                    src="/templates/kindergarten-doodles/preview.webp"
                    alt=""
                    fill
                    sizes="(max-width: 640px) 92vw, (max-width: 900px) 45vw, 33vw"
                    className={styles.templateThumbImage}
                  />
                </div>
                <div className={styles.templateCardMeta}>
                  <span className={selectedTemplateId === "kindergarten-doodles" ? styles.badgeTemplateSelected : styles.badgeTemplateAvailable}>
                    {selectedTemplateId === "kindergarten-doodles" ? "✓ Выбрано" : "Выбрать"}
                  </span>
                  <strong>Детство в рисунках</strong>
                  <span>Благодарность воспитателю от детей, родителей и коллег</span>
                </div>
              </button>
            </ScrollReveal>
          </div>

          <p className={styles.blockFooter}>
            Выберите шаблон и нажмите «Открыть демонстрационную открытку».
          </p>
        </section>

        <section
          {...animationSection}
          className={styles.block}
          aria-labelledby="animation-heading"
          data-demo-step="animation"
        >
          <div className={styles.blockHeader}>
            <span className={styles.blockNumber}>2</span>
            <div className={styles.blockHeaderText}>
              <h2 id="animation-heading">Выберите анимацию открытия</h2>
              <p>Получатель сначала увидит конверт, а затем открытка раскроется на экране.</p>
            </div>
          </div>

          <div className={styles.animationLayout}>
            <div {...animationAsset} className={styles.animationAssetWrap}>
              <Image
                src="/assets/example/animation-envelope.png"
                alt=""
                width={1254}
                height={1254}
                className={styles.animationAsset}
                sizes="(max-width: 640px) 160px, 220px"
              />
            </div>

            <div {...animationInfo} className={styles.animationInfo}>
              <span className={styles.badgeSelected}>Выбрано</span>
              <strong>Конверт с открыткой</strong>
              <p>Мягкое открытие клапана и появление готовой открытки.</p>
              <button type="button" className={styles.ghostButton} onClick={openDemo}>
                <span aria-hidden="true">▶</span>
                Запустить анимацию
              </button>
            </div>

            <div {...animationScene} className={styles.animationScene}>
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

        <section
          {...previewSection}
          className={styles.block}
          aria-labelledby="preview-heading"
          data-demo-step="recipient_view"
        >
          <div className={styles.blockHeader}>
            <span className={styles.blockNumber}>3</span>
            <div className={styles.blockHeaderText}>
              <h2 id="preview-heading">Посмотрите открытку глазами получателя</h2>
              <p>
                Откройте пример и увидьте, как поздравления, фото и тёплые слова превращаются в
                готовый подарок.
              </p>
            </div>
          </div>

          <div className={styles.previewLayout}>
            <div {...previewVisual} className={styles.previewVisual}>
              <Image
                src="/assets/example/gift-preview-neutral.png"
                alt=""
                fill
                className={styles.previewAsset}
                sizes="(max-width: 900px) 70vw, 420px"
              />
            </div>

            <div className={styles.previewContent}>
              <h3 {...previewTitle}>Не просто список сообщений</h3>
              <p {...previewText}>
                Получатель увидит красивую страницу с поздравлениями, фотографиями и словами,
                которые хочется сохранить.
              </p>
              <button
                {...previewCta}
                type="button"
                className={styles.primaryButton}
                onClick={openDemo}
              >
                Открыть демонстрационную открытку
                <span aria-hidden="true">→</span>
              </button>
              <ul {...previewFeaturesList} className={styles.previewFeatures}>
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

        <section {...bottomCtaSection} className={styles.bottomCta} aria-labelledby="bottom-cta-title">
          <div className={styles.bottomCtaDecor} aria-hidden="true">
            <span>✉</span>
          </div>
          <div className={styles.bottomCtaText}>
            <h2 id="bottom-cta-title">Хотите собрать такую же открытку?</h2>
            <p>Создайте открытку, отправьте ссылку друзьям — и получите готовый подарок от всех.</p>
          </div>
          <form action={createAction} onSubmit={() => trackCreateClicked("bottom_cta")}>
            <button type="submit" className={styles.primaryButton}>
              Создать открытку
              <span aria-hidden="true">♡</span>
            </button>
          </form>
        </section>
      </div>

      <nav className={styles.stepIndicator} aria-label="Шаги демонстрации">
        {demoSteps.map((step) => (
          <button
            key={step.id}
            type="button"
            className={`${styles.stepIndicatorItem} ${activeStep === step.id ? styles.stepIndicatorItemActive : ""}`}
            aria-current={activeStep === step.id ? "true" : undefined}
            title={step.label}
            onClick={() => {
              document.querySelector(`[data-demo-step="${step.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            <span className={styles.stepIndicatorDot} aria-hidden="true" />
            <span className={styles.stepIndicatorLabel}>{step.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
};
