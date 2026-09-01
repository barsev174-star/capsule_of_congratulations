export const normalizeOrganizerEmail = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? "";
