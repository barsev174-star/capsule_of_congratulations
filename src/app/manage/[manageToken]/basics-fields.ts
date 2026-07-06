export const normalizeBasicsFields = <T extends Record<string, string>>(fields: T): T =>
  Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()])) as T;

export const serializeBasicsFields = <T extends Record<string, string>>(fields: T) =>
  JSON.stringify(normalizeBasicsFields(fields));
