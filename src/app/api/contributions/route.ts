import { NextResponse } from "next/server";
import { getCardDraftByPublicSlug } from "@/lib/cards/repository";
import { createContribution } from "@/lib/cards/service";
import { validateContributionFormData } from "@/lib/contributions/validation";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const formData = await request.formData();
  const publicSlug = typeof request.headers.get("x-card-slug") === "string" ? request.headers.get("x-card-slug") : null;
  const validation = validateContributionFormData(formData);

  if (!validation.success) {
    logger.warn("validation.contribution_failed", "Contribution validation failed", {
      issues: validation.issues
    });

    return NextResponse.json({ ok: false, issues: validation.issues }, { status: 400 });
  }

  if (publicSlug) {
    const card = await getCardDraftByPublicSlug(publicSlug);

    if (!card || card.id !== validation.data.cardId) {
      return NextResponse.json(
        { ok: false, message: "Открытка не найдена или ссылка больше не актуальна." },
        { status: 404 }
      );
    }
  }

  try {
    const contribution = await createContribution(validation.data);
    return NextResponse.json({ ok: true, contribution }, { status: 201 });
  } catch (error) {
    logger.error("contributions.create_failed", "Contribution creation failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });

    return NextResponse.json(
      { ok: false, message: "Не удалось сохранить поздравление. Попробуйте еще раз." },
      { status: 500 }
    );
  }
}
