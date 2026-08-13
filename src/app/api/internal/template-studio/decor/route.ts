import { NextResponse } from "next/server";
import {
  saveTemplateStudioDecorAsset,
  TemplateStudioDecorAssetError
} from "@/lib/templates/studio-decor-assets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ message: "Маршрут доступен только в режиме разработки." }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  const templateId = form?.get("templateId");
  const file = form?.get("file");
  if (typeof templateId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ message: "Выберите декоративное изображение." }, { status: 400 });
  }

  try {
    const asset = await saveTemplateStudioDecorAsset({ projectRoot: process.cwd(), templateId, file });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    const message = error instanceof TemplateStudioDecorAssetError
      ? error.message
      : "Не удалось сохранить декоративный ассет.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
