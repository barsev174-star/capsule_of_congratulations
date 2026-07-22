"use client";

import styles from "./participant-page.module.css";

export type ContributionStripItem = {
  id: string;
  authorName: string;
  authorRole: string | null;
  message: string;
};

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || "Д";

export const ContributionsStrip = ({ items }: { items: ContributionStripItem[] }) => {
  const marquee = items.length > 3;

  const renderList = (duplicated: boolean) => (
    <ul className={styles.contribStripList} aria-hidden={duplicated || undefined}>
      {items.map((item) => (
        <li key={`${duplicated ? "dup-" : ""}${item.id}`} className={styles.contribCard} {...(duplicated ? { tabIndex: -1 } : {})}>
          <span className={styles.avatar} aria-hidden="true">{getInitial(item.authorName)}</span>
          <span className={styles.contribCardBody}>
            <span className={styles.contribCardName}>
              {item.authorName}
              {item.authorRole ? <span className={styles.contribCardRole}> · {item.authorRole}</span> : null}
            </span>
            <span className={styles.contribCardText}>{item.message}</span>
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`${styles.contribStripViewport} ${marquee ? styles.contribStripMarquee : ""}`}>
      <div className={styles.contribStripTrack}>
        {renderList(false)}
        {marquee ? renderList(true) : null}
      </div>
    </div>
  );
};
