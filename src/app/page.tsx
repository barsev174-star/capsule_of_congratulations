import {
  HomeHeader,
  HeroSection,
  ValueSection,
  HowItWorksSection,
  CasesSection,
  TemplatesSection,
  AiSection,
  InsideSection,
  FaqSection,
  FinalCtaSection,
  HomeFooter
} from "./_home";
import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: { absolute: "Slovesto — групповая онлайн-открытка с поздравлениями и фото" },
  description: "Соберите поздравления и фотографии от друзей, близких или коллег в красивую онлайн-открытку, которую получатель сможет открыть и сохранить.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Slovesto — групповая онлайн-открытка с поздравлениями и фото",
    description: "Соберите поздравления и фотографии от друзей, близких или коллег в красивую онлайн-открытку, которую получатель сможет открыть и сохранить.",
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
            }
          ])
        }}
      />
      <HomeHeader />
      <main>
        <HeroSection />
        <ValueSection />
        <HowItWorksSection />
        <CasesSection />
        <TemplatesSection />
        <AiSection />
        <InsideSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <HomeFooter />
    </div>
  );
}
