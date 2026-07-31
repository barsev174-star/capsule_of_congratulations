"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { OrganizerJourneyStep } from "@/lib/manage/card-design-readiness";
import { buildOrganizerJourneyCompactView } from "@/lib/manage/organizer-journey-view";
import { EditorSidebarCard } from "./editor-sidebar-card";
import styles from "./manage-page.module.css";

type Props = {
  steps: OrganizerJourneyStep[];
  completedCount: number;
  lifecycleLabel: string;
  persistenceKey: string;
  actionLinks?: Array<{
    label: string;
    href: string;
  }>;
};

const stepMarker = (step: OrganizerJourneyStep, index: number) =>
  step.status === "COMPLETED" ? "✓" : index + 1;

export const PreparationProgress = ({
  steps,
  completedCount,
  lifecycleLabel,
  persistenceKey,
  actionLinks = []
}: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const reactId = useId();
  const detailsId = `preparation-progress-${reactId.replaceAll(":", "")}`;
  const compact = useMemo(() => buildOrganizerJourneyCompactView(steps), [steps]);
  const compactIds = new Set(
    [
      ...compact.completedSteps,
      compact.currentStep,
      ...(compact.nextStep ? [compact.nextStep] : [])
    ].map((step) => step.id)
  );
  const compactSteps = steps.filter((step) => compactIds.has(step.id));

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsExpanded(window.sessionStorage.getItem(persistenceKey) === "expanded");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [persistenceKey]);

  const toggleExpanded = () => {
    setIsExpanded((current) => {
      const next = !current;
      window.sessionStorage.setItem(persistenceKey, next ? "expanded" : "collapsed");
      return next;
    });
  };

  return (
    <EditorSidebarCard
      id="lifecycle-section"
      className={styles.preparationProgressCard}
      ariaLabel="Подготовка открытки"
    >
      <div className={styles.preparationHeading}>
        <div>
          <h2>Подготовка открытки</h2>
          <p>Что уже готово и что делать дальше</p>
        </div>
        <span>{lifecycleLabel}</span>
      </div>

      <strong className={styles.preparationCount}>
        {completedCount} из {steps.length} этапов завершено
      </strong>

      <div id={detailsId}>
        <ol
          className={
            isExpanded
              ? styles.preparationStepsExpanded
              : styles.preparationStepsCompact
          }
        >
          {(isExpanded ? steps : compactSteps).map((step, renderedIndex) => {
            const sourceIndex = steps.findIndex((candidate) => candidate.id === step.id);
            const relation =
              step.id === compact.currentStep.id
                ? "current"
                : step.id === compact.nextStep?.id
                  ? "next"
                  : "completed";

            return (
              <li
                key={step.id}
                data-status={step.status}
                data-relation={relation}
              >
                <span>{stepMarker(step, isExpanded ? renderedIndex : sourceIndex)}</span>
                <div>
                  <span className={styles.preparationStepTitle}>
                    <strong>{step.label}</strong>
                    {relation === "current" ? <em>Сейчас</em> : null}
                    {relation === "next" ? <em>Дальше</em> : null}
                  </span>
                  {isExpanded ? <small>{step.description}</small> : null}
                </div>
              </li>
            );
          })}
        </ol>

        {!isExpanded ? (
          <p className={styles.preparationCurrentDescription}>
            {compact.currentStep.description}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        className={styles.preparationToggle}
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        onClick={toggleExpanded}
      >
        <span>{isExpanded ? "Свернуть этапы" : "Показать все этапы"}</span>
        <span aria-hidden="true">{isExpanded ? "↑" : "→"}</span>
      </button>

      {isExpanded && actionLinks.length > 0 ? (
        <div className={styles.preparationActionLinks}>
          {actionLinks.map((action) => (
            <a key={`${action.href}-${action.label}`} href={action.href}>
              {action.label}
            </a>
          ))}
        </div>
      ) : null}
    </EditorSidebarCard>
  );
};
