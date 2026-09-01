import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("organizer access mobile controls", () => {
  it("keeps the owner-email action inside its grid track at a compact height", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/app/manage/[manageToken]/organizer-access-settings.module.css"),
      "utf8"
    );

    expect(css).toMatch(/\.launchButton,[\s\S]*?box-sizing:\s*border-box;/);
    expect(css).toMatch(/\.launchButton\s*\{[\s\S]*?height:\s*44px;/);
    expect(css).toMatch(/@media \(max-width:\s*640px\)[\s\S]*?\.launchButton,[\s\S]*?width:\s*100%;/);
  });
});
