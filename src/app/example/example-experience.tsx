"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { GiftIntro } from "@/components/gift-intro/gift-intro";
import type { GiftIntroProps, GiftIntroVariant } from "@/components/gift-intro/gift-intro";
import { ScrollReveal, useScrollReveal } from "@/components/scroll-reveal/scroll-reveal";
import { exampleCardModel, kindergartenDoodlesDemoCardModel, routeAdventureDemoCardModel, schoolClassicDemoCardModel, schoolScrapbookDemoCardModel, teamEditorialDemoCardModel } from "@/lib/example-card";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import { birthdayExampleCardModel } from "@/lib/birthday-example";
import type { GiftAnimationId } from "@/lib/gift-animations";
import { toGiftRevealExcerpt } from "@/lib/gift-reveal-preview";
import { startCardFromExampleSelectionAction } from "../home-actions";
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
  initialAnimationId?: GiftAnimationId;
  birthdayScenario?: boolean;
  introVariant?: GiftIntroVariant;
  forceFullMotion?: boolean;
  previewPhotoCount?: 0 | 1 | 2 | 3;
};

type DemoStepId = "template" | "animation" | "recipient_view";

const previewFeatures = [
  "поздравления от участников",
  "фотографии и моменты",
  "общее письмо",
  "лучшие фразы"
];

const demoTemplateMeta: Record<DemoTemplateId, { name: string; preview: string; objectPosition?: string }> = {
  "paper-birthday": {
    name: "Бумажный классический",
    preview: "/assets/example/template-paper-thumb.png",
    objectPosition: "center"
  },
  "route-adventure": {
    name: "Маршрут",
    preview: "/assets/landing/template-route-adventure-preview.png",
    objectPosition: "center"
  },
  "school-scrapbook": {
    name: "Школьный коллаж",
    preview: "/templates/school-scrapbook/preview.webp",
    objectPosition: "center"
  },
  "school-classic": {
    name: "Школьный классический",
    preview: "/templates/school-classic/preview-v6.webp",
    objectPosition: "center"
  },
  "kindergarten-doodles": {
    name: "Детство в рисунках",
    preview: "/templates/kindergarten-doodles/preview.webp",
    objectPosition: "center"
  },
  "team-editorial": {
    name: "Вместе",
    preview: "/templates/team-editorial/preview-v4.webp",
    objectPosition: "center"
  }
};

const revealNames: Record<GiftAnimationId, string> = {
  envelope: "Конверт",
  "collect-messages": "Собрать поздравления"
};

const StoryPhotoPlaceholder = () => (
  <svg className={styles.storyPhotoGlyph} viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="29" cy="11" r="4" />
    <path d="M6 31 16 20l7 7 4-4 7 8" />
  </svg>
);

