"use client";

import Link from "next/link";
import { startCardFromShowcaseAction } from "@/app/home-actions";
import styles from "./final-card.module.css";

const ShareIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M14 4h6v6M20 4 11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SparkleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path
      d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.7 10.3 11 6 9.3l4.3-1.7L12 3zm6 11l.9 2.3L21 17l-2.1.7L18 20l-.9-2.3L15 17l2.1-.7L18 14z"
      fill="currentColor"
    />
  </svg>
);

export type PublicShareFooterAction = {
  href: string;
  label: "Создать публичную версию" | "Настроить публичную версию";
  active: boolean;
};

export const FinalCardActions = ({ publicShare }: { publicShare?: PublicShareFooterAction }) => {
  return (
    <div className={styles.recipientFooterActions}>
      {publicShare?.active ? (
        <p className={styles.publicShareStatus}>
          <span aria-hidden="true" />
          Публичная версия активна
        </p>
      ) : null}
      <div className={styles.actions}>
        {publicShare ? (
          <Link href={publicShare.href} className={`${styles.button} ${styles.primaryButton} ${styles.publicShareButton}`}>
            <ShareIcon />
            {publicShare.label}
          </Link>
        ) : null}
        <form action={startCardFromShowcaseAction}>
          <button type="submit" className={`${styles.button} ${styles.secondaryButton} ${styles.routeFooterCreateButton}`}>
            <SparkleIcon />
            Создать такую же открытку
          </button>
        </form>
      </div>
    </div>
  );
};
