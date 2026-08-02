import {
  BEST_QUOTE_MIN_CONTRIBUTION_COUNT,
  isValidBestQuoteText,
  QUALITY_MIN_CONTRIBUTION_COUNT
} from "@/lib/ai/card-insights";
import type { CardLifecycle } from "@/lib/cards/lifecycle";
import { isTemplateId } from "@/lib/cards/templates";
import type { CardDraft, CardMediaAsset, Contribution } from "@/lib/cards/types";
import { getActiveMessageSlots, getAssetsForSlots, MEMORY_MEDIA_SLOTS } from "@/lib/cards/media-slots";
import type { FinalCardBlockId, FinalCardOptionalBlockId } from "@/lib/final-card/types";
import { resolveMainGreetingContribution } from "@/lib/final-card/main-greeting";

export type CardBlockReadinessStatus =
  | "READY"
  | "ACTION_REQUIRED"
  | "WAITING_FOR_CONTENT"
  | "DISABLED";

export type CardDesignAction = {
  label: string;
  target: string;
  kind: "anchor" | "tab";
};

export type CardBlockReadinessView = {
  blockId: FinalCardBlockId;
  enabled: boolean;
  required: boolean;
  isLocked: boolean;
  status: CardBlockReadinessStatus;
  title: string;
  description: string;
  statusLabel: string;
  explanation: string;
  action?: CardDesignAction;
};

export type CardDesignReadinessInput = {
  card: Pick<
    CardDraft,
    | "recipientName"
    | "occasionText"
    | "fromLabel"
    | "templateId"
    | "deliveryStatus"
    | "finalBlockSettings"
    | "finalMessageSettings"
    | "finalMainGreetingSettings"
    | "finalMemorySettings"
  >;
  requiredBlockIds: FinalCardBlockId[];
  visibleContributions: Array<Pick<Contribution, "id">>;
  mediaAssets: Array<Pick<CardMediaAsset, "id" | "slot">>;
  qualities: string[];
  qualitiesAreStale: boolean;
  bestQuotes: string[];
  bestQuotesAreStale: boolean;
};

export type OrganizerJourneyStepStatus = "COMPLETED" | "CURRENT" | "UPCOMING";

export type OrganizerJourneyStep = {
  id: "basics" | "design" | "collection" | "materials" | "blocks" | "delivery";
  label: string;
  description: string;
  status: OrganizerJourneyStepStatus;
};

export type OrganizerJourney = {
  steps: OrganizerJourneyStep[];
  completedCount: number;
  currentStepId: OrganizerJourneyStep["id"];
  nextAction: CardDesignAction;
  remainingActions: CardDesignAction[];
  allBlocksReady: boolean;
};

const managedBlocks: FinalCardBlockId[] = [
  "hero",
  "summary",
  "qualities",
  "messages",
  "memories",
  "quotes",
  "closing"
];

const blockCopy: Record<FinalCardBlockId, { title: string; description: string }> = {
  hero: {
    title: "Обложка",
    description: "Первый экран с именем получателя и настроением открытки."
  },
  summary: {
    title: "Главное поздравление",
    description: "Выбранное поздравление станет большим личным блоком."
  },
  qualities: {
    title: "Качества",
    description: "Показывает, за что именно любят и ценят человека."
  },
  messages: {
    title: "Поздравления",
    description: "Главный блок с карточками поздравлений от участников."
  },
  memories: {
    title: "Моменты",
    description: "Секция для ярких фото, подписей и общей визуальной истории."
  },
  quotes: {
    title: "Лучшие фразы",
    description: "Сильные и тёплые строки из поздравлений участников."
  },
  "ai-summary": {
    title: "Общее поздравление",
    description: "Общее обращение от всей группы."
  },
  closing: {
    title: "Финал",
    description: "Завершение открытки и общее тёплое пожелание."
  }
};

const statusLabel: Record<CardBlockReadinessStatus, string> = {
  READY: "Готово",
  ACTION_REQUIRED: "Требует настройки",
  WAITING_FOR_CONTENT: "Требует настройки",
  DISABLED: "Отключён"
};

const optionalBlockEnabled = (
  settings: CardDesignReadinessInput["card"]["finalBlockSettings"],
  blockId: FinalCardBlockId
) => settings?.[blockId as FinalCardOptionalBlockId] ?? true;

