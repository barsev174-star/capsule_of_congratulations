import type { ReactNode } from "react";
import type { OrganizerJourneyStep } from "@/lib/manage/card-design-readiness";
import { PreparationProgress } from "./preparation-progress";
import styles from "./manage-page.module.css";

type JourneyActionLink = {
  label: string;
  href: string;
};

type Props = {
  steps: OrganizerJourneyStep[];
  completedCount: number;
  lifecycleLabel: string;
  persistenceKey: string;
  actionLinks?: JourneyActionLink[];
  templateCard: ReactNode;
  children?: ReactNode;
};

export const DesignRail = ({
  steps,
  completedCount,
  lifecycleLabel,
  persistenceKey,
  actionLinks = [],
  templateCard,
  children
}: Props) => (
  <aside
    className={`${styles.editorSidebar} ${styles.designRail}`}
    aria-label="Панель подготовки открытки"
  >
    <PreparationProgress
      steps={steps}
      completedCount={completedCount}
      lifecycleLabel={lifecycleLabel}
      persistenceKey={persistenceKey}
      actionLinks={actionLinks}
    />
    {templateCard}
    {children}
  </aside>
);
