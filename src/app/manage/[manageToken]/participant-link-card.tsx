"use client";

import { useId, useState, type ReactNode } from "react";
import type { CardLifecycle } from "@/lib/cards/lifecycle";
import { pluralize } from "@/lib/i18n/pluralize";
import { CloseCollectionButton } from "./close-collection-button";
import { CopyLinkButton, ShareLinkButton } from "./copy-link-button";
import { EditorSidebarCard } from "./editor-sidebar-card";
import { LinkPurposeList } from "./link-purpose-list";
import { PaymentCheckoutButton } from "./payment-checkout-button";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  participantLink: string;
  contributionCount: number;
  lifecycle: Pick<CardLifecycle, "paymentStatus" | "hasAdminAccess">;
};

type ParticipantDisclosureProps = {
  title: string;
  meta?: string;
  children: ReactNode;
};

const ParticipantDisclosure = ({
  title,
  meta,
  children
}: ParticipantDisclosureProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const reactId = useId().replaceAll(":", "");
  const triggerId = `participant-disclosure-trigger-${reactId}`;
  const contentId = `participant-disclosure-content-${reactId}`;

  return (
    <section className={styles.participantDisclosure}>
      <button
        id={triggerId}
        type="button"
        className={styles.participantDisclosureTrigger}
        aria-label={meta ? `${title}, ${meta}` : title}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <strong>{title}</strong>
        <span className={styles.participantDisclosureAside}>
          {meta ? <span>{meta}</span> : null}
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m7 9 5 5 5-5" />
          </svg>
        </span>
      </button>
      <div
        id={contentId}
        className={styles.participantDisclosureContent}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isExpanded}
      >
        {children}
      </div>
    </section>
  );
};

export const ParticipantLinkCard = ({
  manageToken,
  participantLink,
  contributionCount,
  lifecycle
}: Props) => {
  const hasPaidAccess =
    lifecycle.paymentStatus === "PAID" || lifecycle.hasAdminAccess;
  const contributionLabel = pluralize(contributionCount, {
    one: "поздравление",
    few: "поздравления",
    many: "поздравлений"
  });

  return (
    <EditorSidebarCard className={styles.participantLinkCard}>
      <div className={`${styles.editorSidebarCardHeading} ${styles.participantLinkHeading}`}>
        <span className={styles.linkAudienceBadge}>Для общего чата</span>
        <h2>Ссылка для участников</h2>
        <p className={styles.participantCollectionStatus}>
          <span className={styles.participantStatusDot} aria-hidden="true" />
          <span>Сбор открыт</span>
          <span aria-hidden="true">·</span>
          <strong>{contributionCount} {contributionLabel}</strong>
        </p>
        <p>Отправьте ссылку участникам в общий чат.</p>
      </div>

      <div className={styles.participantLinkActions}>
        <ShareLinkButton
          value={participantLink}
          label="Поделиться ссылкой для участников"
          className={styles.participantLinkPrimary}
        />
        <CopyLinkButton
          value={participantLink}
          label="Скопировать ссылку для участников"
          copiedLabel="Ссылка скопирована"
          className={styles.participantLinkSecondary}
        />
      </div>

      <div className={styles.participantCloseCollectionAction}>
        <CloseCollectionButton manageToken={manageToken} label="Закрыть сбор и перейти к проверке" />
      </div>

      <div className={styles.participantDisclosures}>
        <ParticipantDisclosure title="Как работает сбор">
          <LinkPurposeList
            audience="Участникам — в общий чат"
            purpose="Поздравления и голоса за подарок"
            purposeLabel="Что соберём"
            nextStep="Когда всё собрано — закройте сбор"
            nextStepLabel="Что дальше"
            compact
          />
          <p className={styles.participantLinkClarification}>
            Это не ссылка для получателя. Приватная ссылка появится после завершения подготовки и передачи открытки.
          </p>
        </ParticipantDisclosure>

        <ParticipantDisclosure title="Управление сбором" meta="Открыт">
          <div className={styles.participantCollectionControl}>
            <h3>Когда закрывать сбор</h3>
            <p>
              Закройте сбор, когда получите все материалы. После закрытия участники
              не смогут ничего добавлять, а вы перейдёте к финальной проверке и
              передаче открытки.
            </p>
          </div>
        </ParticipantDisclosure>

        <ParticipantDisclosure
          title="Оплата открытки"
          meta={hasPaidAccess ? (lifecycle.hasAdminAccess ? "Доступ открыт" : "Оплачено") : "399 ₽"}
        >
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
            <div className={styles.participantPaymentContent}>
              <p className={styles.participantPaymentLead}>Можно оплатить заранее.</p>
              <p>
                Оплата откроет расширенный AI-лимит и передачу открытки. Сбор останется
                открытым, пока вы сами его не закроете.
              </p>
              <PaymentCheckoutButton
                manageToken={manageToken}
                className={styles.earlyPaymentButton}
                containerClassName={styles.paymentCheckout}
                fieldClassName={styles.paymentEmailField}
                consentClassName={styles.paymentConsent}
                messageClassName={styles.paymentMessage}
                collapsible
                revealLabel="Оплатить заранее — 399 ₽"
              />
            </div>
          )}
        </ParticipantDisclosure>
      </div>
    </EditorSidebarCard>
  );
};