const makeBlock = (
  input: CardDesignReadinessInput,
  blockId: FinalCardBlockId,
  status: CardBlockReadinessStatus,
  explanation: string,
  action?: CardDesignAction
): CardBlockReadinessView => {
  const required = input.requiredBlockIds.includes(blockId);
  const enabled = required || optionalBlockEnabled(input.card.finalBlockSettings, blockId);

  return {
    blockId,
    enabled,
    required,
    isLocked: required,
    status,
    title: blockCopy[blockId].title,
    description: blockCopy[blockId].description,
    statusLabel: statusLabel[status],
    explanation,
    action
  };
};

const disabledBlock = (input: CardDesignReadinessInput, blockId: FinalCardBlockId) =>
  makeBlock(input, blockId, "DISABLED", "Блок не будет показан в финальной открытке.");

const waitingBlock = (
  input: CardDesignReadinessInput,
  blockId: FinalCardBlockId,
  label: "Ждёт поздравлений" | "Нужны поздравления" | "Нужно назначить фото",
  explanation: string,
  action?: CardDesignAction
) => ({
  ...makeBlock(input, blockId, "WAITING_FOR_CONTENT", explanation, action),
  statusLabel: label
});

const withStatusLabel = (block: CardBlockReadinessView, label: string) => ({
  ...block,
  statusLabel: label
});

const isEnabled = (input: CardDesignReadinessInput, blockId: FinalCardBlockId) =>
  input.requiredBlockIds.includes(blockId) || optionalBlockEnabled(input.card.finalBlockSettings, blockId);

const messagePhotoRequirement = (input: CardDesignReadinessInput) => {
  const settings = input.card.finalMessageSettings;
  if ((settings?.layoutMode ?? "grid-2") !== "column-media") return null;

  const mediaLayout = settings?.mediaLayout ?? "portrait";
  const assignedPhotoCount = getAssetsForSlots(input.mediaAssets, getActiveMessageSlots(mediaLayout)).length;
  if (mediaLayout === "portrait") {
    return {
      required: 1,
      available: assignedPhotoCount,
      label: "вертикальное фото"
    };
  }

  const required = mediaLayout === "landscape-pair" ? 2 : 3;
  return {
    required,
    available: assignedPhotoCount,
    label: required === 2 ? "горизонтальных фото" : "горизонтальных фото"
  };
};

