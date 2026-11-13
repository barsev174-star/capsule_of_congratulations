import Link from "next/link";
import { analyticsLandings, cohortConversion, sumAcquisitionCounts, type AcquisitionAnalytics } from "@/lib/admin/acquisition-analytics";
import { formatMoney } from "@/lib/admin/format";
import { homeActivityPlacements } from "@/lib/home-activity";
import { AdminDataTable, AdminStatCard } from "../../components/admin-ui";
import { AdminDisclosure } from "../../components/admin-disclosure";
import styles from "../../admin.module.css";

const placements = { header:"Шапка и меню", hero:"Первый экран", templates:"Шаблоны", price:"Цена", final:"Нижний блок", footer:"Подвал" };
const stages = [["created","Создали открытку"],["withGreeting","Добавили хотя бы одно поздравление"],["paid","Подтверждена оплата"],["delivered","Передали открытку"],["opened","Открыли по ссылке получателя"]] as const;

function SourcePages({report}:{report:AcquisitionAnalytics}) {
  const pages = analyticsLandings.map(landing => ({...landing, ...report.landings.find(item => item.landing===landing.id), counts:sumAcquisitionCounts(report.sources.filter(item=>item.landing===landing.id))}));
  const active = pages.filter(row => row.views || row.exampleClicks || row.createClicks || row.counts.created || row.counts.paid);
  const rest = pages.filter(row => !active.includes(row));
  const card = (row:typeof pages[number]) => <article key={row.id} className={styles.sourceCard}>
    <Link href={row.path}>{row.label}</Link><dl className={styles.metricGrid}>
      <div><dt>Просмотры</dt><dd>{row.views??0}</dd></div><div><dt>Создано</dt><dd>{row.counts.created}</dd></div>
      <div><dt>Оплачено</dt><dd>{row.counts.paid}</dd></div><div><dt>Создание → оплата</dt><dd>{cohortConversion(row.counts.paid,row.counts.created)}</dd></div>
    </dl><AdminDisclosure title="Дополнительные клики"><p>Пример: {row.exampleClicks??0} · Создать: {row.createClicks??0}</p></AdminDisclosure>
  </article>;
  return <><div className={styles.desktopOnly}><AdminDataTable rows={pages} label="Результаты страниц" columns={[
    {key:"page",label:"Страница",width:"25%",render:r=><Link href={r.path}>{r.label}</Link>},
    {key:"views",label:"Просмотры",render:r=>r.views??0},{key:"created",label:"Создали",render:r=>r.counts.created},
    {key:"paid",label:"Оплатили",render:r=>r.counts.paid},{key:"conversion",label:"Создание → оплата",render:r=>cohortConversion(r.counts.paid,r.counts.created)},
    {key:"clicks",label:"Клики",render:r=><AdminDisclosure title="Подробнее"><p>Пример: {r.exampleClicks??0}</p><p>Создать: {r.createClicks??0}</p></AdminDisclosure>}
  ]}/></div><div className={`${styles.mobileOnly} ${styles.sourceCards}`}>{active.map(card)}{rest.length>0&&<AdminDisclosure title={`Остальные страницы (${rest.length})`}>{rest.map(card)}</AdminDisclosure>}</div></>;
}

