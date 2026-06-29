import { existsSync } from "node:fs";
import { resolve } from "node:path";

const LANDING_ASSETS_DIR = "public/assets/landing";

export type LandingAssetConfig = {
  heroMain: string;
  heroDecor: string;
  ctaEnvelope: string;
  templates: Record<string, string>;
};

export const landingAssetPaths: LandingAssetConfig = {
  heroMain: "/assets/landing/hero-asset.png",
  heroDecor: "/assets/landing/hero-decor.png",
  ctaEnvelope: "/assets/landing/cta-envelope.png",
  templates: {
    "paper-classic": "/assets/landing/template-paper-classic.png",
    "warm-classic": "/assets/landing/template-warm-classic.png",
    "team-modern": "/assets/landing/template-team-modern.png",
    "bright-party": "/assets/landing/template-bright-party.png",
    "soft-personal": "/assets/landing/template-soft-personal.png"
  }
};

function assetExists(publicPath: string): boolean {
  const filePath = resolve("public", publicPath.replace(/^\//, ""));
  return existsSync(filePath);
}

export function getLandingAsset(publicPath: string): string | null {
  return assetExists(publicPath) ? publicPath : null;
}

export function getTemplateAsset(templateId: string): string | null {
  const path = landingAssetPaths.templates[templateId];
  return path ? getLandingAsset(path) : null;
}
