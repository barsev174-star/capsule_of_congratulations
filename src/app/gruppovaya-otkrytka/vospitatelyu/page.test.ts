import { describe, expect, it } from "vitest";
import { metadata } from "./page";

describe("caregiver landing metadata", () => {
  it("uses a stable canonical, title and caregiver OG asset", () => {
    expect(metadata.alternates?.canonical).toBe("/gruppovaya-otkrytka/vospitatelyu");
    expect(metadata.title).toEqual({
      absolute: "Групповая онлайн-открытка воспитателю от группы — Slovesto"
    });
    expect(metadata.description).toContain("слова родителей и детей");
    expect(metadata.openGraph?.images).toEqual(expect.arrayContaining([
      expect.objectContaining({
        url: "/landing/caregiver/og-kindergarten-doodles.webp",
        width: 1200,
        height: 630
      })
    ]));
  });
});
