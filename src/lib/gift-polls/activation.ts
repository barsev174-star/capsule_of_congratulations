import { createGiftPoll, getGiftPollForManage } from "./repository";
import { defaultGiftPollCopy } from "./validation";

type ActivationDependencies = {
  getPoll: typeof getGiftPollForManage;
  createPoll: typeof createGiftPoll;
};

const defaultDependencies: ActivationDependencies = {
  getPoll: getGiftPollForManage,
  createPoll: createGiftPoll
};

export const ensureGiftPollEnabled = async (
  cardId: string,
  dependencies: ActivationDependencies = defaultDependencies
) => {
  const existingPoll = await dependencies.getPoll(cardId);
  if (existingPoll) return { created: false };

  const copy = defaultGiftPollCopy("gift");
  await dependencies.createPoll({
    cardId,
    mode: "gift",
    title: copy.title,
    question: copy.question,
    closesAt: null
  });
  return { created: true };
};
