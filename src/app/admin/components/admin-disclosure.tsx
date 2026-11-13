import type { ReactNode } from "react";
import styles from "../admin.module.css";

export function AdminDisclosure({ children, title = "Как считаются показатели", open = false }: { children: ReactNode; title?: string; open?: boolean }) {
  return <details className={`${styles.disclosure} ${styles.methodology}`} open={open}><summary>{title}</summary><div>{children}</div></details>;
}
