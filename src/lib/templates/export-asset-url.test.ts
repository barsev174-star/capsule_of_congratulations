import { describe, expect, it } from "vitest";
import { resolveTemplateExportAsset } from "./export-asset-url";

describe("resolveTemplateExportAsset", () => {
  it("uses the same relative transformation route in the template studio", () => {
    expect(resolveTemplateExportAsset("/templates/school-scrapbook/page.webp"))
      .toBe("/api/template-export-asset?src=%2Ftemplates%2Fschool-scrapbook%2Fpage.webp&v=2");
  });

  it("uses an absolute transformation route for server-side export", () => {
    expect(resolveTemplateExportAsset("/templates/school-scrapbook/page.webp", "http://localhost:3000"))
      .toBe("http://localhost:3000/api/template-export-asset?src=%2Ftemplates%2Fschool-scrapbook%2Fpage.webp&v=2");
  });

  it("leaves browser assets relative and resolves server assets against the origin", () => {
    expect(resolveTemplateExportAsset("/brand/email-logo.png")).toBe("/brand/email-logo.png");
    expect(resolveTemplateExportAsset("/brand/email-logo.png", "http://localhost:3000"))
      .toBe("http://localhost:3000/brand/email-logo.png");
  });
});
