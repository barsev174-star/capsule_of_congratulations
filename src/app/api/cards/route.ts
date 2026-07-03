import { NextResponse } from "next/server";
import { createCardDraft } from "@/lib/cards/service";
import { validateCreateCardFormData } from "@/lib/cards/validation";
import { logger } from "@/lib/logger";
import { requestOrganizerAccess } from "@/lib/organizer/service";

export async function POST(request: Request) {
  const formData = await request.formData();
  const validation = validateCreateCardFormData(formData);

  if (!validation.success) {
    logger.warn("validation.card_create_failed", "Card creation validation failed", {
      issues: validation.issues
    });

    return NextResponse.json(
      {
        ok: false,
        issues: validation.issues
      },
      { status: 400 }
    );
  }

  try {
    const result = await createCardDraft(validation.data);
    try {
      await requestOrganizerAccess(result.card.organizerEmail);
    } catch (error) {
      logger.warn("organizer.welcome_email_failed", "Organizer access email was not sent after card creation", {
        cardId: result.card.id,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    logger.error("cards.create_failed", "Card draft creation failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });

    return NextResponse.json(
      {
        ok: false,
        message: "Не удалось создать открытку. Попробуйте еще раз."
      },
      { status: 500 }
    );
  }
}
