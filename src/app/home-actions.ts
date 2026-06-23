"use server";

import { redirect } from "next/navigation";
import { createEmptyCardDraft } from "@/lib/cards/service";
import { getManagePath } from "@/lib/routes/card-links";

export async function startCardFromShowcaseAction() {
  const result = await createEmptyCardDraft();
  redirect(getManagePath(result.card.manageToken));
}
