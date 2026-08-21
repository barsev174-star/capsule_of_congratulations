"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { CardLifecycle } from "@/lib/cards/lifecycle";
import type { CardMediaAsset, Contribution } from "@/lib/cards/types";
import type { FinalCardMessageMediaLayout } from "@/lib/final-card/types";
import type { OrganizerJourneyStep } from "@/lib/manage/card-design-readiness";
import { CongratulationsPanel } from "./congratulations-panel";
import { MediaManager } from "./media-manager";
import { ShareLinkButton } from "./copy-link-button";
import { EditorSidebarCard } from "./editor-sidebar-card";
import { ParticipantLinkCard } from "./participant-link-card";
import { PreparationProgress } from "./preparation-progress";
import { useMobileInputActivity } from "./use-mobile-input-activity";
import { openCollectionAction } from "./actions";
import { contentFocusSectionIds, type ContentFocus, type ContentSection } from "./content-focus";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  allContributions: Contribution[];
  mediaAssets: CardMediaAsset[];
  mediaLayout: FinalCardMessageMediaLayout;
  messagePhotosEnabled: boolean;
  useUniversalFrameAperture: boolean;
  momentsEnabled: boolean;
  occasionText: string;
  cardId: string;
  mainGreetingContributionId: string | null;
  focus: ContentFocus | null;
  section: ContentSection;
  journeySteps: OrganizerJourneyStep[];
  journeyCompletedCount: number;
  lifecycle: Pick<CardLifecycle, "collectionStatus" | "deliveryStatus" | "paymentStatus" | "hasAdminAccess">;
  lifecycleLabel: string;
  participantLink: string;
  collectionReady: boolean;
  giftAccessible: boolean;
  stickyAction: { label: string; href: string };
  greetingMode?: "classic" | "matrix" | "ladder";
};

const ContentLifecycleCard = ({
  manageToken,
  contributionCount,
  lifecycle,
  participantLink,
  collectionReady,
  giftAccessible,
  stickyAction
}: {
  manageToken: string;
  contributionCount: number;
  lifecycle: Pick<CardLifecycle, "collectionStatus" | "deliveryStatus" | "paymentStatus" | "hasAdminAccess">;
  participantLink: string;
  collectionReady: boolean;
  giftAccessible: boolean;
  stickyAction: { label: string; href: string };
}) => {
  const isDelivered = lifecycle.deliveryStatus === "DELIVERED";
  if (lifecycle.collectionStatus === "OPEN" && !isDelivered) {
    return <ParticipantLinkCard manageToken={manageToken} participantLink={participantLink} contributionCount={contributionCount} lifecycle={lifecycle} />;
  }

  return (
    <EditorSidebarCard className={styles.contentParticipantCard}>
      <div className={styles.editorSidebarCardHeading}>
        <div>
          <h2>{isDelivered ? "Открытка передана" : "Ссылка для участников"}</h2>
          <p>{isDelivered ? (giftAccessible ? "Финальная открытка доступна получателю." : "Доступ по финальной ссылке сейчас приостановлен.") : `Получено поздравлений: ${contributionCount}`}</p>
        </div>
      </div>
      {isDelivered ? (
        <Link href={stickyAction.href} className={styles.contentContextPrimaryButton}>Посмотреть открытку</Link>
      ) : lifecycle.collectionStatus === "CLOSED" ? (
        <div className={styles.contentParticipantActions}>
          <p>Сбор закрыт. При необходимости его можно снова открыть для участников.</p>
          <form action={openCollectionAction}>
            <input type="hidden" name="manageToken" value={manageToken} />
            <button type="submit" className={styles.contentContextPrimaryButton}>Открыть сбор снова</button>
          </form>
        </div>
      ) : (
        <div className={styles.contentParticipantActions}>
          <p>{collectionReady ? "Откройте сбор, чтобы получить активную ссылку для участников." : "Сначала заполните обязательные поля открытки во вкладке «Оформление»."}</p>
          {collectionReady ? (
            <form action={openCollectionAction}>
              <input type="hidden" name="manageToken" value={manageToken} />
              <button type="submit" className={styles.contentContextPrimaryButton}>Открыть сбор</button>
            </form>
          ) : <Link href={stickyAction.href} className={styles.contentContextPrimaryButton}>Продолжить настройку</Link>}
        </div>
      )}
      {lifecycle.hasAdminAccess ? (
        <div className={styles.contentAccessGranted}>
          <span aria-hidden="true">✓</span>
          <div><strong>Доступ предоставлен</strong><p>Платные возможности открытки открыты. Сбор поздравлений продолжается.</p></div>
        </div>
      ) : null}
    </EditorSidebarCard>
  );
};

