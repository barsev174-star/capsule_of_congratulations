import { describe, expect, it } from "vitest";
import { buildNativeShareData } from "./share-actions";

describe("public share native payload", () => {
  it("passes only the title and URL so messengers can build their own link preview", () => {
    expect(buildNativeShareData("Анна", "https://slovesto.ru/share/token")).toEqual({
      title: "Анна делится открыткой",
      url: "https://slovesto.ru/share/token"
    });
    expect(buildNativeShareData(null, "https://slovesto.ru/share/token")).not.toHaveProperty("text");
  });
});
