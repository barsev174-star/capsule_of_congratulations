import Link from "next/link";
import { Children, isValidElement, type ReactNode } from "react";
import styles from "../admin.module.css";
import { AdminFilterDisclosure } from "./admin-filter-disclosure";

export type AdminStatusTone = "success" | "warning" | "error" | "info" | "neutral";

export function AdminStatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: AdminStatusTone }) {
  return <span className={`${styles.badge} ${styles[`status${tone}`]}`}><span className={styles.statusDot} aria-hidden="true" />{children}</span>;
}

export function AdminPageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return <div className={styles.pageHeader}><div><h1 className={styles.pageTitle}>{title}</h1>{description && <p className={styles.pageSubtitle}>{description}</p>}</div>{children}</div>;
}

export function AdminStatCard({ label, value, detail, tone = "neutral" }: { label: string; value: ReactNode; detail?: ReactNode; tone?: AdminStatusTone }) {
  return <div className={styles.statCard}><p className={styles.statLabel}>{label}</p><p className={`${styles.statValue} ${styles[`value${tone}`]}`}>{value}</p>{detail && <p className={styles.statDetail}>{detail}</p>}</div>;
}

export function AdminEmptyState({ children }: { children: ReactNode }) {
  return <div className={styles.emptyState}>{children}</div>;
}

export type AdminColumn<T> = { key: string; label: string; width?: string; mobilePrimary?: boolean; render: (row: T) => ReactNode };
export function AdminDataTable<T extends { id: string }>({ rows, columns, empty = "Записи не найдены.", label }: { rows: T[]; columns: AdminColumn<T>[]; empty?: string; label: string }) {
  if (!rows.length) return <AdminEmptyState>{empty}</AdminEmptyState>;
  return <div className={styles.responsiveTable}><table className={styles.table} aria-label={label}><colgroup>{columns.map(column => <col key={column.key} style={column.width ? {width: column.width} : undefined}/>)}</colgroup><thead><tr>{columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key} data-label={column.label} data-primary={column.mobilePrimary || undefined}><div className={styles.cellContent}>{column.render(row)}</div></td>)}</tr>)}</tbody></table></div>;
}

export function AdminFilterBar({ children, resetHref }: { children: ReactNode; resetHref: string }) {
  const nodes = Children.toArray(children);
  const hidden = nodes.filter(node => isValidElement<{type?: string}>(node) && node.type === "input" && node.props.type === "hidden");
  const fields = nodes.filter(node => !hidden.includes(node));
  return <form method="get" className={`${styles.filters} ${styles.adaptiveFilters}`} aria-label="Фильтры">{hidden}<div className={styles.primaryFilters}>{fields[0]}<div className={styles.filterActions}><button type="submit" className={styles.filterButton}>Применить</button><Link href={resetHref} className={styles.detailLink}>Сбросить</Link></div></div>{fields.length > 1 && <AdminFilterDisclosure>{fields.slice(1)}</AdminFilterDisclosure>}</form>;
}

export function AdminPagination({ pathname, params, page, hasNext }: { pathname: string; params: Record<string, string | undefined>; page: number; hasNext: boolean }) {
  const href = (next: number) => { const query = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (value && key !== "page") query.set(key, value); query.set("page", String(next)); return `${pathname}?${query}`; };
  return <nav className={styles.pagination} aria-label="Страницы списка">{page > 1 && <Link className={styles.detailLink} href={href(page - 1)}>Назад</Link>}<span>Страница {page}</span>{hasNext && <Link className={styles.detailLink} href={href(page + 1)}>Далее</Link>}</nav>;
}

export function AdminDetailPanel({ title, children }: { title: string; children: ReactNode }) {
  return <section className={`${styles.panel} ${styles.detailPanel}`}><h2 className={styles.panelTitle}>{title}</h2>{children}</section>;
}
