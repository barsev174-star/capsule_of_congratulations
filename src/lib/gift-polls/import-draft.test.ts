import { describe, expect, it } from "vitest";
import { emptyImportedGiftFields, importWouldOverwriteUserEdits, isSafeHttpUrl, isUsableImportResult, mergeImportedDraft } from "./import-draft";

const filled = () => ({ title: "Лодка Аква 2900", description: "Надувная лодка", productUrl: "https://shop.ru/p/1", imageUrl: "https://shop.ru/i/1.jpg", priceLabel: "40 050" });

describe("isSafeHttpUrl", () => {
  it("accepts only http and https URLs", () => {
    expect(isSafeHttpUrl("https://shop.ru/p/1")).toBe(true);
    expect(isSafeHttpUrl("http://shop.ru/p/1")).toBe(true);
    expect(isSafeHttpUrl("ftp://shop.ru/p/1")).toBe(false);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("Просто текст подарка")).toBe(false);
  });
});

describe("isUsableImportResult", () => {
  it("is false when nothing usable was extracted", () => {
    expect(isUsableImportResult(emptyImportedGiftFields())).toBe(false);
  });
  it("is true when at least one field survived", () => {
    expect(isUsableImportResult({ ...emptyImportedGiftFields(), title: "Лодка" })).toBe(true);
  });
});

describe("mergeImportedDraft", () => {
  it("uses the new result for a first import", () => {
    const merged = mergeImportedDraft(null, filled(), true);
    expect(merged.fields).toEqual(filled());
    expect(merged.sources).toEqual({ title: "auto", description: "auto", productUrl: "auto", imageUrl: "auto", priceLabel: "auto" });
  });

  it("replaces auto fields and clears values absent from the new result", () => {
    const current = { fields: filled(), sources: { title: "auto" as const, priceLabel: "auto" as const } };
    const next = { ...emptyImportedGiftFields(), title: "Другой товар" };
    const merged = mergeImportedDraft(current, next, true);
    expect(merged.fields).toEqual(next);
    expect(merged.sources).toEqual({ title: "auto" });
  });

  it("keeps user-edited fields when keepUserEdits is set", () => {
    const current = { fields: { ...filled(), title: "Моё название" }, sources: { title: "user" as const, priceLabel: "auto" as const } };
    const merged = mergeImportedDraft(current, filled(), true);
    expect(merged.fields.title).toBe("Моё название");
    expect(merged.sources.title).toBe("user");
    expect(merged.fields.priceLabel).toBe(filled().priceLabel);
  });

  it("replaces user-edited fields when keepUserEdits is not set", () => {
    const current = { fields: { ...filled(), title: "Моё название" }, sources: { title: "user" as const } };
    const merged = mergeImportedDraft(current, filled(), false);
    expect(merged.fields.title).toBe(filled().title);
    expect(merged.sources.title).toBe("auto");
  });
});

describe("importWouldOverwriteUserEdits", () => {
  it("is true when a user-edited value differs from the new import", () => {
    const current = { ...filled(), title: "Моё название" };
    expect(importWouldOverwriteUserEdits(current, { title: "user" }, filled())).toBe(true);
  });
  it("is false when only auto fields change", () => {
    expect(importWouldOverwriteUserEdits(filled(), { title: "auto" }, { ...filled(), title: "Другой" })).toBe(false);
  });
  it("is false when the user field matches the new value", () => {
    expect(importWouldOverwriteUserEdits(filled(), { title: "user" }, filled())).toBe(false);
  });
});
