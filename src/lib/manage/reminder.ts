import type { CardDraft } from "@/lib/cards/types";
import { getJoinUrl } from "@/lib/routes/card-links";

export const buildReminderText = (card: CardDraft, visibleCount: number) => {
  const dateHint = card.eventDate ? ` До события осталось не так много времени.` : "";
  return `Друзья, напоминаю: собираем поздравление для ${card.recipientName}.${dateHint} Уже добавили сообщений: ${visibleCount}. Добавьте пару теплых слов по ссылке — можно с помощью AI: ${getJoinUrl(card.publicSlug)}`;
};
