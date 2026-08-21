import { describe, expect, it } from "vitest";
import { buildNativeShareData, buildVersionedShareUrl } from "./share-actions";

describe("public share native payload", () => {
  it("passes only the title and URL so messengers can build their own link preview", () => {
    expect(buildNativeShareData("Анна", "https://slovesto.ru/share/token")).toEqual({
      title: "Анна делится открыткой",
      url: "https://slovesto.ru/share/token?preview=v1"
    });
    expect(buildNativeShareData(null, "https://slovesto.ru/share/token")).not.toHaveProperty("text");
  });

  it("preserves existing parameters and replaces the preview version without duplicates", () => {
    expect(buildVersionedShareUrl("https://slovesto.ru/share/token?source=button&preview=old"))
      .toBe("https://slovesto.ru/share/token?source=button&preview=v1");
  });
});
