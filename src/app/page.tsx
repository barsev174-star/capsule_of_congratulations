import {
  HomeHeader,
  HeroSection,
  ValueSection,
  HowItWorksSection,
  AiSection,
  CasesSection,
  TemplatesSection,
  PricingSection,
  FaqSection,
  FinalCtaSection,
  HomeFooter,
  HomeMotion
} from "./_home";
import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: { absolute: "Slovesto — групповая онлайн-открытка с поздравлениями и фото" },
  description: "Соберите поздравления от друзей, близких или коллег и дополните их фотографиями в красивой онлайн-открытке. Создание и сбор доступны бесплатно, финальная передача — 399 ₽.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Slovesto — групповая онлайн-открытка с поздравлениями и фото",
    description: "Соберите поздравления от друзей, близких или коллег и дополните их фотографиями в красивой онлайн-открытке. Создание и сбор доступны бесплатно, финальная передача — 399 ₽.",
    url: "/"
  }
};

export default async function HomePage() {
  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Slovesto",
              alternateName: ["Словесто", "slovesto.ru"],
              url: "https://slovesto.ru/"
            },
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Slovesto",
              alternateName: "Словесто",
              url: "https://slovesto.ru/",
              logo: "https://slovesto.ru/brand/logo-square-512.png"
            },
            {
              "@context": "https://schema.org",
              "@type": "Service",
              name: "Финальная подготовка и передача онлайн-открытки Slovesto",
              offers: {
                "@type": "Offer",
                price: "399",
                priceCurrency: "RUB",
                availability: "https://schema.org/InStock"
              }
            }
          ])
        }}
      />
      <HomeHeader />
      <HomeMotion />
      <main>
        <HeroSection />
        <ValueSection />
        <HowItWorksSection />
        <AiSection />
        <CasesSection />
        <TemplatesSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <HomeFooter />
    </div>
  );
}
