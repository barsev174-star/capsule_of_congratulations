import { describe, expect, it } from "vitest";
import { caregiverFaqs, getCaregiverHeroNote } from "./caregiver-landing-content";

describe("getCaregiverHeroNote", () => {
  it("показывает День воспитателя с 15 августа по Екатеринбургу", () => {
    expect(getCaregiverHeroNote(new Date("2026-08-14T19:00:00.000Z")).title)
      .toBe("Соберите открытку к 27 сентября");
  });

  it("сохраняет сезонный блок до конца 27 сентября", () => {
    expect(getCaregiverHeroNote(new Date("2026-09-27T18:59:59.000Z")).title)
      .toBe("Соберите открытку к 27 сентября");
  });

  it("после 27 сентября возвращается к вечнозелённому сценарию", () => {
    expect(getCaregiverHeroNote(new Date("2026-09-27T19:00:00.000Z")).title)
      .toBe("Скажите спасибо всей группой");
  });

  it("показывает сценарий выпускного с апреля по июнь", () => {
    expect(getCaregiverHeroNote(new Date("2026-03-31T19:00:00.000Z")).title)
      .toBe("Сохраните память о годах в детском саду");
    expect(getCaregiverHeroNote(new Date("2026-06-30T18:59:59.000Z")).title)
      .toBe("Сохраните память о годах в детском саду");
  });
});

describe("caregiver landing product copy", () => {
  it("объясняет, что цена указана за всю открытку", () => {
    const priceFaq = caregiverFaqs.find(([question]) => question === "Нужно ли оплачивать заранее?");

    expect(priceFaq?.[1]).toContain("за всю открытку");
    expect(priceFaq?.[1]).toContain("независимо от числа участников");
  });
});
