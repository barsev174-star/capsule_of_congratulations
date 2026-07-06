import { describe, expect, it } from "vitest";
import { normalizeBasicsFields, serializeBasicsFields } from "./basics-fields";

describe("basics field normalization", () => {
  it("ignores leading and trailing whitespace when detecting changes", () => {
    const saved = { description: "Короткое описание", recipientName: "Анна" };
    const edited = { description: "Короткое описание   ", recipientName: "  Анна " };

    expect(serializeBasicsFields(edited)).toBe(serializeBasicsFields(saved));
  });

  it("preserves meaningful whitespace inside text", () => {
    expect(normalizeBasicsFields({ description: "Очень  тёплая открытка" })).toEqual({
      description: "Очень  тёплая открытка"
    });
  });
});
