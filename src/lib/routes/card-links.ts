const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const invitationUrlBase = "https://invitation.invalid";

export const INVITATION_PREVIEW_VERSION = "join-v2";

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
export const getOrganizerAccountVerifyPath = (token: string) => `/account/verify?token=${encodeURIComponent(token)}`;

export const versionInvitationUrl = (value: string) => {
  const url = new URL(value, invitationUrlBase);
  if (!/^\/join\/[^/]+\/?$/.test(url.pathname)) return value;

  url.searchParams.set("preview", INVITATION_PREVIEW_VERSION);
  if (url.origin !== invitationUrlBase) return url.toString();
  return `${url.pathname}${url.search}${url.hash}`;
};

export const getJoinUrl = (slug: string) => versionInvitationUrl(withSiteUrl(getJoinPath(slug)));
export const getGiftUrl = (slug: string) => withSiteUrl(getGiftPath(slug));
export const getManageUrl = (token: string) => withSiteUrl(getManagePath(token));
export const getPreviewUrl = (token: string) => withSiteUrl(getPreviewPath(token));
export const getOrganizerAccountVerifyUrl = (token: string) => withSiteUrl(getOrganizerAccountVerifyPath(token));
