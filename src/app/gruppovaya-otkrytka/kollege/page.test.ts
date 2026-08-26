import { describe, expect, it } from "vitest";
import { metadata } from "./page";

describe("colleague landing metadata", () => {
  it("publishes a unique canonical, title and social image", () => {
    expect(metadata.alternates?.canonical).toBe("/gruppovaya-otkrytka/kollege");
    expect(metadata.title).toEqual({
      absolute: "Групповая онлайн-открытка коллеге от команды — Slovesto"
    });
    expect(metadata.description).toContain("повышение или прощание");
    expect(metadata.openGraph).toMatchObject({
      url: "/gruppovaya-otkrytka/kollege",
      images: [expect.objectContaining({ url: "/landing/colleague/og-team-editorial.jpg" })]
    });
  });
});