const ContentStickyAction = ({ manageToken, contributionCount, lifecycle, participantLink, collectionReady, stickyAction }: {
  manageToken: string;
  contributionCount: number;
  lifecycle: Pick<CardLifecycle, "collectionStatus" | "deliveryStatus">;
  participantLink: string;
  collectionReady: boolean;
  stickyAction: { label: string; href: string };
}) => {
  const isInputActive = useMobileInputActivity();
  let action;
  if (lifecycle.deliveryStatus === "DELIVERED") {
    action = <Link href={stickyAction.href} className={styles.contentStickyPrimary}>Посмотреть открытку</Link>;
  } else if (lifecycle.collectionStatus === "DRAFT" && collectionReady) {
    action = <form action={openCollectionAction}><input type="hidden" name="manageToken" value={manageToken} /><button type="submit" className={styles.contentStickyPrimary}>Открыть сбор</button></form>;
  } else if (lifecycle.collectionStatus === "OPEN" && contributionCount === 0) {
    action = <ShareLinkButton value={participantLink} label="Поделиться ссылкой" className={styles.contentStickyPrimary} />;
  } else if (lifecycle.collectionStatus === "CLOSED") {
    action = <form action={openCollectionAction}><input type="hidden" name="manageToken" value={manageToken} /><button type="submit" className={styles.contentStickyPrimary}>Открыть сбор снова</button></form>;
  } else {
    action = <Link href={stickyAction.href} className={styles.contentStickyPrimary}>{stickyAction.label}</Link>;
  }
  return <div className={`${styles.contentStickyAction} ${isInputActive ? styles.mobileStickySuppressed : ""}`} aria-hidden={isInputActive}>{action}</div>;
};

export const ContentStudio = ({
  manageToken,
  allContributions,
  mediaAssets,
  mediaLayout,
  messagePhotosEnabled,
  useUniversalFrameAperture,
  momentsEnabled,
  occasionText,
  cardId,
  mainGreetingContributionId,
  focus,
  section,
  journeySteps,
  journeyCompletedCount,
  lifecycle,
  lifecycleLabel,
  participantLink,
  collectionReady,
  giftAccessible,
  stickyAction,
  greetingMode = "classic"
}: Props) => {
  useEffect(() => {
    if (!focus) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(contentFocusSectionIds[focus]);
      if (!target) return;
      target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focus, section]);

  return (
    <div className={styles.contentStudio}>
      <div className={`${styles.editorWorkspace} ${styles.contentLayout}`}>
        <div className={`${styles.editorMain} ${styles.contentWorkspaceMain}`}>
          {section === "congratulations" ? (
            <CongratulationsPanel
              allContributions={allContributions}
              cardId={cardId}
              manageToken={manageToken}
              occasionText={occasionText}
              mainGreetingContributionId={mainGreetingContributionId}
              participantLink={participantLink}
              lifecycle={lifecycle}
              greetingMode={greetingMode}
            />
          ) : (
            <section className={styles.contentPhotoSection} id="content-panel-photos">
              <MediaManager
                cardId={cardId}
                manageToken={manageToken}
                mediaAssets={mediaAssets}
                mediaLayout={mediaLayout}
                messagePhotosEnabled={messagePhotosEnabled}
                initialMomentsEnabled={momentsEnabled}
                useUniversalFrameAperture={useUniversalFrameAperture}
              />
            </section>
          )}
        </div>
        <aside className={`${styles.editorSidebar} ${styles.contentContextRail}`}>
          <PreparationProgress steps={journeySteps} completedCount={journeyCompletedCount} lifecycleLabel={lifecycleLabel} persistenceKey={`card-preparation:${manageToken}`} />
          <ContentLifecycleCard
            manageToken={manageToken}
            contributionCount={allContributions.length}
            lifecycle={lifecycle}
            participantLink={participantLink}
            collectionReady={collectionReady}
            giftAccessible={giftAccessible}
            stickyAction={stickyAction}
          />
        </aside>
      </div>
      <ContentStickyAction
        manageToken={manageToken}
        contributionCount={allContributions.length}
        lifecycle={lifecycle}
        participantLink={participantLink}
        collectionReady={collectionReady}
        stickyAction={stickyAction}
      />
    </div>
  );
};
