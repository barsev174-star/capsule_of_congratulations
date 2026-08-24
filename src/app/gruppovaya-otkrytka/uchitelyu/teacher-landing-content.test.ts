import { describe, expect, it } from "vitest";
import { getTeacherHeroNote } from "./teacher-landing-content";

describe("getTeacherHeroNote", () => {
  it("показывает 1 сентября до конца 1 сентября по Екатеринбургу", () => {
    expect(getTeacherHeroNote(new Date("2026-09-01T18:59:59.000Z")).title).toBe("Успейте к 1 сентября");
  });

  it("переключается на День учителя в начале 2 сентября по Екатеринбургу", () => {
    const note = getTeacherHeroNote(new Date("2026-09-01T19:00:00.000Z"));

    expect(note.title).toBe("Соберите открытку ко Дню учителя");
    expect(note.text).toContain("к 5 октября");
  });

  it("сохраняет День учителя до конца 5 октября по Екатеринбургу", () => {
    expect(getTeacherHeroNote(new Date("2026-10-05T18:59:59.000Z")).title).toBe("Соберите открытку ко Дню учителя");
  });

  it("после 5 октября возвращается к вечнозелённому обещанию", () => {
    expect(getTeacherHeroNote(new Date("2026-10-05T19:00:00.000Z")).title).toBe("Скажите учителю спасибо всем классом");
  });

  it("начинает сезон 1 сентября с 1 июля", () => {
    expect(getTeacherHeroNote(new Date("2026-06-30T19:00:00.000Z")).title).toBe("Успейте к 1 сентября");
  });
});