export const buildCardBlockReadiness = (
  input: CardDesignReadinessInput
): CardBlockReadinessView[] => {
  const contributionCount = input.visibleContributions.length;
  const requiredBasicsReady = Boolean(
    input.card.recipientName.trim() &&
      input.card.occasionText.trim() &&
      input.card.fromLabel.trim() &&
      isTemplateId(input.card.templateId)
  );
  const mainGreetingReady = Boolean(resolveMainGreetingContribution(input.card, input.visibleContributions));
  const horizontalPhotoCount = getAssetsForSlots(input.mediaAssets, MEMORY_MEDIA_SLOTS).length;
  const memoryPhotoCount = input.card.finalMemorySettings?.photoCount ?? 3;

  return managedBlocks.map((blockId) => {
    if (!isEnabled(input, blockId)) return disabledBlock(input, blockId);

    if (blockId === "hero") {
      return requiredBasicsReady
        ? makeBlock(input, blockId, "READY", "Обязательные сведения заполнены, шаблон выбран.")
        : makeBlock(
            input,
            blockId,
            "ACTION_REQUIRED",
            "Заполните получателя, повод, поле «От кого» и выберите шаблон.",
            { label: "Заполнить основу", target: "basics-section", kind: "anchor" }
          );
    }

    if (blockId === "summary") {
      if (contributionCount === 0) {
        return waitingBlock(
          input,
          blockId,
          "Ждёт поздравлений",
          "Главное поздравление можно выбрать после появления активных поздравлений.",
          { label: "Выбрать в поздравлениях", target: "content#greetings-section", kind: "tab" }
        );
      }
      return mainGreetingReady
        ? makeBlock(input, blockId, "READY", "Главное поздравление выбрано организатором.")
        : withStatusLabel(makeBlock(
            input,
            blockId,
            "ACTION_REQUIRED",
            "Выберите одно активное поздравление для большого личного блока.",
            { label: "Выбрать в поздравлениях", target: "content#greetings-section", kind: "tab" }
          ), "Нужно выбрать главное");
    }

    if (blockId === "qualities") {
      if (contributionCount < QUALITY_MIN_CONTRIBUTION_COUNT) {
        return waitingBlock(
          input,
          blockId,
          "Нужны поздравления",
          `Нужно хотя бы ${QUALITY_MIN_CONTRIBUTION_COUNT} активных поздравлений. Сейчас ${contributionCount}.`,
          { label: "Перейти к поздравлениям", target: "content", kind: "tab" }
        );
      }
      return input.qualities.length === 5 && !input.qualitiesAreStale
        ? makeBlock(input, blockId, "READY", "Определены пять качеств по активным поздравлениям.")
        : withStatusLabel(makeBlock(
            input,
            blockId,
            "ACTION_REQUIRED",
            input.qualitiesAreStale
              ? "Поздравления изменились — качества нужно обновить."
              : "Материала достаточно, можно определить пять качеств.",
            { label: input.qualities.length ? "Обновить качества" : "Определить 5 качеств", target: "block-qualities", kind: "anchor" }
          ), "Нужно определить");
    }

    if (blockId === "messages") {
      if (contributionCount === 0) {
        return waitingBlock(
          input,
          blockId,
          "Ждёт поздравлений",
          "Блок готов к настройке, но активных поздравлений пока нет.",
          { label: "Перейти к поздравлениям", target: "content", kind: "tab" }
        );
      }
      const photoRequirement = messagePhotoRequirement(input);
      if (photoRequirement && photoRequirement.available < photoRequirement.required) {
        return waitingBlock(
          input,
          blockId,
          "Нужно назначить фото",
          `Для выбранной схемы нужно ${photoRequirement.required} ${photoRequirement.label}; доступно ${photoRequirement.available}.`,
          { label: "Перейти к фото", target: "photos", kind: "tab" }
        );
      }
      return makeBlock(input, blockId, "READY", "Схема выбрана, её требования к материалам выполнены.");
    }

    if (blockId === "memories") {
      if (horizontalPhotoCount < memoryPhotoCount) {
        return waitingBlock(
          input,
          blockId,
          "Нужно назначить фото",
          `Для блока нужно ${memoryPhotoCount} горизонтальных фото; доступно ${horizontalPhotoCount}.`,
          { label: "Перейти к фото", target: "photos", kind: "tab" }
        );
      }
      const hasUsableDeliveredMemoryCopy = input.card.deliveryStatus === "DELIVERED";
      if (
        !hasUsableDeliveredMemoryCopy &&
        (!input.card.finalMemorySettings?.title?.trim() ||
          !input.card.finalMemorySettings?.description?.trim())
      ) {
        return withStatusLabel(makeBlock(
          input,
          blockId,
          "ACTION_REQUIRED",
          "Добавьте заголовок и короткое описание фотоблока.",
            { label: "Настроить моменты", target: "block-memories", kind: "anchor" }
        ), "Нужно добавить текст");
      }
      return makeBlock(input, blockId, "READY", "Фото и подпись блока подготовлены.");
    }

    if (blockId === "quotes") {
      if (contributionCount < BEST_QUOTE_MIN_CONTRIBUTION_COUNT) {
        return waitingBlock(
          input,
          blockId,
          "Нужны поздравления",
          `Нужно минимум ${BEST_QUOTE_MIN_CONTRIBUTION_COUNT} активных поздравлений. Сейчас ${contributionCount}.`,
          { label: "Перейти к поздравлениям", target: "content", kind: "tab" }
        );
      }
      const selectedQuotesReady =
        input.bestQuotes.length === 3 &&
        input.bestQuotes.every(isValidBestQuoteText) &&
        !input.bestQuotesAreStale;
      return selectedQuotesReady
        ? makeBlock(input, blockId, "READY", "Выбраны три фразы для финальной открытки.")
        : withStatusLabel(makeBlock(
            input,
            blockId,
            "ACTION_REQUIRED",
            input.bestQuotesAreStale
              ? "Поздравления изменились — варианты фраз нужно обновить."
              : input.bestQuotes.length > 3
                ? "Выберите и сохраните ровно три фразы."
                : "Материала достаточно, можно подобрать лучшие фразы.",
            { label: input.bestQuotes.length > 3 ? "Выбрать лучшие фразы" : "Подобрать фразы", target: "block-quotes", kind: "anchor" }
          ), "Нужно подобрать");
    }

    return makeBlock(input, blockId, "READY", "Финальный текст формируется из основы открытки.");
  });
};

