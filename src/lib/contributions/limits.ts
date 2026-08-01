export const CARD_CONTRIBUTION_LIMIT = 100;
export const CONTRIBUTION_MESSAGE_MAX_LENGTH = 1500;
export const CONTRIBUTION_MESSAGE_RECOMMENDED_LENGTH = 280;
export const CONTRIBUTION_AI_DRAFT_MAX_LENGTH = 700;

export class ContributionLimitReachedError extends Error {
  constructor() {
    super(`В этой открытке уже собрано ${CARD_CONTRIBUTION_LIMIT} поздравлений.`);
    this.name = "ContributionLimitReachedError";
  }
}
