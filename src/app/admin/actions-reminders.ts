"use server";
import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin/session";
import { cancelAdminReminder } from "@/lib/admin/reminders";

export async function cancelAdminReminderAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole("admin");
  const id = String(formData.get("reminderId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await cancelAdminReminder(id, session.email);
  revalidatePath("/admin", "layout");
}
