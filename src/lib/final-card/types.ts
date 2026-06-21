export type FinalCardBlockId =
  | "hero"
  | "summary"
  | "qualities"
  | "messages"
  | "memories"
  | "quotes"
  | "ai-summary"
  | "closing";

export type FinalCardOptionalBlockId = Exclude<FinalCardBlockId, "hero" | "messages" | "closing">;

export type FinalCardStyleId =
  | "warm-classic"
  | "team-modern"
  | "bright-celebration"
  | "gentle-personal"
  | "paper-birthday";

export type FinalCardBlockDefinition = {
  id: FinalCardBlockId;
  required: boolean;
};

export type FinalCardLayout = {
  style: FinalCardStyleId;
  blocks: FinalCardBlockDefinition[];
};

export type FinalCardContentAvailability = {
  hasSummary: boolean;
  hasQualities: boolean;
  hasMemories: boolean;
  hasQuotes: boolean;
  hasAiSummary: boolean;
};

export type FinalCardBlockSettings = Partial<Record<FinalCardOptionalBlockId, boolean>>;
export type FinalCardBlockOrder = FinalCardBlockId[];

export type FinalCardMessageLayoutMode = "grid-2" | "carousel-1" | "carousel-2" | "column-media";

export type FinalCardMessageMediaLayout = "portrait" | "landscape-pair" | "landscape-trio";

export type FinalCardMediaSlot =
  | "portrait"
  | "landscape-a"
  | "landscape-b"
  | "landscape-c"
  | "memory-a"
  | "memory-b"
  | "memory-c";

export type FinalCardMessageSettings = {
  layoutMode: FinalCardMessageLayoutMode;
  mediaLayout: FinalCardMessageMediaLayout;
  mediaSlots: FinalCardMediaSlot[];
  mediaAssetIds: string[];
  showAllLink: boolean;
};

export type FinalCardMainGreetingSettings = {
  contributionId: string | null;
};

export type FinalCardMemorySettings = {
  title: string;
  description: string;
  mediaSlots: FinalCardMediaSlot[];
  mediaAssetIds: string[];
  photoCount: 2 | 3;
};
