import { NextResponse } from "next/server";
import { readPublicSharePhotoDerivative, getPublicSharePhotoContentType } from "@/lib/public-shares/media-storage";
import { getPublicShareEditor } from "@/lib/public-shares/service";

export async function GET(_request: Request, { params }: { params: Promise<{ finalSlug: string; photoId: string }> }) {
  const { finalSlug, photoId } = await params;
  const editor = await getPublicShareEditor(finalSlug);
  const photo = editor?.photos.find((item) => item.id === photoId);
  if (!photo) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const file = await readPublicSharePhotoDerivative(photo.storagePath);
  if (!file) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  return new NextResponse(file, { headers: { "Content-Type": getPublicSharePhotoContentType(photo.fileName), "Content-Length": String(file.length), "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
