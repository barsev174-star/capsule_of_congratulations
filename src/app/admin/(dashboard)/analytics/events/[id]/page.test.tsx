const mocks=vi.hoisted(()=>({authorize:vi.fn(),event:vi.fn()}));
vi.mock("@/lib/admin/session",()=>({requireAdminRole:mocks.authorize}));
vi.mock("@/lib/admin/technical-events",()=>({getAdminTechnicalEvent:mocks.event}));
import Page from "./page";
it("requires administrator permission before reading diagnostic context",async()=>{
  mocks.authorize.mockRejectedValue(new Error("Forbidden"));
  await expect(Page({params:Promise.resolve({id:"fa0f8045-b500-47e0-9518-b9a0c47c3e56"}),searchParams:Promise.resolve({days:"30"})})).rejects.toThrow("Forbidden");
  expect(mocks.event).not.toHaveBeenCalled();
});
