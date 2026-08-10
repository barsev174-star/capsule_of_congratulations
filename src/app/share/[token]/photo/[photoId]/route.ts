import { NextResponse } from "next/server";
import { preparePublicSharePhotoResponse, readPublicSharePhotoDerivative } from "@/lib/public-shares/media-storage";
import { getPublicSharePhotoForToken } from "@/lib/public-shares/service";

export async function GET(request: Request, { params }: { params: Promise<{ token: string; photoId: string }> }) {
  const { token, photoId } = await params;
  const photo = await getPublicSharePhotoForToken(token, photoId);
  if (!photo) return new NextResponse(null, { status: 404 });
  const file = await readPublicSharePhotoDerivative(photo.storagePath);
  if (!file) return new NextResponse(null, { status: 404 });
  const responsePhoto = await preparePublicSharePhotoResponse({
    file,
    fileName: photo.fileName,
    exportCompatible: new URL(request.url).searchParams.get("export") === "1"
  });
  return new NextResponse(new Uint8Array(responsePhoto.file), { headers: { "Content-Type": responsePhoto.contentType, "Content-Length": String(responsePhoto.file.length), "Cache-Control": "private, no-store" } });
}
