import { NextResponse } from "next/server";
import { generateParticipantMessage } from "@/lib/ai/service";
import { validateAiGenerationFormData } from "@/lib/ai/validation";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const formData = await request.formData();
  const validation = validateAiGenerationFormData(formData);

  if (!validation.success) {
    logger.warn("validation.ai_generation_failed", "AI generation validation failed", {
      issues: validation.issues
    });

    return NextResponse.json({ ok: false, issues: validation.issues }, { status: 400 });
  }

  try {
    const result = await generateParticipantMessage(validation.data);
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "CARD_AI_LIMIT_REACHED") {
      return NextResponse.json(
        {
          ok: false,
          message: "Для этой открытки временно закончился лимит AI-генераций."
        },
        { status: 429 }
      );
    }

    logger.error("ai.participant_failed", "AI participant generation failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });

    return NextResponse.json(
      {
        ok: false,
        message: "Не удалось подготовить варианты текста. Попробуйте еще раз."
      },
      { status: 500 }
    );
  }
}
