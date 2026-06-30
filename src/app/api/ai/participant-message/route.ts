import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Этот адрес AI-помощника устарел. Обновите страницу и попробуйте ещё раз."
    },
    { status: 410 }
  );
}