const uniqueActions = (actions: CardDesignAction[]) =>
  actions.filter(
    (action, index, list) =>
      list.findIndex((candidate) => candidate.label === action.label && candidate.target === action.target) === index
  );

export const buildOrganizerJourney = (input: {
  card: CardDesignReadinessInput["card"];
  lifecycle: Pick<CardLifecycle, "collectionStatus" | "deliveryStatus" | "paymentStatus" | "hasAdminAccess">;
  blockReadiness: CardBlockReadinessView[];
  visibleContributionCount: number;
}): OrganizerJourney => {
  const basicsComplete = Boolean(
    input.card.recipientName.trim() && input.card.occasionText.trim() && input.card.fromLabel.trim()
  );
  const designComplete = isTemplateId(input.card.templateId);
  const collectionStarted = input.lifecycle.collectionStatus !== "DRAFT";
  const materialsCollected = input.visibleContributionCount > 0;
  const relevantBlocks = input.blockReadiness.filter((block) => block.required || block.enabled);
  const allBlocksReady = relevantBlocks.every((block) => block.status === "READY");
  const deliveryComplete = input.lifecycle.deliveryStatus === "DELIVERED";
  const completion = [
    basicsComplete,
    designComplete,
    collectionStarted,
    materialsCollected,
    allBlocksReady,
    deliveryComplete
  ];
  const firstIncompleteIndex = completion.findIndex((value) => !value);
  const currentIndex = firstIncompleteIndex === -1 ? completion.length - 1 : firstIncompleteIndex;
  const definitions: Array<Omit<OrganizerJourneyStep, "status">> = [
    { id: "basics", label: "Заполнить основу", description: "Получатель, повод и автор открытки" },
    { id: "design", label: "Выбрать оформление", description: "Шаблон открытки" },
    { id: "collection", label: "Открыть сбор", description: "Ссылка для участников" },
    { id: "materials", label: "Собрать поздравления и фото", description: "Поздравления и фотографии участников" },
    { id: "blocks", label: "Настроить открытку", description: "Состав финальной открытки" },
    { id: "delivery", label: "Оплатить и передать", description: "Финальная проверка и передача" }
  ];
  const steps = definitions.map((definition, index): OrganizerJourneyStep => ({
    ...definition,
    status: completion[index] ? "COMPLETED" : index === currentIndex ? "CURRENT" : "UPCOMING"
  }));
  const incompleteBlockActions = input.blockReadiness
    .filter((block) => block.enabled && block.status !== "READY" && block.action)
    .map((block) => block.action!);
  const lifecyclePaid = input.lifecycle.paymentStatus === "PAID" || input.lifecycle.hasAdminAccess === true;
  let nextAction: CardDesignAction;

  if (deliveryComplete) {
    nextAction = { label: "Посмотреть открытку", target: "preview", kind: "anchor" };
  } else if (!basicsComplete) {
    nextAction = { label: "Заполнить основу", target: "basics-section", kind: "anchor" };
  } else if (!designComplete) {
    nextAction = { label: "Выбрать шаблон", target: "template-section", kind: "anchor" };
  } else if (input.lifecycle.collectionStatus === "DRAFT") {
    nextAction = { label: "Открыть сбор поздравлений", target: "lifecycle-section", kind: "anchor" };
  } else if (input.lifecycle.collectionStatus === "OPEN" && input.visibleContributionCount === 0) {
    nextAction = { label: "Пригласить участников", target: "lifecycle-section", kind: "anchor" };
  } else if (incompleteBlockActions.length > 0) {
    nextAction = { label: "Продолжить настройку", target: incompleteBlockActions[0].target, kind: incompleteBlockActions[0].kind };
  } else if (input.lifecycle.collectionStatus === "CLOSED" && lifecyclePaid) {
    nextAction = { label: "Передать получателю", target: "lifecycle-section", kind: "anchor" };
  } else if (input.lifecycle.collectionStatus === "CLOSED") {
    nextAction = { label: "Перейти к оплате", target: "lifecycle-section", kind: "anchor" };
  } else {
    nextAction = { label: "Проверить открытку", target: "preview", kind: "anchor" };
  }

  return {
    steps,
    completedCount: completion.filter(Boolean).length,
    currentStepId: steps[currentIndex].id,
    nextAction,
    remainingActions: uniqueActions(incompleteBlockActions),
    allBlocksReady
  };
};
