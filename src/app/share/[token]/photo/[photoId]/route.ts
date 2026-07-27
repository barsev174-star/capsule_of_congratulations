import { NextResponse } from "next/server";
import { readPublicSharePhotoDerivative, getPublicSharePhotoContentType } from "@/lib/public-shares/media-storage";
import { getPublicSharePhotoForToken } from "@/lib/public-shares/service";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string; photoId: string }> }) {
  const { token, photoId } = await params;
  const photo = await getPublicSharePhotoForToken(token, photoId);
  if (!photo) return new NextResponse(null, { status: 404 });
  const file = await readPublicSharePhotoDerivative(photo.storagePath);
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(file, { headers: { "Content-Type": getPublicSharePhotoContentType(photo.fileName), "Content-Length": String(file.length), "Cache-Control": "private, no-store" } });
}