export function AcquisitionReport({report,days,mode="all"}:{report:AcquisitionAnalytics|null;days:number|null;mode?:"all"|"funnel"|"sources"}) {
  if(!report) return <section className={`${styles.panel} ${styles.analyticsPanel}`}><h2 className={styles.panelTitle}>Путь открыток и источники</h2><p className={styles.analyticsNote}>Отчёт доступен при подключении PostgreSQL. В локальном JSON-хранилище нет проверенного платёжного журнала; продажи и конверсии не рассчитываются.</p></section>;
  const {totals}=report, unattributed=report.sources.filter(row=>row.source===null).reduce((sum,row)=>sum+row.created,0);
  const period=days===null?"за всё время":`за последние ${days} дней`;
  return <>
    {mode!=="sources"&&<>
      <div className={`${styles.statsGrid} ${styles.analyticsStats}`}><AdminStatCard label={`Создали ${period}`} value={totals.created}/><AdminStatCard label="Из них оплатили" value={totals.paid}/><AdminStatCard label="Создание → оплата" value={cohortConversion(totals.paid,totals.created)}/><AdminStatCard label="Подтверждённые платежи" value={formatMoney(totals.grossKopecks)}/></div>
      <section className={`${styles.panel} ${styles.analyticsPanel}`} aria-labelledby="card-journey-title"><h2 id="card-journey-title" className={styles.panelTitle}>Путь открыток</h2>
        {totals.created===0?<p className={styles.emptyState}>За этот период ещё не создали открыток.</p>:<div className={styles.funnelList}>{stages.map(([key,label])=><div className={styles.funnelRow} key={key}><div className={styles.funnelMeta}><span>{label}</span><strong>{totals[key]}</strong></div><div className={styles.funnelTrack} aria-hidden="true"><span style={{width:`${totals[key]/totals.created*100}%`}}/></div><span className={styles.funnelConversion}>{cohortConversion(totals[key],totals.created)} от созданных</span></div>)}</div>}
        <p className={styles.analyticsNote}>Проценты рассчитаны от всех открыток, созданных за выбранный период. Отдельные этапы могут не образовывать строгую последовательность.</p>
        <AdminDisclosure><p>Открытки, созданные {period}, и их результат к текущему моменту. На каждом этапе одна открытка считается один раз; проценты — от всех созданных, а не от соседнего этапа.</p><p>Подготовка открытки: нет данных — отдельное событие завершения подготовки не фиксируется.</p><p>Поздравления учитываются и от участников, и от организатора, включая впоследствии скрытые или удалённые. Передача возможна с бесплатным доступом, поэтому этапы не обязаны убывать. Открытие фиксирует доступ по ссылке получателя, но не устанавливает личность посетителя.</p><p>Оплата — подтверждение Robokassa на сервере, без тестового режима и административных выдач доступа. Оплаченных заказов: <strong>{totals.paidOrders}</strong>. Возвращено по этим заказам: <strong>{formatMoney(totals.refundedKopecks)}</strong>. Возврат не отменяет факт состоявшейся покупки. Это результат выбранных открыток, а не кассовая выручка за период.</p></AdminDisclosure>
      </section>
    </>}
    {mode!=="funnel"&&<>
      <section className={`${styles.panel} ${styles.analyticsPanel}`} aria-labelledby="seo-report-title"><h2 id="seo-report-title" className={styles.panelTitle}>Главная и тематические страницы</h2>
        <p className={styles.analyticsNote}>Просмотры за период; создания и оплаты — результат выбранной когорты открыток.</p><SourcePages report={report}/>
        <AdminDisclosure><p>Просмотры и нажатия — события {period}, не уникальные посетители и не только первые входы. Создания и оплаты относятся к выбранным открыткам и их первой сохранённой странице входа после согласия. Делить эти события друг на друга для расчёта конверсии нельзя.</p><p>Счётчики главной учитывают просмотры и нажатия без идентификатора посетителя. Посещения до включения учёта не восстанавливаются; блокировщики и отключённый JavaScript могут уменьшать числа.</p></AdminDisclosure>
      </section>
      <section className={`${styles.panel} ${styles.analyticsPanel}`} aria-labelledby="home-actions-title"><h2 id="home-actions-title" className={styles.panelTitle}>Что нажимают на главной</h2><AdminDisclosure title="Нажатия по блокам"><div role="region" aria-label="Нажатия на главной, таблица"><AdminDataTable label="Нажатия на главной" rows={homeActivityPlacements.map(id=>({id,...report.homeActions.find(row=>row.placement===id)}))} columns={[
        {key:"block",label:"Блок",render:r=>placements[r.id]},{key:"example",label:"Пример",render:r=>r.exampleClicks??0},{key:"create",label:"Создать",render:r=>r.createClicks??0}
      ]}/></div><p>Нажатия по блокам страницы {period}. Повторные нажатия учитываются отдельно; нажатие «Создать» ещё не означает успешное создание открытки.</p></AdminDisclosure></section>
      <section className={`${styles.panel} ${styles.analyticsPanel}`} aria-labelledby="sources-report-title"><h2 id="sources-report-title" className={styles.panelTitle}>Источники созданных открыток</h2><p className={styles.analyticsNote}>Источник определён у <strong>{totals.created-unattributed} из {totals.created}</strong> открыток. Не определён: <strong>{unattributed}</strong>.</p>
        <div role="region" aria-label="Источники открыток, таблица" tabIndex={0}><AdminDataTable label="Источники созданий" rows={report.sources.map((r,index)=>({...r,id:String(index)}))} empty="Источники появятся после создания открыток." columns={[
          {key:"source",label:"Страница / источник",mobilePrimary:true,render:r=><><strong>{analyticsLandings.find(l=>l.id===r.landing)?.label??"Страница входа не определена"}</strong><span className={styles.cellSecondary}>{r.source??"Источник не определён"}</span></>},
          {key:"created",label:"Создали",render:r=>r.created},{key:"paid",label:"Оплатили",render:r=>r.paid},{key:"conversion",label:"Создание → оплата",render:r=>cohortConversion(r.paid,r.created)},
          {key:"money",label:"Платежи",render:r=>formatMoney(r.grossKopecks)},
          {key:"details",label:"Подробности",render:r=><AdminDisclosure title="Подробнее"><p>Канал: {r.medium??"Не определён"}</p><p>Кампания: {r.campaign??"Не определена"}</p><p>С поздравлением: {r.withGreeting} · Передали: {r.delivered} · Открыли: {r.opened}</p><p>Заказов: {r.paidOrders} · Возвращено: {formatMoney(r.refundedKopecks)}</p></AdminDisclosure>}
        ]}/></div>
        <AdminDisclosure><p>Первый сохранённый вход после согласия: страница, источник, канал и кампания. Без определённого источника: <strong>{unattributed}</strong>. Это не означает прямой трафик: посетитель мог отказаться от аналитики, источник мог не передаться или посещение произошло до включения учёта.</p><p>Кампания связывается с результатом открытки, даже если её создали позднее через пример или другую страницу. Здесь показаны источники созданных открыток; расходы на рекламу и посетители, не создавшие открытку, в эту таблицу не входят. Страница нажатия CTA и операция оплаты не заменяют источник первого сохранённого входа.</p></AdminDisclosure>
      </section>
    </>}
    {mode!=="sources"&&<section className={`${styles.panel} ${styles.analyticsPanel}`} aria-labelledby="participants-report-title"><h2 id="participants-report-title" className={styles.panelTitle}>Участники за период</h2><div className={`${styles.statsGrid} ${styles.analyticsStats}`}><AdminStatCard label="Поздравлений от участников" value={report.participants.submissions}/><AdminStatCard label="Идентификаторов участников" value={report.participants.identities}/><AdminStatCard label="Без идентификатора" value={report.participants.unidentifiedSubmissions}/></div><p className={styles.analyticsNote}>Отправки поздравлений за период на всех открытках. Идентификатор участника не равен человеку.</p><AdminDisclosure><p>Отправки {period} на всех открытках, в том числе созданных раньше. Повторные сообщения одного идентификатора в одной открытке не увеличивают число участников. Другой браузер или открытка — отдельный идентификатор; это не точное число людей. Ручные поздравления организатора исключены.</p></AdminDisclosure></section>}
  </>;
}
