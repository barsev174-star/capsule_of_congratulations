import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { redirect } from "next/navigation";
import { listCardDraftsByOrganizerEmail } from "@/lib/cards/repository";
import { getCardLifecycleLabel } from "@/lib/cards/lifecycle";
import { getOrganizerSession } from "@/lib/organizer/session";
import { deleteOrganizerCardAction, logoutOrganizerAction, restoreOrganizerCardAction } from "./actions";
import { startCardFromShowcaseAction } from "@/app/home-actions";
import styles from "./account.module.css";

export default async function AccountPage() {
  const session = await getOrganizerSession();
  if (!session) redirect("/account/login");
  const cards = await listCardDraftsByOrganizerEmail(session.email);

  return (
    <main className={styles.page}>
      <div className={styles.dashboardShell}>
        <header className={styles.dashboardHeader}>
          <div><Link href="/" className={styles.brand}><BrandLogo /></Link><p>{session.email}</p></div>
          <form action={logoutOrganizerAction}><button type="submit" className={styles.secondaryButton}>Выйти</button></form>
        </header>
        <section className={styles.dashboardIntro}>
          <div><p className={styles.eyebrow}>Кабинет организатора</p><h1>Мои открытки</h1><p>Здесь собраны открытки, созданные с этим email.</p></div>
          <form action={startCardFromShowcaseAction}><button type="submit" className={styles.primaryLink}>Создать открытку</button></form>
        </section>
        {cards.length === 0 ? (
          <section className={styles.emptyCard}><h2>Пока здесь пусто</h2><p>Создайте первую открытку — она появится в этом списке автоматически.</p><form action={startCardFromShowcaseAction}><button type="submit">Создать открытку</button></form></section>
        ) : (
          <section className={styles.cardGrid}>
            {cards.map((card) => {
              const lifecycle = {
                paymentStatus: card.paymentStatus,
                collectionStatus: card.collectionStatus ?? "DRAFT",
                deliveryStatus: card.deliveryStatus ?? "PREPARING"
              };
              const delivered = lifecycle.paymentStatus === "PAID" && lifecycle.deliveryStatus === "DELIVERED";
              const isDeleted = Boolean(card.deletedAt);
              return (
                <article key={card.id} className={`${styles.card} ${isDeleted ? styles.deletedCard : ""}`}>
                  <div className={styles.cardTop}><span>{isDeleted ? "Удалена" : getCardLifecycleLabel(lifecycle)}</span><time>{new Date(card.updatedAt).toLocaleDateString("ru-RU")}</time></div>
                  <h2>{card.recipientName || "Новая открытка"}</h2>
                  <p>{isDeleted && (card.purgeAt ?? card.purgeAfter)
                    ? `Скрыта. Можно восстановить до ${new Date(card.purgeAt ?? card.purgeAfter ?? "").toLocaleDateString("ru-RU")}.`
                    : card.occasionText || "Событие пока не указано"}</p>
                  {isDeleted ? (
                    <form action={restoreOrganizerCardAction} className={styles.cardActions}>
                      <input type="hidden" name="cardId" value={card.id} />
                      <button type="submit" className={styles.secondaryButton}>Восстановить</button>
                    </form>
                  ) : (
                    <div className={styles.cardActions}>
                      <Link href={`/manage/${card.manageToken}`} className={styles.primaryLink}>Управлять</Link>
                      <Link href={delivered ? `/gift/${card.finalSlug}` : `/preview/${card.manageToken}`} className={styles.secondaryLink}>{delivered ? "Открыть" : "Предпросмотр"}</Link>
                      <form action={deleteOrganizerCardAction}>
                        <input type="hidden" name="cardId" value={card.id} />
                        <button type="submit" className={styles.secondaryButton}>Удалить</button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
