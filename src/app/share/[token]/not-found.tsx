import Link from "next/link";
import styles from "./page.module.css";

export default function ShareNotFound() {
  return <main className={styles.page}><section className={`${styles.paper} ${styles.cta}`}><h1>Эта публичная версия открытки больше недоступна.</h1><p>Содержимое и причина отключения не показываются.</p><Link className={styles.primaryAction} href="/manage/new">Собрать свою открытку</Link></section></main>;
}
