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
  FinalCtaSection
} from "./_home";
import styles from "./page.module.css";

export default async function HomePage() {
  return (
    <div className={styles.page}>
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
    </div>
  );
}
