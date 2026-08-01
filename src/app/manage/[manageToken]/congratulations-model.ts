import type { Contribution } from "@/lib/cards/types";
import { CONTRIBUTION_MESSAGE_RECOMMENDED_LENGTH } from "@/lib/contributions/limits";

export type GreetingFilter = "all" | "active" | "hidden" | "too-long";
export type GreetingSort = "card" | "new" | "old";

export const selectCongratulations = ({
  contributions,
  searchQuery,
  filter,
  sort,
}: {
  contributions: Contribution[];
  searchQuery: string;
  filter: GreetingFilter;
  sort: GreetingSort;
}) => {
  const query = searchQuery.trim().toLocaleLowerCase("ru");
  const filtered = contributions.filter((item) => {
    const matchesSearch = !query || `${item.authorName} ${item.authorRole ?? ""} ${item.message}`.toLocaleLowerCase("ru").includes(query);
    if (!matchesSearch) return false;
    if (filter === "active") return item.status === "visible";
    if (filter === "hidden") return item.status === "hidden";
    if (filter === "too-long") return item.message.length > CONTRIBUTION_MESSAGE_RECOMMENDED_LENGTH;
    return true;
  });
  if (sort === "new") return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === "old") return [...filtered].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return filtered;
};

export const moveContributionIdToIndex = (order: string[], id: string, rawIndex: number) => {
  const without = order.filter((item) => item !== id);
  const index = Math.max(0, Math.min(rawIndex, without.length));
  const next = [...without];
  next.splice(index, 0, id);
  return next;
};

export const moveContributionIdAfter = (order: string[], id: string, targetId: string) => {
  const without = order.filter((item) => item !== id);
  const targetIndex = without.indexOf(targetId);
  if (targetIndex < 0) return order;
  const next = [...without];
  next.splice(targetIndex + 1, 0, id);
  return next;
};

export const moveContributionIdRelative = (
  order: string[],
  id: string,
  targetId: string,
  position: "before" | "after"
) => {
  if (id === targetId) return order;
  const without = order.filter((item) => item !== id);
  const targetIndex = without.indexOf(targetId);
  if (targetIndex < 0) return order;
  const next = [...without];
  next.splice(position === "before" ? targetIndex : targetIndex + 1, 0, id);
  return next.join(":") === order.join(":") ? order : next;
};
