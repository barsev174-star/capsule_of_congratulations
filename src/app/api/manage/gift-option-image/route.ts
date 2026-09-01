import { NextResponse } from "next/server";
import { getCardDraftByManageToken } from "@/lib/cards/repository";
import { saveGiftOptionUpload } from "@/lib/gift-polls/image-storage";
import { requireCardManagementAccess } from "@/lib/manage/access";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null); const manageToken = form?.get("manageToken"); const file = form?.get("file");
  if (typeof manageToken !== "string" || !(file instanceof File)) return NextResponse.json({ message: "Не удалось загрузить фото." }, { status: 400 });
  const card = await getCardDraftByManageToken(manageToken);
  if (!card) return NextResponse.json({ message: "Открытка не найдена." }, { status: 404 });
  try { await requireCardManagementAccess(card.id); }
  catch { return NextResponse.json({ message: "Требуется вход владельца открытки." }, { status: 403 }); }
  try { return NextResponse.json({ imageUrl: await saveGiftOptionUpload(card.id, file) }); }
  catch { return NextResponse.json({ message: "Подойдут JPG, PNG или WebP до 4 МБ." }, { status: 400 }); }
}
