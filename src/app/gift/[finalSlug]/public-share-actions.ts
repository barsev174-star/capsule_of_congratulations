"use server";

import { revalidatePath } from "next/cache";
import { getPublicSharePath, publishPublicShareForFinalSlug, revokePublicShareForFinalSlug, savePublicShare } from "@/lib/public-shares/service";
import type { PublicShareEditorInput, PublicShareHeadlinePreset } from "@/lib/public-shares/types";

export type PublicShareFormState = { ok: boolean; message: string; shareUrl?: string };
const presets: PublicShareHeadlinePreset[] = ["GIFTED_CARD", "THANK_YOU", "LOOK_WHAT_I_GOT"];

export async function savePublicShareAction(finalSlug: string, _previous: PublicShareFormState, formData: FormData): Promise<PublicShareFormState> {
  try {
    const photoAssetIds = formData.getAll("photoAssetId").map(String);
    const preset = String(formData.get("headlinePreset") ?? "GIFTED_CARD");
    const input: PublicShareEditorInput = {
      displayName: String(formData.get("displayName") ?? ""), headlinePreset: presets.includes(preset as PublicShareHeadlinePreset) ? preset as PublicShareHeadlinePreset : "GIFTED_CARD",
      showOccasion: formData.get("showOccasion") === "on", showGreetingCount: formData.get("showGreetingCount") === "on", showPhotoCount: formData.get("showPhotoCount") === "on",
      publicSummary: null, publicQualities: [],
      publicPhrases: formData.getAll("phraseText").map(String).map((text, index) => ({ id: `phrase-${index}`, text })), photoAssetIds,
      photoCaptions: Object.fromEntries(photoAssetIds.map((id) => [id, String(formData.get(`caption:${id}`) ?? "")])), photoConsentAccepted: formData.get("photoConsentAccepted") === "on"
    };
    const result = await savePublicShare(finalSlug, input);
    const shareUrl = result.token ? getPublicSharePath(result.token) : undefined;
    revalidatePath(`/gift/${finalSlug}`); revalidatePath("/share/[token]", "page");
    return { ok: true, message: result.share.status === "ACTIVE" ? "Изменения публичной версии сохранены." : "Черновик публичной версии сохранён.", shareUrl };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Не удалось сохранить публичную версию." }; }
}

export async function publishPublicShareAction(finalSlug: string): Promise<PublicShareFormState> {
  try { const result = await publishPublicShareForFinalSlug(finalSlug); const shareUrl = getPublicSharePath(result.token); revalidatePath(`/gift/${finalSlug}`); revalidatePath("/share/[token]", "page"); return { ok: true, message: "Публичная версия опубликована.", shareUrl }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Не удалось опубликовать публичную версию." }; }
}

export async function revokePublicShareAction(finalSlug: string): Promise<PublicShareFormState> {
  try { const result = await revokePublicShareForFinalSlug(finalSlug); if (!result) return { ok: false, message: "Активная публичная версия не найдена." }; revalidatePath(`/gift/${finalSlug}`); revalidatePath("/share/[token]", "page"); return { ok: true, message: "Публичная версия отключена." }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Не удалось отключить публичную версию." }; }
}
