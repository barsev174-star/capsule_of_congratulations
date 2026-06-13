import { randomUUID } from "node:crypto";
import { countAiGenerationsByCardId, saveAiGenerationLog } from "@/lib/ai/repository";
import type { AiGenerationInput, AiGenerationLog, AiGenerationResult, AiStyle } from "@/lib/ai/types";
import { logger } from "@/lib/logger";

const CARD_GENERATION_LIMIT = 50;

const styleClosers: Record<AiStyle, string> = {
  "warm-simple": "Спасибо вам за то тепло, которое вы дарите людям рядом.",
  "short-no-pathos": "Пусть впереди будет больше спокойных и радостных дней.",
  humor: "И пусть хорошее настроение у вас всегда приходит чуть раньше дедлайнов и забот.",
  touching: "Очень хочется, чтобы вы чувствовали, как много доброго о вас думают.",
  respectful: "Пусть ваше внимание к людям возвращается к вам благодарностью и уважением."
};

const openingForOccasion = (occasion: AiGenerationInput["occasion"], recipientName: string) => {
  if (occasion === "teacher") {
    return `${recipientName}, спасибо вам за труд, терпение и искреннее участие в жизни детей.`;
  }

  if (occasion === "caregiver") {
    return `${recipientName}, спасибо вам за заботу, тепло и ту атмосферу, в которой детям спокойно и радостно.`;
  }

  return `${recipientName}, с вами хочется работать и отмечать важные моменты вместе.`;
};

const joinItems = (items: string[]) => {
  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} и ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")} и ${items.at(-1)}`;
};

const buildVariants = (input: AiGenerationInput) => {
  const qualities = joinItems(input.qualities.slice(0, 3));
  const wishes = joinItems(input.wishes.slice(0, 3));
  const detail = input.personalDetail ? ` Особенно хочется вспомнить: ${input.personalDetail}` : "";

  const short = `${input.recipientName}, спасибо за то, что вы ${qualities}. Желаю вам ${wishes} и много светлых моментов впереди.`;
  const heartfelt = `${openingForOccasion(input.occasion, input.recipientName)} Для меня вы ${qualities}.${detail} От души желаю вам ${wishes}. ${styleClosers[input.style]}`;
  const styled = `${input.recipientName}, хочу поздравить вас как ${input.relation}. Вы человек, рядом с которым особенно чувствуются ${qualities}.${detail} Пусть в вашей жизни будет больше ${wishes}. ${styleClosers[input.style]}`;

  return [
    { id: "short", label: "Короткий вариант", text: short },
    { id: "heartfelt", label: "Душевный вариант", text: heartfelt },
    { id: "styled", label: "В выбранном стиле", text: styled }
  ];
};

export const generateParticipantMessage = async (input: AiGenerationInput): Promise<AiGenerationResult> => {
  const usedCount = await countAiGenerationsByCardId(input.cardId);

  if (usedCount >= CARD_GENERATION_LIMIT) {
    throw new Error("CARD_AI_LIMIT_REACHED");
  }

  const variants = buildVariants(input);
  const remainingCardGenerations = CARD_GENERATION_LIMIT - usedCount - 1;

  const logEntry: AiGenerationLog = {
    id: randomUUID(),
    cardId: input.cardId,
    generationType: "participant_message",
    inputJson: JSON.stringify(input),
    outputText: JSON.stringify(variants),
    model: "local-template-v1",
    createdAt: new Date().toISOString()
  };

  await saveAiGenerationLog(logEntry);

  logger.info("ai.participant_generated", "Participant AI draft generated", {
    cardId: input.cardId,
    remainingCardGenerations
  });

  return {
    variants,
    remainingCardGenerations
  };
};
