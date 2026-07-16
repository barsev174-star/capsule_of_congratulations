import { NextResponse } from "next/server";
import { getCardDraftByPublicSlug } from "@/lib/cards/repository";
import { getCardLifecycleByPublicSlug } from "@/lib/cards/lifecycle-repository";
import { getClosedGiftPollParticipantState, getGiftPollTeaser, getParticipantGiftPoll, upsertGiftVote } from "@/lib/gift-polls/repository";
import { hashParticipantToken, isParticipantToken } from "@/lib/participants/token";

const tokenFrom = (request: Request) => request.headers.get("x-participant-token") ?? "";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await getCardDraftByPublicSlug(slug);
  const token = tokenFrom(request);
  if (!card) return NextResponse.json({ poll: null, teaser: null });
  if (!isParticipantToken(token)) return NextResponse.json({ poll: null, teaser: await getGiftPollTeaser(card.id) });
  const participantTokenHash = hashParticipantToken(token);
  const poll = await getParticipantGiftPoll(card.id, participantTokenHash);
  if (poll) return NextResponse.json({ poll });
  return NextResponse.json({ poll: null, closed: await getClosedGiftPollParticipantState(card.id, participantTokenHash) });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await getCardDraftByPublicSlug(slug);
  const lifecycle = await getCardLifecycleByPublicSlug(slug);
  const body = await request.json().catch(() => null) as { optionId?: unknown; participantToken?: unknown } | null;
  if (!card || !body || typeof body.optionId !== "string" || !isParticipantToken(body.participantToken)) {
    return NextResponse.json({ ok: false, message: "Не удалось учесть голос." }, { status: 400 });
  }
  if (!lifecycle || lifecycle.collectionStatus !== "OPEN" || lifecycle.deliveryStatus !== "PREPARING") {
    return NextResponse.json({ ok: false, message: "Голосование уже закрыто организатором." }, { status: 409 });
  }
  const vote = await upsertGiftVote(card.id, body.optionId, hashParticipantToken(body.participantToken));
  if (!vote) return NextResponse.json({ ok: false, message: "Голосование уже закрыто или вариант недоступен." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
