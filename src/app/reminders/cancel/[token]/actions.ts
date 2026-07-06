"use server";

import { redirect } from "next/navigation";
import { cancelEventReminder } from "@/lib/reminders/repository";

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export async function cancelReminderAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const result = tokenPattern.test(token) ? await cancelEventReminder(token) : "not_found";
  redirect(`/reminders/cancel/${encodeURIComponent(token)}?result=${result}`);
}
