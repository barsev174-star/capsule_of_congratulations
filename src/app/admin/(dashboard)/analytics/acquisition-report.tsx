import Link from "next/link";
import {
  analyticsLandings, cohortConversion, sumAcquisitionCounts, type AcquisitionAnalytics
} from "@/lib/admin/acquisition-analytics";
import styles from "../../admin.module.css";

const money = (kopecks: number) => new Intl.NumberFormat("ru-RU", {
  style: "currency", currency: "RUB", maximumFractionDigits: 2
}).format(kopecks / 100);

const stages = [
  ["created", "Создали открытку"],
  ["withGreeting", "Добавили хотя бы одно поздравление"],
  ["paid", "Подтверждена оплата"],
  ["delivered", "Передали открытку"],
  ["opened", "Открыли по ссылке получателя"]
] as const;

export function AcquisitionReport({ report, days }: { report: AcquisitionAnalytics | null; days: number }) {
  if (!report) return (
    <section className={`${styles.panel} ${styles.analyticsPanel}`}>
      <h2 className={styles.panelTitle}>Путь открыток и источники</h2>
      <p className={styles.analyticsNote}>Отчёт доступен при подключении PostgreSQL. В локальном JSON-хранилище нет проверенного платёжного журнала; продажи и конверсии не рассчитываются.</p>
    </section>
  );
  const { totals } = report;
  const unattributed = report.sources.filter((row) => row.landing === null).reduce((sum, row) => sum + row.created, 0);

  return (
    <>
      <div className={`${styles.statsGrid} ${styles.analyticsStats}`}>
        <div className={styles.statCard}><p className={styles.statValue}>{totals.created}</p><p className={styles.statLabel}>Создали за {days} дней</p></div>
        <div className={styles.statCard}><p className={styles.statValue}>{totals.paid}</p><p className={styles.statLabel}>Из них оплатили</p></div>
        <div className={styles.statCard}><p className={styles.statValue}>{cohortConversion(totals.paid, totals.created)}</p><p className={styles.statLabel}>Создание → оплата</p></div>
        <div className={styles.statCard}><p className={styles.statValue}>{money(totals.grossKopecks)}</p><p className={styles.statLabel}>Подтверждённые платежи</p></div>
      </div>

      <section className={`${styles.panel} ${styles.analyticsPanel}`} aria-labelledby="card-journey-title">
        <h2 className={styles.panelTitle} id="card-journey-title">Путь открыток</h2>
        <p className={styles.analyticsNote}>Открытки, созданные за последние {days} дней, и их результат к текущему моменту. На каждом этапе одна открытка считается один раз; проценты — от всех созданных, а не от соседнего этапа.</p>
        {totals.created === 0 ? <p className={styles.emptyState}>За этот период ещё не создали открыток.</p> : (
          <div className={styles.funnelList}>
            {stages.map(([key, label]) => (
              <div className={styles.funnelRow} key={key}>
                <div className={styles.funnelMeta}><span>{label}</span><strong>{totals[key]}</strong></div>
                <div className={styles.funnelTrack} aria-hidden="true"><span style={{ width: `${totals[key] / totals.created * 100}%` }} /></div>
                <span className={styles.funnelConversion}>{cohortConversion(totals[key], totals.created)} от созданных</span>
              </div>
            ))}
          </div>
        )}
        <p className={styles.analyticsNote}>Поздравления учитываются и от участников, и от организатора, включая впоследствии скрытые или удалённые. Передача возможна с бесплатным доступом, поэтому этапы не обязаны убывать. Открытие фиксирует доступ по ссылке получателя, но не устанавливает личность посетителя.</p>
        <p className={styles.analyticsNote}>Оплата — подтверждение Robokassa на сервере, без тестового режима и административных выдач доступа. Оплаченных заказов: <strong>{totals.paidOrders}</strong>. Возвращено по этим заказам: <strong>{money(totals.refundedKopecks)}</strong>. Возврат не отменяет факт состоявшейся покупки. Это результат выбранных открыток, а не кассовая выручка за период.</p>
      </section>

      <section className={`${styles.panel} ${styles.analyticsPanel}`} aria-labelledby="seo-report-title">
        <h2 className={styles.panelTitle} id="seo-report-title">Три SEO-страницы</h2>
        <p className={styles.analyticsNote}>Просмотры и нажатия — события за {days} дней, не уникальные посетители. Создания и оплаты относятся к выбранным открыткам и их первому SEO-источнику. Делить эти события друг на друга для расчёта конверсии нельзя.</p>
        <div className={styles.tableWrap} role="region" aria-label="Результаты SEO-страниц, таблица с горизонтальной прокруткой" tabIndex={0}>
          <table className={`${styles.table} ${styles.analyticsTable}`}>
            <thead><tr><th scope="col">Страница</th><th scope="col">Просмотры</th><th scope="col">Нажали «Пример»</th><th scope="col">Нажали «Создать»</th><th scope="col">Создали</th><th scope="col">Оплатили</th><th scope="col">Создание → оплата</th></tr></thead>
            <tbody>{analyticsLandings.map((landing) => {
              const activity = report.landings.find((item) => item.landing === landing.id);
              const counts = sumAcquisitionCounts(report.sources.filter((item) => item.landing === landing.id));
              return <tr key={landing.id}>
                <th scope="row"><Link href={landing.path}>{landing.label}</Link></th>
                <td>{activity?.views ?? 0}</td><td>{activity?.exampleClicks ?? 0}</td><td>{activity?.createClicks ?? 0}</td>
                <td>{counts.created}</td><td>{counts.paid}</td><td>{cohortConversion(counts.paid, counts.created)}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.analyticsPanel}`} aria-labelledby="sources-report-title">
        <h2 className={styles.panelTitle} id="sources-report-title">Источники созданных открыток</h2>
        <p className={styles.analyticsNote}>Первое сохранённое SEO-касание: страница, источник, канал и кампания. Без подтверждённой SEO-атрибуции: <strong>{unattributed}</strong>. Это не означает прямой трафик: источник мог не сохраниться, а входы через главную пока не размечаются.</p>
        {report.sources.length === 0 ? <p className={styles.emptyState}>Источники появятся после создания открыток.</p> : (
          <div className={styles.tableWrap} role="region" aria-label="Источники открыток, таблица с горизонтальной прокруткой" tabIndex={0}>
            <table className={`${styles.table} ${styles.analyticsTable}`}>
              <thead><tr><th scope="col">Страница / источник</th><th scope="col">Создали</th><th scope="col">С поздравлением</th><th scope="col">Оплатили</th><th scope="col">Передали</th><th scope="col">Открыли</th><th scope="col">Создание → оплата</th><th scope="col">Платежи</th></tr></thead>
              <tbody>{report.sources.map((row) => <tr key={JSON.stringify([row.landing, row.source, row.medium, row.campaign])}>
                <th scope="row" className={styles.analyticsSource}>
                  {analyticsLandings.find((l) => l.id === row.landing)?.label ?? "Без SEO-атрибуции"}
                  <span>{row.source ?? "Источник не определён"}{row.medium ? ` / ${row.medium}` : ""}</span>
                  {row.campaign && <span>Кампания: {row.campaign}</span>}
                </th>
                <td>{row.created}</td><td>{row.withGreeting}</td><td>{row.paid}</td><td>{row.delivered}</td><td>{row.opened}</td>
                <td>{cohortConversion(row.paid, row.created)}</td><td>{money(row.grossKopecks)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`${styles.panel} ${styles.analyticsPanel}`} aria-labelledby="participants-report-title">
        <h2 className={styles.panelTitle} id="participants-report-title">Участники за период</h2>
        <div className={`${styles.statsGrid} ${styles.analyticsStats}`}>
          <div className={styles.statCard}><p className={styles.statValue}>{report.participants.submissions}</p><p className={styles.statLabel}>Поздравлений от участников</p></div>
          <div className={styles.statCard}><p className={styles.statValue}>{report.participants.identities}</p><p className={styles.statLabel}>Идентификаторов участников</p></div>
          <div className={styles.statCard}><p className={styles.statValue}>{report.participants.unidentifiedSubmissions}</p><p className={styles.statLabel}>Поздравлений без идентификатора</p></div>
        </div>
        <p className={styles.analyticsNote}>Отправки за {days} дней на всех открытках, в том числе созданных раньше. Повторные сообщения одного идентификатора в одной открытке не увеличивают число участников. Другой браузер или открытка — отдельный идентификатор; это не точное число людей. Ручные поздравления организатора исключены.</p>
      </section>
    </>
  );
}
