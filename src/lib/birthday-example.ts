import type { CardMediaAsset, Contribution } from "@/lib/cards/types";
import type { FinalCardViewModel } from "@/lib/final-card/view-model";
import { exampleCardModel } from "@/lib/example-card";
import { kristinaExamplePhotos } from "@/lib/kristina-example-photos";

const birthdayMessages = [
  ["Марина", "подруга детства", "Крис, с днём рождения! Помнишь, как мы уходили гулять на час, а возвращались вечером? С тобой до сих пор любая прогулка превращается в приключение. Спасибо, что рядом с тобой можно быть собой. Пусть у нас будет ещё много таких дней!"],
  ["Мама", "мама", "Кристиночка, с днём рождения! Как же я люблю наши разговоры на кухне, когда чай уже остыл, а расходиться не хочется. В твоём доме всегда находится место для ещё одного человека. Желаю тебе здоровья, спокойствия и времени на свои мечты. Обнимаю крепко!"],
  ["Игорь", "брат", "С днём рождения, сестрёнка! До сих пор смеюсь, вспоминая, как мы заблудились по дороге к озеру и нашли место ещё лучше. Ты умеешь превратить любой план Б в лучшую часть дня. Пусть впереди будет побольше таких открытий!"],
  ["Алексей", "любимый человек", "Кристина, с днём рождения! Люблю наши завтраки, спонтанные поездки и твой смех, который слышно из другой комнаты. С тобой даже самый обычный вторник хочется запомнить. Пусть в этом году сбудется та самая мечта, о которой мы говорили. Я рядом."],
  ["Настя", "подруга", "Крис, поздравляю! Спасибо, что можно позвонить тебе без повода и через пять минут уже смеяться. Ты умеешь выслушать и поддержать без лишних советов. Желаю тебе побольше встреч, поездок и маленьких радостей — и обещаю чаще выбираться к тебе в гости!"],
  ["Бабушка Лида", "бабушка", "Кристиночка, с днём рождения! Берегу нашу фотографию с прошлого праздника, где мы обе смеёмся. Спасибо, что звонишь и рассказываешь даже о самых обычных делах. Пусть рядом будут добрые люди, а поводов для улыбки будет больше каждый день."]
] as const;

const contributions: Contribution[] = birthdayMessages.map(([authorName, authorRole, message], index) => ({
  ...exampleCardModel.contributions[index],
  id: `birthday-friends-${index + 1}`,
  cardId: "example-birthday-friends",
  authorName,
  authorRole,
  message,
  sortOrder: index + 1
}));

export const birthdayPhotos = kristinaExamplePhotos;

const slots = ["landscape-a", "memory-a", "landscape-b", "memory-b", "landscape-c", "memory-c"] as const;
const mediaAssets: CardMediaAsset[] = birthdayPhotos.map((photo, index) => ({
  ...exampleCardModel.mediaAssets[index],
  id: `birthday-photo-${index + 1}`,
  cardId: "example-birthday-friends",
  slot: slots[index],
  publicUrl: photo.src,
  storagePath: `public${photo.src}`,
  fileName: photo.src.split("/").pop()!,
  mimeType: "image/webp",
  captionTitle: photo.caption,
  captionSubtitle: photo.caption
}));

export const birthdayExampleCardModel: FinalCardViewModel = {
  ...exampleCardModel,
  finalSlug: "example-birthday-friends",
  fromLabel: "от друзей и семьи",
  heroDescription: "От друзей и семьи — поздравления, любимые фотографии и наши общие моменты.",
  summaryText: "Кристина, с днём рождения!\n\nУ каждого из нас есть своя история с тобой: долгие разговоры на кухне, неожиданные поездки, прогулки без маршрута и праздники, с которых не хочется уходить. Мы собрали их здесь, чтобы ты могла вернуться к ним в любой день.\n\nСпасибо за твою заботу, за смех и за то, что рядом с тобой можно быть собой. Пусть впереди будет больше времени на любимых людей и на всё, о чём ты мечтаешь.\n\nМы рядом — даже когда между нами разные города. Обнимаем тебя все вместе!",
  participantCount: contributions.length,
  contributions,
  qualities: ["забота", "чувство юмора", "поддержка", "доброта", "открытость", "лёгкость"],
  quotes: [
    "Спасибо, что рядом с тобой можно быть собой.\n— Марина",
    "Ты умеешь превратить любой план Б в лучшую часть дня.\n— Игорь",
    "С тобой даже самый обычный вторник хочется запомнить.\n— Алексей"
  ],
  mediaAssets,
  messageMediaAssets: mediaAssets.filter((asset) => asset.slot.startsWith("landscape")),
  memoryMediaAssets: mediaAssets.filter((asset) => asset.slot.startsWith("memory")),
  footerSignature: "Кристина, пусть впереди будет ещё больше поводов собраться вместе. А пока — вот наши слова, которые всегда будут рядом.\n\nС любовью, твои друзья и семья."
};
