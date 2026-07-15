export type GiftPollMode = "gift" | "budget";
export type GiftPollStatus = "draft" | "open" | "closed" | "deleted";

export type GiftPollOption = {
  id: string;
  pollId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceLabel: string | null;
  productUrl: string | null;
  sortOrder: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GiftPoll = {
  id: string;
  cardId: string;
  mode: GiftPollMode;
  title: string;
  question: string;
  status: GiftPollStatus;
  closesAt: string | null;
  closedAt: string | null;
  selectedOptionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GiftPollWithOptions = GiftPoll & {
  options: GiftPollOption[];
  totalVotes: number;
  votesByOptionId: Record<string, number>;
};

export type ParticipantGiftPoll = Pick<GiftPoll, "id" | "mode" | "title" | "question" | "closesAt"> & {
  options: Array<Pick<GiftPollOption, "id" | "title" | "description" | "imageUrl" | "priceLabel" | "productUrl">>;
  selectedOptionId: string | null;
};
