"use client";

import type { CardLifecycle } from "@/lib/cards/lifecycle";
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
        <span className={styles.linkAudienceBadge}>Для общего чата</span>
        <h2>Ссылка для участников</h2>
        <p>Отправьте её друзьям и коллегам, которые будут наполнять открытку.</p>
      </div>

      <LinkPurposeList
        audience="Участникам — в общий чат"
        purpose="Собрать поздравления, фотографии и голоса за подарок"
        nextStep="Дождитесь материалов, затем закройте сбор"
      />

      <p className={styles.participantContributionCount}>
        Получено поздравлений: <strong>{contributionCount}</strong>
      </p>

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
        <p className={styles.participantLinkClarification}>
          Это не ссылка для получателя. Приватная ссылка появится после завершения подготовки и передачи открытки.
        </p>
        <div className={styles.collectionCloseGuide}>
          <strong>Когда закрывать сбор</strong>
          <p>
            Когда все материалы получены. После закрытия участники не смогут ничего
            добавлять, а вы перейдёте к финальной проверке и передаче открытки.
          </p>
        </div>
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
        <section className={styles.earlyPaymentPanel} aria-labelledby="early-payment-title">
          <div className={styles.earlyPaymentHeading}>
            <div>
              <span>Можно оплатить заранее</span>
              <h3 id="early-payment-title">Оплата открытки</h3>
            </div>
            <strong>399 ₽</strong>
          </div>
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
        </section>
      )}
    </EditorSidebarCard>
  );
};
