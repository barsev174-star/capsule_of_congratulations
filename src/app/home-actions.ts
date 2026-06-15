"use server";

import { redirect } from "next/navigation";
import { createEmptyCardDraft } from "@/lib/cards/service";

export async function startCardFromShowcaseAction() {
  const result = await createEmptyCardDraft();
  redirect(result.manageLink);
}
