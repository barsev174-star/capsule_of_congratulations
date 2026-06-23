const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const siteUrl = () => {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return value ? trimTrailingSlash(value) : "";
};

const withSiteUrl = (path: string) => {
  const baseUrl = siteUrl();
  return baseUrl ? `${baseUrl}${path}` : path;
};

export const getJoinPath = (slug: string) => `/join/${slug}`;
export const getGiftPath = (slug: string) => `/gift/${slug}`;
export const getManagePath = (token: string) => `/manage/${token}`;
export const getPreviewPath = (token: string) => `/preview/${token}`;

export const getJoinUrl = (slug: string) => withSiteUrl(getJoinPath(slug));
export const getGiftUrl = (slug: string) => withSiteUrl(getGiftPath(slug));
export const getManageUrl = (token: string) => withSiteUrl(getManagePath(token));
export const getPreviewUrl = (token: string) => withSiteUrl(getPreviewPath(token));
