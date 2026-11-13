import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type { TelemetryEvent } from "@/lib/telemetry-repository";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const operations = new Set(["organizer_access","create_contribution","event_reminder","event_reminder_create","event_reminder_confirmation","create_card","save_file","save_media_record","qualities","participant_generation","retention_purge","support_notification","support_notification_send","best_quotes"]);
export type AdminTechnicalEvent = { id:string; event:string; date:string; errorId:string|null; errorCode:string|null; errorType:string|null; operation:string|null; cardId:string|null; reminderId:string|null; supportId:string|null; diagnostics:Record<string,number> };
export function safeTechnicalEvent(event:TelemetryEvent):AdminTechnicalEvent {
  const context = event.context;
  const rawCode = context.errorCode ?? context.code;
  const code = typeof rawCode === "string" && /^[A-Z0-9_]{2,40}$/.test(rawCode) && !/(SECRET|PASSWORD|TOKEN|KEY)/.test(rawCode) ? rawCode : null;
  const errorType = typeof context.errorType === "string" && /^(?:[A-Za-z]{1,70})?Error$/.test(context.errorType) ? context.errorType : null;
  const diagnostics:Record<string,number>={};
  for (const key of ["attemptCount","durationMs","statusCode","httpStatus"]) if(typeof context[key]==="number" && Number.isFinite(context[key])) diagnostics[key]=context[key];
  return { id:event.id, event:event.event, date:event.createdAt, errorId:event.errorId && uuid.test(event.errorId)?event.errorId:null, errorCode:code, errorType, operation:typeof context.operation==="string"&&operations.has(context.operation)?context.operation:null, cardId:event.cardId&&uuid.test(event.cardId)?event.cardId:null, reminderId:typeof context.reminderId==="string"&&uuid.test(context.reminderId)?context.reminderId:null, supportId:typeof (context.supportRequestId??(context.operation==="support_notification"?context.requestId:null))==="string"&&uuid.test(String(context.supportRequestId??context.requestId))?String(context.supportRequestId??context.requestId):null, diagnostics };
}
export async function getAdminTechnicalEvent(id:string):Promise<AdminTechnicalEvent|null> {
  if(!uuid.test(id))return null;
  if(!isPostgresConfigured()) {
    try { const rows=JSON.parse(await readFile(join(process.cwd(),"data","telemetry-events.json"),"utf8")) as TelemetryEvent[]; const row=rows.find(item=>item.id===id&&item.kind!=="funnel"); return row?{...safeTechnicalEvent(row),cardId:null,reminderId:null,supportId:null}:null; } catch{return null;}
  }
  const result=await getPostgresPool().query<TelemetryEvent>(`SELECT id,kind,event,card_id AS "cardId",context,error_id AS "errorId",created_at::text AS "createdAt" FROM telemetry_events WHERE id=$1 AND kind <> 'funnel'`,[id]);
  if(!result.rows[0])return null;
  const safe=safeTechnicalEvent(result.rows[0]);
  const [card,reminder,support]=await Promise.all([
    safe.cardId?getPostgresPool().query("SELECT id FROM cards WHERE id=$1 AND purged_at IS NULL",[safe.cardId]):null,
    safe.reminderId?getPostgresPool().query("SELECT id FROM event_reminders WHERE id=$1",[safe.reminderId]):null,
    safe.supportId?getPostgresPool().query("SELECT id FROM support_requests WHERE id=$1",[safe.supportId]):null
  ]);
  return {...safe,cardId:card?.rows.length?safe.cardId:null,reminderId:reminder?.rows.length?safe.reminderId:null,supportId:support?.rows.length?safe.supportId:null};
}
