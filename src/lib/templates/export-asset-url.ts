export const isExampleExportPhoto = (src: string): src is `/examples/${string}.webp` =>
  /^\/examples\/[a-z0-9][a-z0-9/_-]*\.webp$/u.test(src);

export const resolveTemplateExportAsset = (
  src: `/${string}`,
  origin?: string
) => {
  if (!src.startsWith("/templates/") && !isExampleExportPhoto(src)) {
    return origin ? new URL(src, origin).toString() : src;
  }

  const searchParams = new URLSearchParams({ src, v: "2" });
  const relativeUrl = `/api/template-export-asset?${searchParams.toString()}`;
  return origin ? new URL(relativeUrl, origin).toString() : relativeUrl;
};
