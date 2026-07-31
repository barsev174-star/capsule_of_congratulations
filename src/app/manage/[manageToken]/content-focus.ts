import { getManagePath } from "@/lib/routes/card-links";

export const contentFocusValues = [
  "main-congratulation",
  "congratulations-photos",
  "moments-photos"
] as const;

export type ContentFocus = (typeof contentFocusValues)[number];

export const contentFocusSectionIds: Record<ContentFocus, string> = {
  "main-congratulation": "main-congratulation",
  "congratulations-photos": "congratulations-photos",
  "moments-photos": "moments-photos"
};

export const isContentFocus = (value: string | undefined): value is ContentFocus =>
  contentFocusValues.some((focus) => focus === value);

export const getContentTabHref = (manageToken: string, focus: ContentFocus) =>
  `${getManagePath(manageToken)}?tab=content&focus=${focus}`;

export const openContentTab = ({
  manageToken,
  focus
}: {
  manageToken: string;
  focus: ContentFocus;
}) => getContentTabHref(manageToken, focus);
