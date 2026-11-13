import Link from "next/link";
import type { TelemetrySummary } from "@/lib/telemetry-repository";
import { formatMoney, formatAdminDate } from "@/lib/admin/format";
import { AdminDataTable, AdminStatCard } from "../../components/admin-ui";
import { AdminDisclosure } from "../../components/admin-disclosure";
import styles from "../../admin.module.css";
const actions:Record<string,string>={initial:"Первый текст",warmer:"Сделать теплее",creative:"Творческий",alternative:"Ещё вариант",expand:"Подробнее",shorten:"Короче"};
const model=(value:string|null)=>value?.split("/").at(-1)??"Не указана";
const money=(rubles:number)=>formatMoney(rubles*100,"RUB",6);
const tokens=(input:number,cached:number,output:number)=>`Вход: ${input.toLocaleString("ru-RU")}${cached?`, кэш: ${cached.toLocaleString("ru-RU")}`:""} · Выход: ${output.toLocaleString("ru-RU")}`;
const plural=(n:number,forms:[string,string,string])=>{const mod=Math.abs(n)%100,last=mod%10;return forms[mod>10&&mod<20?2:last===1?0:last>=2&&last<=4?1:2];};
const usage=(operations:number,cards:number)=>`${operations} ${plural(operations,["операция","операции","операций"])}, ${cards} ${plural(cards,["открытка","открытки","открыток"])}`;
export function AiReport({summary}:{summary:TelemetrySummary}) {
  const cost=summary.aiCost;
  const value=(rubles:number,count=cost.generations)=>count?money(rubles):"—";
  return <>
    <div className={`${styles.statsGrid} ${styles.compactKpis}`}><AdminStatCard label="Расходы за период" value={value(cost.totalRub)}/><AdminStatCard label="Количество запусков" value={cost.generations}/><AdminStatCard label="Средняя стоимость запуска" value={value(cost.averageGenerationRub)}/></div>
    {!cost.generations&&<p className={styles.analyticsNote}>Данные появятся после первой генерации с учётом стоимости.</p>}
    <AdminDisclosure title="Расходы по операциям" open><AdminDataTable label="Расходы по операциям" rows={(cost.byOperation??[]).map((row,index)=>({...row,id:String(index)}))} columns={[
      {key:"action",label:"Операция",render:r=>r.action?actions[r.action]??r.action:"Не указана"},{key:"count",label:"Запуски",render:r=>r.operations},{key:"cost",label:"Расходы",render:r=>money(r.totalRub)}
    ]} empty="Нет данных по операциям."/></AdminDisclosure>
    <AdminDisclosure title="Расходы по моделям" open><AdminDataTable label="Расходы по моделям" rows={(cost.byModel??[]).map((row,index)=>({...row,id:String(index)}))} columns={[
      {key:"model",label:"Модели",render:r=><>Разбор: {model(r.extractorModel)}<span className={styles.cellSecondary}>Сборка: {model(r.composerModel)}</span></>},{key:"count",label:"Запуски",render:r=>r.operations},{key:"cost",label:"Расходы",render:r=>money(r.totalRub)}
    ]} empty="Нет данных по моделям."/></AdminDisclosure>
    <AdminDisclosure title="Показатели для решений по лимитам"><section aria-label="Показатели для решения по лимитам"><div className={`${styles.statsGrid} ${styles.compactKpis}`}>
      <AdminStatCard label="Средняя цена первого текста" value={value(cost.averageInitialRub,cost.initialGenerations)} detail={`${cost.initialGenerations} запусков`}/>
      <AdminStatCard label="Средняя цена повторного действия" value={value(cost.averageRepeatRub,cost.repeatGenerations)} detail={`${cost.repeatGenerations} запусков`}/>
      <AdminStatCard label="Запусков с автоисправлениями" value={cost.generations?new Intl.NumberFormat("ru-RU",{style:"percent",maximumFractionDigits:1}).format(cost.repairGenerationShare):"—"} detail={`${cost.generationsWithRepairs} из ${cost.generations}`}/>
      <AdminStatCard label="Операций на открытку до оплаты" value={cost.usageByPayment?.before.cards?new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(cost.usageByPayment.before.averagePerCard):"—"} detail={cost.usageByPayment?usage(cost.usageByPayment.before.operations,cost.usageByPayment.before.cards):"Нет данных"}/>
      <AdminStatCard label="Операций на открытку после оплаты" value={cost.usageByPayment?.after.cards?new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(cost.usageByPayment.after.averagePerCard):"—"} detail={cost.usageByPayment?usage(cost.usageByPayment.after.operations,cost.usageByPayment.after.cards):"Нет данных"}/>
      <AdminStatCard label="В среднем на открытку" value={value(cost.averageCardRub)} detail={`${cost.cards} открыток`}/>
      <AdminStatCard label="Разбор черновика" value={value(cost.extractorRub)}/><AdminStatCard label="Сборка текста" value={value(cost.composerRub)}/><AdminStatCard label="Автоисправления" value={value(cost.repairRub)} detail={`${cost.repairs} исправлений`}/><AdminStatCard label="Повторно использован разбор" value={cost.cacheHits}/>
    </div><p className={styles.analyticsNote}>Первый текст — действие «initial», повторные — остальные действия актуального сценария. Доля автоисправлений считается по запускам, а не по числу исправлений. Операции до и после оплаты — успешные списываемые из лимита операции за выбранный период; бесплатные служебные операции не учитываются. {!cost.usageByPayment&&"Разделение по оплате доступно только при подключении PostgreSQL."}</p></section></AdminDisclosure>
    <AdminDisclosure title="Последние запуски"><div role="region" aria-label="Детализация расходов на ИИ, таблица">{cost.recent.length===0?<p className={styles.emptyState}>За выбранный период запусков с детализацией нет.</p>:<div className={styles.runList}>{cost.recent.map(item=><details className={styles.runCard} key={item.id}><summary><span><strong>{item.action?actions[item.action]??item.action:"Старый сценарий"}</strong><time className={styles.cellSecondary}>{formatAdminDate(item.createdAt,true)}</time></span><strong>{money(item.totalCostRub)}</strong></summary><div>
      <p className={styles.analyticsNote}>{item.event==="ai.join_single_generation"?"Один результат":"Три результата"} · Кэш: {item.cacheHit?"Да":"Нет"}</p>
      <p>Разбор: {model(item.extractorModel)} · Сборка: {model(item.composerModel)}</p>
      <dl className={styles.metricGrid}>{([['Разбор',item.extractor],['Сборка',item.composer],['Исправления',item.repair]] as const).map(([label,stage])=><div key={label}><dt>{label}</dt><dd>{money(stage.totalRub)}</dd><span className={styles.cellSecondary}>{label==="Разбор"&&item.cacheHit?"План из кэша":tokens(stage.inputTokens,stage.cachedInputTokens,stage.outputTokens)} · Всего токенов: {stage.totalTokens}</span></div>)}</dl>
      <p className={styles.analyticsNote}>Исправлений: {item.repairCount}. {item.repairReasons.length?`Причины: ${item.repairReasons.join(", ")}`:"Не понадобились."}</p>
      {item.cardId&&/^[0-9a-f-]{36}$/i.test(item.cardId)?<Link className={styles.detailLink} href={`/admin/cards/${item.cardId}`}>Открытка #{item.cardId.slice(0,8)}</Link>:<span>Связь с открыткой не сохранена</span>}
    </div></details>)}</div>}</div></AdminDisclosure>
    <AdminDisclosure><p>Суммы в рублях с точностью до миллионной доли рубля, без изменения исходных значений и расчётов стоимости. Расходы по моделям группируются по сохранённой паре моделей разбора и сборки. Черновики и готовые поздравления здесь не сохраняются.</p></AdminDisclosure>
  </>;
}
