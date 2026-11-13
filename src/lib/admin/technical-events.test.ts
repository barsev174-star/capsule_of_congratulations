import { safeTechnicalEvent } from "./technical-events";
import type { TelemetryEvent } from "@/lib/telemetry-repository";
const event:TelemetryEvent={id:"fa0f8045-b500-47e0-9518-b9a0c47c3e56",kind:"critical",event:"critical.database",cardId:null,errorId:"fc3f8045-b500-47e0-9518-b9a0c47c3e56",createdAt:"2026-11-13T10:00:00Z",context:{}};
describe("administrator-safe diagnostics",()=>{
  it("keeps a real code separate from event and correlation IDs",()=>{
    const safe=safeTechnicalEvent({...event,context:{errorCode:"23505",errorType:"Error",operation:"create_card",attemptCount:2}});
    expect(safe).toMatchObject({id:event.id,errorId:event.errorId,errorCode:"23505",errorType:"Error",operation:"create_card",diagnostics:{attemptCount:2}});
    expect(safeTechnicalEvent({...event,context:{code:event.id}}).errorCode).toBeNull();
    expect(safeTechnicalEvent({...event,context:{requestId:event.id,operation:"support_notification"}}).supportId).toBe(event.id);
  });
  it("does not return arbitrary messages, private links, personal data or nested secrets",()=>{
    const safe=safeTechnicalEvent({...event,cardId:"/manage/private-token",context:{message:"private-message",error:{message:"postgres://user:password@host/db"},email:"private@example.com",apiKey:"private-key",route:"/manage/private-token",operation:"/manage/private-token",reminderId:"private-token",errorCode:"SECRET_TOKEN",errorType:"private@example.com",httpStatus:502,durationMs:Infinity}});
    expect(safe).toMatchObject({cardId:null,reminderId:null,errorCode:null,errorType:null,operation:null,diagnostics:{httpStatus:502}});
    expect(JSON.stringify(safe)).not.toMatch(/private|password|postgres|SECRET_TOKEN/);
  });
});
