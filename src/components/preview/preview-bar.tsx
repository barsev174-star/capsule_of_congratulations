import Link from "next/link";
import { publishCardAction } from "@/lib/cards/actions";
import { getGiftPath, getManagePath } from "@/lib/routes/card-links";
import styles from "./preview-bar.module.css";

type PreviewBarProps = {
  manageToken: string;
  finalSlug: string;
  published?: boolean;
};

export const PreviewBar = ({ manageToken, finalSlug, published = false }: PreviewBarProps) => {
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.text}>
          <p className={styles.title}>Предпросмотр открытки</p>
          <p className={styles.subtitle}>
            Так открытку видите только вы. Финальная ссылка для получателя откроется после публикации.
          </p>
        </div>
        <div className={styles.actions}>
          <Link href={getManagePath(manageToken)} className={styles.secondaryButton}>
            Вернуться к редактированию
          </Link>
          {published ? (
            <Link href={getGiftPath(finalSlug)} className={styles.primaryButton}>
              Открыть финальную открытку
            </Link>
          ) : (
            <form action={publishCardAction}>
              <input type="hidden" name="manageToken" value={manageToken} />
              <button type="submit" className={styles.primaryButton}>
                Опубликовать — 399 ₽
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
};