export const ExampleExperience = ({ children, routeChildren, schoolChildren, schoolClassicChildren, kindergartenDoodlesChildren, teamEditorialChildren, initialTemplateId, initialAnimationId, birthdayScenario = false, introVariant = "assembled", forceFullMotion = false, previewPhotoCount = 3 }: Props) => {
  const [started, setStarted] = useState(birthdayScenario);
  const [selectedTemplateId, setSelectedTemplateId] = useState<DemoTemplateId>(initialTemplateId ?? "paper-birthday");
  const [selectedRevealType, setSelectedRevealType] = useState<GiftAnimationId>(initialAnimationId ?? (birthdayScenario ? "envelope" : "collect-messages"));
  const demoModelByTemplate: Record<DemoTemplateId, typeof exampleCardModel | typeof schoolScrapbookDemoCardModel> = {
    "paper-birthday": birthdayScenario ? birthdayExampleCardModel : exampleCardModel,
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
    visualPreset: NonNullable<GiftIntroProps["visualPreset"]>;
    decor?: readonly string[];
  }> = {
    "paper-birthday": { subtitle: "для тебя собрали тёплые слова", accent: "#df4f73", preset: "default", visualPreset: "paper-celebration" },
    "route-adventure": { subtitle: "для тебя собрали друзья", accent: "#b08a4a", preset: "route", visualPreset: "expedition" },
    "school-scrapbook": {
      subtitle: "для тебя собрала семья",
      accent: "#1859bd",
      kicker: "Открытка",
      preset: "scrapbook",
      visualPreset: "school-playful",
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
      visualPreset: "school-formal",
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
      visualPreset: "caregiver-playful",
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
      visualPreset: "editorial",
      decor: [
        "/templates/team-editorial/hero-left-v2.webp",
        "/templates/team-editorial/hero-right-v2.webp"
      ]
    }
  };
  const selectedDemoModel = demoModelByTemplate[selectedTemplateId];
  const selectedDemoPhotos = "mediaAssets" in selectedDemoModel
    ? selectedDemoModel.mediaAssets.slice(0, previewPhotoCount).map((asset) => ({
        id: asset.id,
        src: asset.publicUrl,
        alt: asset.captionTitle || asset.captionSubtitle || `Фотография для открытки ${selectedDemoModel.recipientName}`,
        objectPosition: `${asset.cropX ?? 50}% ${asset.cropY ?? 50}%`
      }))
    : [...selectedDemoModel.messagePhotos, ...selectedDemoModel.memoryPhotos].slice(0, previewPhotoCount).map((photo) => ({
        id: photo.id,
        src: photo.src,
        alt: photo.alt,
        objectPosition: `${photo.crop.x * 100}% ${photo.crop.y * 100}%`
      }));
  const selectedDemoHeadline = "summaryText" in selectedDemoModel
    ? selectedDemoModel.summaryText
    : selectedDemoModel.mainGreeting;
  const selectedDemoPhrases = "quotes" in selectedDemoModel
    ? selectedDemoModel.quotes
    : selectedDemoModel.privateQuotes;
  const selectedDemoMessages = selectedDemoModel.contributions.slice(0, 6).map((contribution, index) => ({
    id: contribution.id,
    authorName: contribution.authorName,
    excerpt: toGiftRevealExcerpt(contribution.message),
    isMain: index === 0
  }));
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

  const selectTemplate = (templateId: DemoTemplateId) => {
    if (templateId === selectedTemplateId) return;
    setSelectedTemplateId(templateId);
    sendClientTelemetry("demo_template_selected", { route: "/example", template: templateId });
  };

  const selectAnimation = (animationId: GiftAnimationId) => {
    if (animationId === selectedRevealType) return;
    setSelectedRevealType(animationId);
    sendClientTelemetry("demo_reveal_selected", {
      route: "/example",
      template: selectedTemplateId,
      animation: animationId
    });
  };

  const moveRevealSelection = (event: KeyboardEvent<HTMLButtonElement>, nextReveal: GiftAnimationId) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    selectAnimation(nextReveal);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-reveal-option="${nextReveal}"]`)?.focus();
    });
  };

  const trackCreateClicked = (placement: "hero" | "bottom_cta") => {
    sendClientTelemetry("demo_create_clicked", {
      route: "/example",
      source: "demo_page",
      placement,
      template: selectedTemplateId,
      animation: selectedRevealType
    });
  };

  const openDemo = (source: "animation_preview" | "recipient_view") => {
    sendClientTelemetry("demo_animation_started", {
      route: "/example",
      source,
      template: selectedTemplateId,
      animation: selectedRevealType
    });
    sendClientTelemetry(source === "animation_preview" ? "demo_animation_preview_opened" : "demo_gift_opened", {
      route: "/example",
      template: selectedTemplateId,
      animation: selectedRevealType
    });
    setStarted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToTemplates = () => {
    document.querySelector('[data-demo-step="template"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (started) {
    return (
      <GiftIntro
        recipientName={selectedDemoModel.recipientName}
        variant={introVariant}
        forceFullMotion={forceFullMotion}
        subtitle={demoIntroByTemplate[selectedTemplateId].subtitle}
        fromLabel={selectedDemoModel.fromLabel}
        previewKicker={demoIntroByTemplate[selectedTemplateId].kicker}
        previewPreset={demoIntroByTemplate[selectedTemplateId].preset}
        visualPreset={demoIntroByTemplate[selectedTemplateId].visualPreset}
        previewDecor={demoIntroByTemplate[selectedTemplateId].decor}
        templateId={selectedTemplateId}
        animationId={selectedRevealType}
        accent={demoIntroByTemplate[selectedTemplateId].accent}
        assemblyPreview={{
          headline: selectedDemoHeadline,
          messages: selectedDemoMessages,
          qualities: selectedDemoModel.qualities.slice(0, 5),
          phrases: selectedDemoPhrases.slice(0, 3),
          photos: selectedDemoPhotos
        }}
        onIntroDone={() => sendClientTelemetry("demo_card_opened", {
          route: "/example",
          template: selectedTemplateId,
          animation: selectedRevealType
        })}
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
                <button type="button" className={styles.primaryButton} onClick={scrollToTemplates}>
                  Выбрать пример
                  <span aria-hidden="true">↓</span>
                </button>
                <form action={startCardFromExampleSelectionAction} onSubmit={() => trackCreateClicked("hero")}>
                  <input type="hidden" name="templateId" value={selectedTemplateId} />
                  <input type="hidden" name="giftAnimationId" value={selectedRevealType} />
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
              <p>Выберите стиль, который подходит вашему поводу и настроению.</p>
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
            Шаблон выбран. Теперь выберите способ открытия.
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
              <p>Выберите, как получатель впервые увидит открытку.</p>
            </div>
          </div>

          <div className={styles.revealOptions} role="radiogroup" aria-label="Способ открытия открытки">
            <button
              type="button"
              role="radio"
              aria-checked={selectedRevealType === "envelope"}
              aria-label="Конверт — классическое вручение"
              tabIndex={selectedRevealType === "envelope" ? 0 : -1}
              data-reveal-option="envelope"
              className={`${styles.revealOption} ${selectedRevealType === "envelope" ? styles.revealOptionActive : ""}`}
              onClick={() => selectAnimation("envelope")}
              onKeyDown={(event) => moveRevealSelection(event, "collect-messages")}
            >
              <span
                className={`${styles.revealOptionPreview} ${styles.envelopePreview}`}
                aria-hidden="true"
                data-preview-story="envelope"
              >
                <span className={styles.storySequence}>
                  <span className={styles.storyStage} data-preview-stage="1">
                    <span className={styles.storyStep}>1</span>
                    <span className={`${styles.storyVisual} ${styles.envelopeClosedStage}`}>
                      <Image
                        src="/assets/gift/envelope-closed.png"
                        alt=""
                        fill
                        sizes="150px"
                        className={styles.envelopeClosedImage}
                      />
                    </span>
                    <span className={styles.storyCaption}>Конверт</span>
                  </span>
                  <span className={styles.storyArrow}>→</span>
                  <span className={styles.storyStage} data-preview-stage="2">
                    <span className={styles.storyStep}>2</span>
                    <span className={`${styles.storyVisual} ${styles.envelopeOpeningStage}`}>
                      <Image
                        src="/assets/gift/envelope-open.png"
                        alt=""
                        fill
                        sizes="150px"
                        className={`${styles.envelopeOpeningImage} ${styles.envelopeOpeningBackImage}`}
                      />
                      <Image
                        src="/assets/gift/envelope-open.png"
                        alt=""
                        fill
                        sizes="150px"
                        className={`${styles.envelopeOpeningImage} ${styles.envelopeOpeningFlapImage}`}
                      />
                      <span className={styles.envelopePeekCard}>
                        <Image
                          src={demoTemplateMeta[selectedTemplateId].preview}
                          alt=""
                          fill
                          sizes="70px"
                          className={styles.envelopePeekImage}
                        />
                      </span>
                      <Image
                        src="/assets/gift/envelope-open.png"
                        alt=""
                        fill
                        sizes="150px"
                        className={`${styles.envelopeOpeningImage} ${styles.envelopeOpeningFrontImage}`}
                      />
                    </span>
                    <span className={styles.storyCaption}>Открытие</span>
                  </span>
                  <span className={styles.storyArrow}>→</span>
                  <span className={styles.storyStage} data-preview-stage="3">
                    <span className={styles.storyStep}>3</span>
                    <span className={`${styles.storyVisual} ${styles.envelopeFinalStage}`}>
                      <span className={styles.envelopeFinalCard}>
                        <Image
                          src={demoTemplateMeta[selectedTemplateId].preview}
                          alt=""
                          fill
                          sizes="150px"
                          className={styles.storyResultImage}
                        />
                        <span className={styles.envelopeFinalLabel}>Для тебя</span>
                      </span>
                      <Image
                        src="/assets/gift/envelope-open.png"
                        alt=""
                        fill
                        sizes="150px"
                        className={styles.envelopeFinalImage}
                      />
                    </span>
                    <span className={styles.storyCaption}>Открытка выходит</span>
                  </span>
                </span>
              </span>
              <span className={styles.revealOptionBody}>
                <strong>Конверт</strong>
                <span>Классический сценарий: конверт открывается, и внутри появляется готовая открытка.</span>
                <span className={selectedRevealType === "envelope" ? styles.revealOptionStatusActive : styles.revealOptionStatus}>
                  {selectedRevealType === "envelope" ? "✓ Выбрано" : "Выбрать"}
                </span>
              </span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={selectedRevealType === "collect-messages"}
              aria-label="Собрать поздравления — материалы превращаются в готовую открытку"
              tabIndex={selectedRevealType === "collect-messages" ? 0 : -1}
              data-reveal-option="collect-messages"
              className={`${styles.revealOption} ${selectedRevealType === "collect-messages" ? styles.revealOptionActive : ""}`}
              onClick={() => selectAnimation("collect-messages")}
              onKeyDown={(event) => moveRevealSelection(event, "envelope")}
            >
              <span
                className={`${styles.revealOptionPreview} ${styles.collectPreview}`}
                aria-hidden="true"
                data-preview-story="collect-messages"
              >
                <span className={styles.storySequence}>
                  <span className={styles.storyStage} data-preview-stage="1">
                    <span className={styles.storyStep}>1</span>
                    <span className={`${styles.storyVisual} ${styles.collectLooseStage}`}>
                      <span className={`${styles.collectStoryMessage} ${styles.collectLooseMessageOne}`}>Алексей<i /></span>
                      <span className={`${styles.collectStoryMessage} ${styles.collectLooseMessageTwo}`}>Марина<i /></span>
                      <span className={`${styles.collectStoryPhoto} ${styles.collectLoosePhoto}`}>
                        <StoryPhotoPlaceholder />
                      </span>
                    </span>
                    <span className={styles.storyCaption}>Сообщения и фото</span>
                  </span>
                  <span className={styles.storyArrow}>→</span>
                  <span className={styles.storyStage} data-preview-stage="2">
                    <span className={styles.storyStep}>2</span>
                    <span className={`${styles.storyVisual} ${styles.collectGroupedStage}`}>
                      <span className={styles.collectStoryGroup}>
                        <span className={`${styles.collectStoryMessage} ${styles.collectGroupedMessageOne}`}>Алексей<i /></span>
                        <span className={`${styles.collectStoryPhoto} ${styles.collectGroupedPhoto}`}>
                          <StoryPhotoPlaceholder />
                        </span>
                        <span className={`${styles.collectStoryMessage} ${styles.collectGroupedMessageTwo}`}>Марина<i /></span>
                      </span>
                    </span>
                    <span className={styles.storyCaption}>Собираются</span>
                  </span>
                  <span className={styles.storyArrow}>→</span>
                  <span className={styles.storyStage} data-preview-stage="3">
                    <span className={styles.storyStep}>3</span>
                    <span className={`${styles.storyVisual} ${styles.collectResultStage}`}>
                      <span className={`${styles.storyResultCard} ${styles.collectStoryResultCard}`}>
                        <Image
                          src={demoTemplateMeta[selectedTemplateId].preview}
                          alt=""
                          fill
                          sizes="150px"
                          className={styles.storyResultImage}
                        />
                        <span className={styles.collectResultBadge}>Готово</span>
                        <span className={`${styles.collectResultMessage} ${styles.collectResultMessageOne}`}><i /></span>
                        <span className={`${styles.collectResultMessage} ${styles.collectResultMessageTwo}`}><i /></span>
                        <span className={styles.collectResultPhoto}>
                          <StoryPhotoPlaceholder />
                        </span>
                      </span>
                    </span>
                    <span className={styles.storyCaption}>Готовая открытка</span>
                  </span>
                </span>
              </span>
              <span className={styles.revealOptionBody}>
                <strong>Собрать поздравления</strong>
                <span>Поздравления и фотографии собираются из сообщений и превращаются в открытку прямо на глазах.</span>
                <span className={selectedRevealType === "collect-messages" ? styles.revealOptionStatusActive : styles.revealOptionStatus}>
                  {selectedRevealType === "collect-messages" ? "✓ Выбрано" : "Выбрать"}
                </span>
              </span>
            </button>
          </div>

          <div className={styles.animationAction}>
            <button type="button" className={styles.primaryButton} onClick={() => openDemo("animation_preview")}>
              <span aria-hidden="true">▶</span>
              Посмотреть анимацию
            </button>
          </div>
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
              <p>Посмотрите, как выбранный шаблон и способ открытия выглядят для получателя.</p>
            </div>
          </div>

          <div className={styles.selectionSummary} aria-label="Выбранные параметры демонстрации">
            <strong>{demoTemplateMeta[selectedTemplateId].name}</strong>
            <span aria-hidden="true">·</span>
            <strong>{revealNames[selectedRevealType]}</strong>
          </div>

          <div className={styles.previewLayout}>
            <div
              {...previewVisual}
              className={styles.previewVisual}
              role="img"
              aria-label={`Фрагмент готовой открытки «${demoTemplateMeta[selectedTemplateId].name}»`}
            >
              <iframe
                key={selectedTemplateId}
                src={`/example/recipient-preview?template=${selectedTemplateId}`}
                title={`Реальная открытка «${demoTemplateMeta[selectedTemplateId].name}»`}
                className={styles.recipientPreviewFrame}
                scrolling="no"
                tabIndex={-1}
                aria-hidden="true"
                loading="lazy"
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
                onClick={() => openDemo("recipient_view")}
              >
                Открыть выбранную открытку
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
            <p>Выбранные стиль и способ открытия уже будут настроены — останется собрать поздравления.</p>
          </div>
          <form action={startCardFromExampleSelectionAction} onSubmit={() => trackCreateClicked("bottom_cta")}>
            <input type="hidden" name="templateId" value={selectedTemplateId} />
            <input type="hidden" name="giftAnimationId" value={selectedRevealType} />
            <button type="submit" className={styles.primaryButton}>
              Создать открытку
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};
