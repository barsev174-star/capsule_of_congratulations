import { describe, expect, it } from "vitest";
import { createCriticalAlertFingerprint } from "./repository";

describe("critical alert fingerprint", () => {
  it("deduplicates the same operation across cards without mixing different operations", () => {
    const first = createCriticalAlertFingerprint("critical.media", { operation: "save_file", cardId: "card-1" });
    const second = createCriticalAlertFingerprint("critical.media", { operation: "save_file", cardId: "card-2" });
    const different = createCriticalAlertFingerprint("critical.media", { operation: "save_record", cardId: "card-1" });

    expect(first).toBe(second);
    expect(first).not.toBe(different);
  });
});
