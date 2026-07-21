"use client";

import { useState, type ReactNode } from "react";
import styles from "./footer.module.css";

type FooterGroupProps = {
  title: string;
  children: ReactNode;
};

/**
 * На мобильном — компактная раскрывающаяся секция.
 * На desktop группа всегда развёрнута, кнопка неактивна (см. footer.module.css).
 */
export function FooterGroup({ title, children }: FooterGroupProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${styles.column} ${styles.group} ${open ? styles.groupOpen : ""}`}>
      <h2 className={styles.groupHeading}>
        <button
          type="button"
          className={styles.groupToggle}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {title}
          <span className={styles.groupChevron} aria-hidden="true">⌄</span>
        </button>
      </h2>
      <div className={styles.groupBody}>{children}</div>
    </div>
  );
}
