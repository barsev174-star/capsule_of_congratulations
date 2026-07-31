import type { ReactNode } from "react";
import styles from "./manage-page.module.css";

type Props = {
  children: ReactNode;
  className?: string;
  id?: string;
  ariaLabel?: string;
};

export const EditorSidebarCard = ({
  children,
  className = "",
  id,
  ariaLabel
}: Props) => (
  <section
    id={id}
    className={`${styles.editorSidebarCard} ${className}`.trim()}
    aria-label={ariaLabel}
  >
    {children}
  </section>
);
