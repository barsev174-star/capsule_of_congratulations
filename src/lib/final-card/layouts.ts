import type { FinalCardBlockId, FinalCardLayout, FinalCardStyleId } from "@/lib/final-card/types";

const required = (id: FinalCardBlockId) => ({ id, required: true });
const optional = (id: FinalCardBlockId) => ({ id, required: false });

export const finalCardLayouts: Record<FinalCardStyleId, FinalCardLayout> = {
  "warm-classic": {
    style: "warm-classic",
    blocks: [
      required("hero"),
      optional("summary"),
      optional("qualities"),
      required("messages"),
      optional("memories"),
      optional("quotes"),
      optional("ai-summary"),
      required("closing")
    ]
  },
  "team-modern": {
    style: "team-modern",
    blocks: [
      required("hero"),
      optional("summary"),
      optional("qualities"),
      required("messages"),
      optional("memories"),
      optional("quotes"),
      optional("ai-summary"),
      required("closing")
    ]
  },
  "bright-celebration": {
    style: "bright-celebration",
    blocks: [
      required("hero"),
      optional("summary"),
      required("messages"),
      optional("memories"),
      optional("ai-summary"),
      optional("quotes"),
      required("closing")
    ]
  },
  "gentle-personal": {
    style: "gentle-personal",
    blocks: [
      required("hero"),
      optional("summary"),
      required("messages"),
      optional("memories"),
      optional("quotes"),
      optional("ai-summary"),
      required("closing")
    ]
  },
  "paper-birthday": {
    style: "paper-birthday",
    blocks: [
      required("hero"),
      required("summary"),
      optional("qualities"),
      required("messages"),
      optional("memories"),
      optional("quotes"),
      optional("ai-summary"),
      required("closing")
    ]
  },
  "route-adventure": {
    style: "route-adventure",
    blocks: [
      required("hero"),
      required("summary"),
      optional("qualities"),
      required("messages"),
      optional("memories"),
      optional("quotes"),
      optional("ai-summary"),
      required("closing")
    ]
  }
};
