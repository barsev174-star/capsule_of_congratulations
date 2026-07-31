import type { Contribution } from "@/lib/cards/types";

export type ContributionFilter = "all" | "active" | "hidden" | "too-long" | "no-role";

export const normalizeContributionSearch = (value: string) =>
  value.trim().toLocaleLowerCase("ru");

export const canReorderContributions = ({
  filter,
  searchQuery
}: {
  filter: ContributionFilter;
  searchQuery: string;
}) => filter === "all" && normalizeContributionSearch(searchQuery).length === 0;

export const filterContributions = ({
  contributions,
  filter,
  searchQuery,
  getRecommendedOverflow
}: {
  contributions: Contribution[];
  filter: ContributionFilter;
  searchQuery: string;
  getRecommendedOverflow: (contribution: Contribution) => number;
}) => {
  const normalizedSearchQuery = normalizeContributionSearch(searchQuery);

  return contributions.filter((contribution) => {
    if (normalizedSearchQuery) {
      const searchableText = [
        contribution.authorName,
        contribution.authorRole ?? "",
        contribution.message
      ]
        .join(" ")
        .toLocaleLowerCase("ru");

      if (!searchableText.includes(normalizedSearchQuery)) return false;
    }

    if (filter === "active") return contribution.status === "visible";
    if (filter === "hidden") return contribution.status === "hidden";
    if (filter === "too-long") return getRecommendedOverflow(contribution) > 0;
    if (filter === "no-role") return !contribution.authorRole?.trim();

    return true;
  });
};
