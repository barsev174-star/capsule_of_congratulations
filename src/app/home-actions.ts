"use server";

import { redirect } from "next/navigation";
import { createEmptyCardDraft } from "@/lib/cards/service";
import { getManagePath } from "@/lib/routes/card-links";
import { reportCriticalError, trackFunnel } from "@/lib/telemetry";

export async function startCardFromShowcaseAction() {
  await trackFunnel("funnel.card_creation_started", { source: "landing" });
  let result;
  try {
    result = await createEmptyCardDraft();
  } catch (error) {
    await reportCriticalError("database", error, { operation: "create_card", source: "landing" });
    throw error;
  }
  redirect(getManagePath(result.card.manageToken));
}
