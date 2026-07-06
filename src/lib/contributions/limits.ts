export const CARD_CONTRIBUTION_LIMIT = 100;

export class ContributionLimitReachedError extends Error {
  constructor() {
    super(`В этой открытке уже собрано ${CARD_CONTRIBUTION_LIMIT} поздравлений.`);
    this.name = "ContributionLimitReachedError";
  }
}
