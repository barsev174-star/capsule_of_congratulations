import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BirthdayLandingPage, { metadata } from "./page";
import { birthdayFaqs, birthdayVoices } from "./birthday-landing-content";
import { birthdayExampleCardModel } from "@/lib/birthday-example";
import sitemap from "@/app/sitemap";

describe("birthday landing", () => {
  it("publishes a dedicated canonical and sitemap entry", () => {
    expect(metadata.alternates?.canonical).toBe("/gruppovaya-otkrytka/den-rozhdeniya");
    expect(metadata.title).toEqual({ absolute: "Групповая онлайн-открытка на день рождения — Slovesto" });
    expect(sitemap().some((entry) => entry.url === "https://slovesto.ru/gruppovaya-otkrytka/den-rozhdeniya")).toBe(true);
  });

  it("renders indexable content and FAQ schema matching the visible answers", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(<BirthdayLandingPage />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    const schema = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(schema[0].itemListElement[1].item).toBe("https://slovesto.ru/gruppovaya-otkrytka/den-rozhdeniya");
    expect(schema[1].mainEntity.map((item: { name: string; acceptedAnswer: { text: string } }) => [item.name, item.acceptedAnswer.text])).toEqual(birthdayFaqs);
    expect(container.textContent).toContain("399 ₽");
    expect(container.textContent).toContain("Укажите имя именинника и выберите оформление, которое ему подойдёт.");
    expect(container.textContent).toContain("Создать такую на день рождения");
    expect(container.textContent).not.toContain("Сделать такую для близкого");
    expect(container.querySelector("h1")?.textContent).toContain("от друзей и близких");
  });

  it("uses real quotes from the demonstrated birthday story", () => {
    for (const voice of birthdayVoices) {
      expect(birthdayExampleCardModel.contributions.find((item) => item.authorName === voice.name)?.message).toContain(voice.quote);
    }
  });
});
