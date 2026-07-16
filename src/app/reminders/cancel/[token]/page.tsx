import Link from "next/link";
import { getEventReminderCancellationState } from "@/lib/reminders/repository";
import { cancelReminderAction } from "./actions";
import { startCardFromShowcaseAction } from "@/app/home-actions";
import styles from "./page.module.css";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ result?: string }>;
};

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export default async function CancelReminderPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { result } = await searchParams;
  const currentState = tokenPattern.test(token)
    ? await getEventReminderCancellationState(token)
    : "not_found";
  const state = result === "cancelled" ? "cancelled" : currentState;

  const content = state === "cancelled"
    ? {
        eyebrow: "Готово",
        title: "Напоминание отменено",
        body: "Мы больше не будем присылать письмо об этом событии."
      }
    : state === "sent"
      ? {
          eyebrow: "Письмо уже ушло",
          title: "Напоминание уже было отправлено",
          body: "Отменять больше нечего, но вы всегда можете создать открытку прямо сейчас."
        }
      : state === "not_found"
        ? {
            eyebrow: "Ссылка не найдена",
            title: "Не удалось открыть напоминание",
            body: "Возможно, ссылка повреждена. Проверьте, что она скопирована из письма полностью."
          }
        : {
            eyebrow: "Управление напоминанием",
            title: "Отменить напоминание?",
            body: "После отмены мы не будем присылать письмо об этом событии."
          };

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="cancel-title">
        <div className={styles.icon} aria-hidden="true">✉</div>
        <p className={styles.eyebrow}>{content.eyebrow}</p>
        <h1 id="cancel-title">{content.title}</h1>
        <p className={styles.body}>{content.body}</p>

        {state === "cancellable" ? (
          <form action={cancelReminderAction}>
            <input type="hidden" name="token" value={token} />
            <button className={styles.cancelButton} type="submit">Отменить напоминание</button>
          </form>
        ) : (
          <form action={startCardFromShowcaseAction}>
            <button className={styles.primaryLink} type="submit">Создать открытку</button>
          </form>
        )}

        <Link className={styles.homeLink} href="/">Вернуться на главную</Link>
      </section>
    </main>
  );
}
