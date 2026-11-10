import { describe, expect, it } from "vitest";
import { resolveDemoAnimationId, resolveDemoTemplateId } from "./example-query";

describe("example query parameters", () => {
  it("accepts the template and reveal values produced by the editor", () => {
    expect(resolveDemoTemplateId("school-scrapbook")).toBe("school-scrapbook");
    expect(resolveDemoTemplateId("new-year-red")).toBe("new-year-red");
    expect(resolveDemoTemplateId("new-year-green")).toBe("new-year-green");
    expect(resolveDemoTemplateId("new-year", "green")).toBe("new-year-green");
    expect(resolveDemoTemplateId("new-year")).toBe("new-year-red");
    expect(resolveDemoAnimationId("collect-messages")).toBe("collect-messages");
  });

  it.each(["unknown-template", "../../manage/private", "constructor", ""])("falls back for an invalid template %s", (value) => {
    expect(resolveDemoTemplateId(value)).toBeUndefined();
  });

  it.each(["unknown-reveal", "COLLECT_MESSAGES", ""])("falls back for an invalid reveal %s", (value) => {
    expect(resolveDemoAnimationId(value)).toBeUndefined();
  });
});
