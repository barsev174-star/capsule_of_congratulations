export const resolveTemplateExportAsset = (
  src: `/${string}`,
  origin?: string
) => {
  if (!src.startsWith("/templates/")) {
    return origin ? new URL(src, origin).toString() : src;
  }

  const searchParams = new URLSearchParams({ src, v: "2" });
  const relativeUrl = `/api/template-export-asset?${searchParams.toString()}`;
  return origin ? new URL(relativeUrl, origin).toString() : relativeUrl;
};
