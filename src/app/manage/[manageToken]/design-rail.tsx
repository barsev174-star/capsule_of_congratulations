"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { OrganizerJourneyStep } from "@/lib/manage/card-design-readiness";
import { buildOrganizerJourneyCompactView } from "@/lib/manage/organizer-journey-view";
import styles from "./manage-page.module.css";

type JourneyActionLink = {
  label: string;
  href: string;
};

type Props = {
  steps: OrganizerJourneyStep[];
  completedCount: number;
  lifecycleLabel: string;
  giftAccessible: boolean;
  actionLinks?: JourneyActionLink[];
  hasMobileOperations?: boolean;
  templateCard: ReactNode;
  children?: ReactNode;
};

const stepMarker = (step: OrganizerJourneyStep, index: number) =>
  step.status === "COMPLETED" ? "✓" : index + 1;

export const DesignRail = ({
  steps,
  completedCount,
  lifecycleLabel,
  giftAccessible,
  actionLinks = [],
  hasMobileOperations = false,
  templateCard,
  children
}: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const compact = useMemo(() => buildOrganizerJourneyCompactView(steps), [steps]);
  const compactStepIds = new Set([
    ...compact.completedSteps,
    compact.currentStep,
    ...(compact.nextStep ? [compact.nextStep] : [])
  ].map((step) => step.id));
  const compactSteps = steps.filter((step) => compactStepIds.has(step.id));

  return (
    <aside
      className={`${styles.designRail} ${isExpanded ? styles.designRailExpanded : ""}`}
      aria-label="Подготовка открытки"
    >
      {templateCard}

      <section
        className={`${styles.sidebarCard} ${styles.journeyCard}`}
        id="lifecycle-section"
        data-has-mobile-operations={hasMobileOperations ? "true" : "false"}
      >
        <div className={styles.journeyOverview}>
          <div className={styles.journeyHeading}>
            <div>
              <h2>Подготовка открытки</h2>
              <p>Что уже готово и что делать дальше</p>
              <small>
                {completedCount} из {steps.length} этапов завершено
              </small>
            </div>
            <span
              className={`${styles.statusBadge} ${
                giftAccessible ? styles.statusBadgeGranted : ""
              }`}
            >
              {giftAccessible ? "Доступ предоставлен" : lifecycleLabel}
            </span>
          </div>

          <div id="card-preparation-details">
            {isExpanded ? (
              <ol className={styles.journeySteps}>
                {steps.map((step, index) => (
                  <li key={step.id} data-status={step.status}>
                    <span>{stepMarker(step, index)}</span>
                    <div>
                      <span className={styles.journeyStepTitleRow}>
                        <strong>{step.label}</strong>
                        {step.status === "CURRENT" ? <em>Сейчас</em> : null}
                      </span>
                      <small>{step.description}</small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className={styles.journeyCompactList}>
                <ol>
                  {compactSteps.map((step) => {
                    const index = steps.findIndex((candidate) => candidate.id === step.id);
                    return (
                      <li key={step.id} data-status={step.status}>
                        <span>{stepMarker(step, index)}</span>
                        <div>
                          <strong>{step.label}</strong>
                          {step.id === compact.currentStep.id ? <em>Сейчас</em> : null}
                          {step.id === compact.nextStep?.id ? <em>Дальше</em> : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {compact.remainingSummary ? (
                  <p className={styles.journeyRemainingSummary}>{compact.remainingSummary}</p>
                ) : null}
                <p className={styles.journeyCurrentDescription}>
                  {compact.currentStep.description}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.journeyToggle}
            aria-expanded={isExpanded}
            aria-controls="card-preparation-details"
            onClick={() => setIsExpanded((value) => !value)}
          >
            {isExpanded ? "Свернуть этапы" : "Показать все этапы"}
          </button>

          {isExpanded && actionLinks.length > 0 ? (
            <div className={styles.journeyContextLinks}>
              {actionLinks.map((action) => (
                <a key={`${action.href}-${action.label}`} href={action.href}>
                  {action.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {children ? <div className={styles.journeyOperations}>{children}</div> : null}
      </section>
    </aside>
  );
};
