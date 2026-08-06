// Draft state of a gift-option import. Kept on the frontend only —
// an imported option is never persisted before explicit confirmation.

export type ImportedGiftFields = {
  title: string;
  description: string;
  productUrl: string;
  imageUrl: string;
  priceLabel: string;
};

export type GiftFieldSources = Partial<Record<keyof ImportedGiftFields, "auto" | "user">>;

export const emptyImportedGiftFields = (): ImportedGiftFields => ({ title: "", description: "", productUrl: "", imageUrl: "", priceLabel: "" });

export const isSafeHttpUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch { return false; }
};

// An import counts as usable when at least one meaningful field survived cleaning.
export const isUsableImportResult = (fields: ImportedGiftFields) =>
  Boolean(fields.title || fields.description || fields.imageUrl || fields.priceLabel || fields.productUrl);

const filledSources = (fields: ImportedGiftFields): GiftFieldSources =>
  Object.fromEntries((Object.entries(fields) as Array<[keyof ImportedGiftFields, string]>)
    .filter(([, value]) => value)
    .map(([key]) => [key, "auto" as const]));

// True when a new import would silently overwrite a value the user edited manually.
export const importWouldOverwriteUserEdits = (current: ImportedGiftFields, sources: GiftFieldSources, next: ImportedGiftFields) =>
  (Object.keys(sources) as Array<keyof ImportedGiftFields>).some((key) => sources[key] === "user" && Boolean(current[key]) && current[key] !== next[key]);

// Re-import merge: auto fields always follow the new result (including clearing
// values absent from it); user-edited fields are kept only with keepUserEdits.
export const mergeImportedDraft = (
  current: { fields: ImportedGiftFields; sources: GiftFieldSources } | null,
  next: ImportedGiftFields,
  keepUserEdits: boolean
) => {
  if (!current) return { fields: { ...next }, sources: filledSources(next) };
  const fields = { ...next };
  const sources = filledSources(next);
  if (keepUserEdits) {
    for (const key of Object.keys(current.sources) as Array<keyof ImportedGiftFields>) {
      if (current.sources[key] === "user" && current.fields[key]) {
        fields[key] = current.fields[key];
        sources[key] = "user";
      }
    }
  }
  return { fields, sources };
};
