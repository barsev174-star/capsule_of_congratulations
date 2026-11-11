import type { TemplateAssetRef, TemplateProfile } from "./profile";

export type GiftIntroScene = {
  top: TemplateAssetRef;
  bottom: TemplateAssetRef;
  surface: string;
  text: string;
  accent: string;
  webTop?: TemplateAssetRef;
  mobileTop?: TemplateAssetRef;
};

export const getGiftIntroScene = (profile: TemplateProfile): GiftIntroScene | undefined => {
  const { scene } = profile.assets;
  if (!scene) return undefined;

  return {
    top: scene.exportTop?.story ?? scene.top,
    bottom: scene.bottom,
    webTop: scene.top,
    mobileTop: scene.mobileTop,
    surface: profile.intro.surface,
    text: profile.intro.text,
    accent: profile.intro.accent
  };
};
