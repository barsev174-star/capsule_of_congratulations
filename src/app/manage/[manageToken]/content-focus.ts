import { getManagePath } from "@/lib/routes/card-links";

export const contentSectionValues = ["congratulations", "photos"] as const;

export type ContentSection = (typeof contentSectionValues)[number];

export const editorTabValues = ["design", "congratulations", "photos", "gift"] as const;

export type EditorTab = (typeof editorTabValues)[number];

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

export const isContentSection = (value: string | undefined): value is ContentSection =>
  contentSectionValues.some((section) => section === value);

export const getContentSectionForFocus = (focus: ContentFocus | null): ContentSection =>
  focus === "congratulations-photos" || focus === "moments-photos"
    ? "photos"
    : "congratulations";

export const resolveContentSection = ({
  section,
  focus
}: {
  section?: string;
  focus: ContentFocus | null;
}): ContentSection =>
  isContentSection(section) ? section : getContentSectionForFocus(focus);

export const isEditorTab = (value: string | undefined): value is EditorTab =>
  editorTabValues.some((tab) => tab === value);

export const resolveEditorTab = ({
  tab,
  section,
  focus
}: {
  tab?: string;
  section?: string;
  focus: ContentFocus | null;
}): EditorTab => {
  if (isEditorTab(tab)) return tab;
  if (tab === "content") return resolveContentSection({ section, focus });
  return "design";
};

export const getContentSectionHref = (
  manageToken: string,
  section: ContentSection
) => `${getManagePath(manageToken)}?tab=${section}`;

export const getContentTabHref = (manageToken: string, focus: ContentFocus) => {
  const section = getContentSectionForFocus(focus);
  return `${getContentSectionHref(manageToken, section)}&focus=${focus}`;
};

export const openContentTab = ({
  manageToken,
  focus
}: {
  manageToken: string;
  focus: ContentFocus;
}) => getContentTabHref(manageToken, focus);
