export type AiStyle =
  | "warm-simple"
  | "short-no-pathos"
  | "humor"
  | "touching"
  | "respectful";

export type AiGenerationInput = {
  cardId: string;
  recipientName: string;
  occasionText: string;
  draftNotes: string;
  style: AiStyle;
  messageLimit: number;
};

export type AiVariant = {
  id: string;
  label: string;
  text: string;
};

export type AiGenerationResult = {
  variants: AiVariant[];
  remainingCardGenerations: number;
};

export type AiGenerationLog = {
  id: string;
  cardId: string;
  generationType: "participant_message";
  inputJson: string;
  outputText: string;
  model: string;
  createdAt: string;
};
