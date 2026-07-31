"use client";

import type { CardLifecycle } from "@/lib/cards/lifecycle";
import { CloseCollectionButton } from "./close-collection-button";
import { CopyLinkButton, ShareLinkButton } from "./copy-link-button";
import { EditorSidebarCard } from "./editor-sidebar-card";
import { PaymentCheckoutButton } from "./payment-checkout-button";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  participantLink: string;
  contributionCount: number;
  lifecycle: Pick<CardLifecycle, "paymentStatus" | "hasAdminAccess">;
};

export const ParticipantLinkCard = ({
  manageToken,
  participantLink,
  contributionCount,
  lifecycle
}: Props) => {
  const hasPaidAccess =
    lifecycle.paymentStatus === "PAID" || lifecycle.hasAdminAccess;

  return (
    <EditorSidebarCard className={styles.participantLinkCard}>
      <div className={styles.editorSidebarCardHeading}>
        <h2>Ссылка для участников</h2>
        <p>Получено поздравлений: {contributionCount}</p>
      </div>

      <div className={styles.participantLinkActions}>
        <ShareLinkButton
          value={participantLink}
          className={styles.participantLinkPrimary}
        />
        <CopyLinkButton
          value={participantLink}
          label="Копировать ссылку"
          copiedLabel="Ссылка скопирована"
          className={styles.participantLinkSecondary}
        />
        <div className={styles.participantCollectionControl}>
          <span>Управление сбором</span>
          <CloseCollectionButton manageToken={manageToken} />
        </div>
      </div>

      {hasPaidAccess ? (
        <div className={styles.participantAccessGranted}>
          <span aria-hidden="true">✓</span>
          <div>
            <strong>
              {lifecycle.hasAdminAccess
                ? "Доступ предоставлен"
                : "Оплата подтверждена"}
            </strong>
            <p>
              Платные возможности открытки открыты. Сбор поздравлений продолжается.
            </p>
          </div>
        </div>
      ) : (
        <details className={styles.lifecycleAdditionalActions}>
          <summary>Дополнительные действия</summary>
          <div>
            <span>Оплата не закроет сбор и не передаст открытку получателю.</span>
            <PaymentCheckoutButton
              manageToken={manageToken}
              className={styles.statusTertiaryAction}
              containerClassName={styles.paymentCheckout}
              fieldClassName={styles.paymentEmailField}
              consentClassName={styles.paymentConsent}
              messageClassName={styles.paymentMessage}
              collapsible
              revealLabel="Перейти к оплате заранее"
            />
          </div>
        </details>
      )}
    </EditorSidebarCard>
  );
};
