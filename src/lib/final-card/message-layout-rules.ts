import type { FinalCardMessageLayoutMode } from "@/lib/final-card/types";

export type FinalCardMessageLayoutProfile = {
  cardsPerPage: number;
  advanceBy: number;
  maxChars: number;
  pageColumns: number;
  pageRows: number;
  pageVariant: "grid" | "column-media";
};

export const getFinalCardMessageLayoutProfile = (
  layoutMode: FinalCardMessageLayoutMode
): FinalCardMessageLayoutProfile => {
  if (layoutMode === "carousel-1") {
    return {
      cardsPerPage: 3,
      advanceBy: 1,
      maxChars: 340,
      pageColumns: 3,
      pageRows: 1,
      pageVariant: "grid"
    };
  }

  if (layoutMode === "carousel-2") {
    return {
      cardsPerPage: 6,
      advanceBy: 1,
      maxChars: 200,
      pageColumns: 3,
      pageRows: 2,
      pageVariant: "grid"
    };
  }

  if (layoutMode === "column-media") {
    return {
      cardsPerPage: 4,
      advanceBy: 1,
      maxChars: 280,
      pageColumns: 1,
      pageRows: 4,
      pageVariant: "column-media"
    };
  }

  return {
    cardsPerPage: 4,
    advanceBy: 1,
    maxChars: 280,
    pageColumns: 2,
    pageRows: 2,
    pageVariant: "grid"
  };
};

export const splitIntoMessagePages = <T>(items: T[], cardsPerPage: number) => {
  if (cardsPerPage <= 0) {
    return [items];
  }

  const pages: T[][] = [];

  for (let index = 0; index < items.length; index += cardsPerPage) {
    pages.push(items.slice(index, index + cardsPerPage));
  }

  return pages;
};
