"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AI_DRAFT_LIMIT } from "@/lib/ai/validation";
import type { AiVariant } from "@/lib/ai/types";
import { AiHelper } from "./ai-helper";
import { GiftPollVote } from "./gift-poll-vote";
import { JoinSidePanel } from "./join-side-panel";
import { GREETING_HINTS, type GreetingHint, type GreetingHintId } from "./greeting-hints";
import { LegalDocumentModal } from "@/components/legal/legal-document-modal";
import styles from "./participant-page.module.css";

type ValidationIssue = {
  field: string;
  message: string;
};

type Props = {
  cardId: string;
  publicSlug: string;
  recipientName: string;
  occasionText: string;
  messageLimit: number;
  variant?: "default" | "join";
  greetingMode?: "classic" | "matrix" | "ladder";
};

const DEFAULT_MESSAGE_PLACEHOLDER =
  "Напишите несколько теплых слов: что цените, за что благодарны, какой момент хочется вспомнить...";

export const ParticipantForm = ({
  cardId,
  publicSlug,
  recipientName,
  occasionText,
  messageLimit,
  variant = "default",
  greetingMode = "classic"
}: Props) => {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [message, setMessage] = useState("");
  const [aiGenerationIds, setAiGenerationIds] = useState<string[]>([]);
  const [aiResetSignal, setAiResetSignal] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [participantConsent, setParticipantConsent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isJoin = variant === "join";
  const [aiVariants, setAiVariants] = useState<AiVariant[]>([]);
  const [aiGenerationId, setAiGenerationId] = useState("");
  const [aiIssues, setAiIssues] = useState<string[]>([]);
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  const [aiLimitReached, setAiLimitReached] = useState(false);
  const [aiUndoDraft, setAiUndoDraft] = useState<string | null>(null);
  const [isAiPending, startAiTransition] = useTransition();
  const pendingAiRequestId = useRef<string | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [activeHintId, setActiveHintId] = useState<GreetingHintId | null>(null);
  const [hintIndexes, setHintIndexes] = useState<Record<GreetingHintId, number>>({
    gratitude: 0,
    qualities: 0,
    memory: 0,
    wishes: 0
  });
  const [hintBlockVisible, setHintBlockVisible] = useState(false);
  const [hasActivePoll, setHasActivePoll] = useState(false);
  const router = useRouter();
  const isOverLimit = message.length > messageLimit;
  const activeHint = GREETING_HINTS.find((hint) => hint.id === activeHintId) ?? null;
  const activeHintExample = activeHint ? activeHint.examples[hintIndexes[activeHint.id]] : null;
  const aiPanelState =
    aiVariants.length > 0 ? "variants" : aiIssues.length > 0 ? "error" : isAiPending ? "loading" : "idle";
  const clearSuccessOnEdit = () => {
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHasSubmitted(Boolean(window.localStorage.getItem(`participant-submission-${publicSlug}`)));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [publicSlug]);

  useEffect(() => {
    if (!isJoin) {
      return;
    }
    let cancelled = false;
    void fetch(`/api/join/${publicSlug}/gift-poll`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { teaser?: unknown } | null) => {
        if (!cancelled) {
          setHasActivePoll(Boolean(payload?.teaser));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isJoin, publicSlug]);

  const handleSubmit = async (formData: FormData) => {
    setIssues([]);
    setSuccessMessage("");

    const storageKey = `participant-submission-${publicSlug}`;
    const participantToken = window.localStorage.getItem(storageKey) || window.crypto.randomUUID();
    formData.set("participantToken", participantToken);
    const response = await fetch("/api/contributions", {
      method: "POST",
      body: formData,
      headers: {
        "x-card-slug": publicSlug
      }
    });

    const payload = await response.json();

    if (!response.ok) {
      setIssues(payload.issues ?? [{ field: "form", message: payload.message ?? "Не удалось сохранить поздравление." }]);
      return;
    }

    window.localStorage.setItem(storageKey, participantToken);
    setHasSubmitted(true);

    setSuccessMessage("Поздравление отправлено. Спасибо, ваши слова уже в открытке.");
    setAuthorName("");
    setAuthorRole("");
    setMessage("");
    setAiGenerationIds([]);
    setAiResetSignal((current) => current + 1);
    setAiVariants([]);
    setAiGenerationId("");
    setAiIssues([]);
    setAiRemaining(null);
    setAiLimitReached(false);
    setAiUndoDraft(null);
    router.refresh();
  };

  const handleAiGenerate = async () => {
    const requestId = pendingAiRequestId.current ?? crypto.randomUUID();
    pendingAiRequestId.current = requestId;
    setAiIssues([]);

    let response: Response;
    try {
      response = await fetch("/api/ai/generate-greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          cardId,
          publicSlug,
          draftNotes: Array.from(message).slice(0, AI_DRAFT_LIMIT).join(""),
          style: "touching",
          relationshipContext: authorRole
        })
      });
    } catch {
      setAiIssues(["Не удалось связаться с AI-помощником. Проверьте соединение и попробуйте ещё раз."]);
      return;
    } finally {
      pendingAiRequestId.current = null;
    }

    const payload = await response.json();
    if (!response.ok) {
      setAiLimitReached(response.status === 429);
      setAiIssues(
        payload.issues
          ? payload.issues.map((issue: { message: string }) => issue.message)
          : [payload.message ?? "Не удалось получить варианты текста."]
      );
      return;
    }

    setAiVariants(payload.result.variants);
    setAiGenerationId(payload.result.generationId);
    setAiGenerationIds((current) =>
      current.includes(payload.result.generationId) ? current : [...current, payload.result.generationId]
    );
    setAiRemaining(payload.result.usage.remaining);
    setAiLimitReached(payload.result.usage.remaining === 0);
  };

  const generateAiVariants = () => {
    startAiTransition(async () => {
      await handleAiGenerate();
    });
  };

  const handleUseVariant = (text: string) => {
    setAiUndoDraft(message);
    setMessage(text);
    setSuccessMessage("");
  };

  const handleUndoVariant = () => {
    if (aiUndoDraft === null) {
      return;
    }
    setMessage(aiUndoDraft);
    setAiUndoDraft(null);
    messageRef.current?.focus({ preventScroll: true });
  };

  const handleHintSelect = (hint: GreetingHint) => {
    const isSameHint = activeHintId === hint.id;
    const nextIndex = isSameHint
      ? (hintIndexes[hint.id] + 1) % hint.examples.length
      : hintIndexes[hint.id];

    setActiveHintId(hint.id);
    if (isSameHint) {
      setHintIndexes((current) => ({ ...current, [hint.id]: nextIndex }));
    }
    setHintBlockVisible(true);
  };

  const handleMessageChange = (value: string) => {
    clearSuccessOnEdit();
    setMessage(value);
    setAiUndoDraft(null);
  };

  const submitDisabled =
    isPending || Boolean(successMessage) || !participantConsent || !message.trim() || (isJoin && isOverLimit);

  if (!isJoin) {
    return (
      <>
        {hasSubmitted ? (
          <section className={styles.participantSubmitted} aria-live="polite">
            <strong>Поздравление добавлено</strong>
            <p>Спасибо — ваши слова стали частью общей открытки.</p>
          </section>
        ) : (
        <section className={styles.formCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Ваше поздравление</h2>
              <p className={styles.hint}>
                {`Напишите сами или попросите AI помочь с черновиком. Лучше уложиться в ${messageLimit} символов, чтобы текст красиво смотрелся в готовой открытке.`}
              </p>
            </div>
          </div>

          <form
            className={styles.form}
            action={(formData) => {
              formData.set("cardId", cardId);

              startTransition(async () => {
                await handleSubmit(formData);
              });
            }}
          >
            {issues.length > 0 ? (
              <div className={styles.errorBox} aria-live="polite">
                <strong>Нужно поправить несколько полей:</strong>
                <ul className={styles.errorList}>
                  {issues.map((issue) => (
                    <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {successMessage ? (
              <div className={styles.successCard} aria-live="polite">
                <strong>💌 Слова подарены</strong>
                <p>{successMessage}</p>
              </div>
            ) : null}

            <input type="hidden" name="cardId" value={cardId} />
            <input type="hidden" name="aiGenerationIds" value={aiGenerationIds.join(",")} />

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="authorName">Ваше имя</label>
                <input
                  id="authorName"
                  name="authorName"
                  placeholder="Например, Ольга"
                  required
                  value={authorName}
                  onChange={(event) => {
                    clearSuccessOnEdit();
                    setAuthorName(event.target.value);
                  }}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="authorRole">Подпись под именем</label>
                <input
                  id="authorRole"
                  name="authorRole"
                  placeholder="коллега, друг, семья..."
                  value={authorRole}
                  onChange={(event) => {
                    clearSuccessOnEdit();
                    setAuthorRole(event.target.value);
                  }}
                />
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor="message">Текст поздравления</label>
                <span className={styles.counter}>
                  {message.length} / {messageLimit}
                </span>
              </div>
              <textarea
                id="message"
                name="message"
                placeholder={DEFAULT_MESSAGE_PLACEHOLDER}
                required
                maxLength={1500}
                value={message}
                onChange={(event) => handleMessageChange(event.target.value)}
              />
              <span className={styles.fieldHint}>
                Пишите просто и по-настоящему. Даже несколько теплых фраз уже много значат.
              </span>
            </div>
            <label className={styles.consent}>
              <input name="participantConsent" type="checkbox" checked={participantConsent} onChange={(event) => setParticipantConsent(event.target.checked)} required />
              <span>Я согласен на обработку моего имени и поздравления, а также на их показ организатору, получателю открытки и пользователям, имеющим ссылку на открытку. Подробнее — в <LegalDocumentModal document="privacy">политике обработки персональных данных</LegalDocumentModal>.</span>
            </label>

            <div className={styles.actions}>
              <button type="submit" className={styles.submitButton} disabled={isPending || Boolean(successMessage) || !participantConsent}>
                {!successMessage ? <span className={styles.buttonIcon} aria-hidden="true" /> : null}
                {successMessage ? "✓ Слова подарены" : isPending ? "Добавляем..." : "Подарить слова"}
              </button>
              <p className={styles.submitHint}>Ваше поздравление попадёт в открытку.</p>
            </div>
          </form>
        </section>
        )}

        {!hasSubmitted ? <AiHelper
          key={aiResetSignal}
          cardId={cardId}
          publicSlug={publicSlug}
          occasionText={occasionText}
          relationshipContext={authorRole}
          messageLimit={messageLimit}
          onUseText={(text) => {
            setMessage(text);
            setSuccessMessage("");
          }}
          onGeneration={(generationId) => {
            setAiGenerationIds((current) => current.includes(generationId) ? current : [...current, generationId]);
          }}
          variant={variant}
          greetingMode={greetingMode}
        /> : null}
        <GiftPollVote key={hasSubmitted ? "participant-submitted" : "participant-new"} publicSlug={publicSlug} active={hasSubmitted} focusOnReveal={Boolean(successMessage)} />
      </>
    );
  }

  return (
    <>
      {hasSubmitted ? (
        hasActivePoll ? null : (
          <section className={styles.participantSubmitted} aria-live="polite">
            <strong>Поздравление добавлено</strong>
            <p>Спасибо — ваши слова стали частью общей открытки.</p>
          </section>
        )
      ) : (
        <form
          className={styles.formShell}
          action={(formData) => {
            formData.set("cardId", cardId);

            startTransition(async () => {
              await handleSubmit(formData);
            });
          }}
        >
          <section className={`${styles.formCard} ${styles.formCardMain}`}>
            <div className={styles.form}>
              <div className={styles.cardHeader}>
                <span className={`${styles.cardIcon} ${styles.pencilIcon}`} aria-hidden="true" />
                <div>
                  <h2 className={styles.sectionTitle}>Ваше поздравление</h2>
                  <p className={styles.hint}>Напишите от себя — просто и по-настоящему.</p>
                </div>
              </div>

              {issues.length > 0 ? (
                <div className={styles.errorBox} aria-live="polite">
                  <strong>Нужно поправить несколько полей:</strong>
                  <ul className={styles.errorList}>
                    {issues.map((issue) => (
                      <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {successMessage ? (
                <div className={styles.successCard} aria-live="polite">
                  <strong>💌 Слова подарены</strong>
                  <p>{successMessage}</p>
                </div>
              ) : null}

              <input type="hidden" name="cardId" value={cardId} />
              <input type="hidden" name="aiGenerationIds" value={aiGenerationIds.join(",")} />

              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="authorName">Ваше имя</label>
                  <input
                    id="authorName"
                    name="authorName"
                    placeholder="Например, Ольга"
                    required
                    value={authorName}
                    onChange={(event) => {
                      clearSuccessOnEdit();
                      setAuthorName(event.target.value);
                    }}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="authorRole">Подпись — необязательно</label>
                  <input
                    id="authorRole"
                    name="authorRole"
                    placeholder="мама Миши, коллега, семья Ивановых"
                    value={authorRole}
                    onChange={(event) => {
                      clearSuccessOnEdit();
                      setAuthorRole(event.target.value);
                    }}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabelRow}>
                  <label htmlFor="message">Текст поздравления</label>
                </div>
                <div className={`${styles.editorShell} ${isOverLimit ? styles.editorShellOver : ""}`}>
                  <textarea
                    id="message"
                    name="message"
                    ref={messageRef}
                    placeholder={DEFAULT_MESSAGE_PLACEHOLDER}
                    required
                    maxLength={1500}
                    value={message}
                    aria-describedby="join-editor-limit"
                    aria-invalid={isOverLimit}
                    onChange={(event) => handleMessageChange(event.target.value)}
                  />
                  <div className={styles.editorToolbar}>
                    <span className={styles.editorCounter} id="join-editor-limit">
                      {isOverLimit
                        ? `${message.length} символов · ИИ сократит до ${messageLimit}`
                        : `${message.length} символов · итоговое поздравление до ${messageLimit}`}
                    </span>
                    <div className={styles.editorToolbarActions}>
                      <button
                        type="button"
                        className={`${styles.undoChip} ${aiUndoDraft === null ? styles.undoChipHidden : ""}`}
                        onClick={handleUndoVariant}
                        tabIndex={aiUndoDraft === null ? -1 : undefined}
                        aria-hidden={aiUndoDraft === null}
                      >
                        Отменить замену
                      </button>
                      <button
                        type="button"
                        className={styles.aiTrigger}
                        onClick={generateAiVariants}
                        disabled={isAiPending || aiLimitReached}
                      >
                        <span className={styles.aiTriggerIcon} aria-hidden="true" />
                        {isAiPending ? "Готовим варианты..." : "Помочь с текстом"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <JoinSidePanel
            state={aiPanelState}
            variants={aiVariants}
            generationId={aiGenerationId}
            isPending={isAiPending}
            limitReached={aiLimitReached}
            issues={aiIssues}
            remaining={aiRemaining}
            activeHintId={activeHintId}
            activeHintExample={activeHintExample}
            hintExampleVisible={hintBlockVisible}
            exampleBlockId="join-hint-example"
            hasActivePoll={hasActivePoll}
            onHintSelect={handleHintSelect}
            onHideHintExample={() => setHintBlockVisible(false)}
            onUseVariant={handleUseVariant}
            onRetry={generateAiVariants}
          />

          <section className={`${styles.formCard} ${styles.formCardFooter}`}>
            <div className={styles.form}>
              <label className={styles.consent}>
                <input name="participantConsent" type="checkbox" checked={participantConsent} onChange={(event) => setParticipantConsent(event.target.checked)} required />
                <span>Я согласен на обработку моего имени и поздравления, а также на их показ организатору, получателю открытки и пользователям, имеющим ссылку на открытку. Подробнее — в <LegalDocumentModal document="privacy">политике обработки персональных данных</LegalDocumentModal>.</span>
              </label>

              {isOverLimit ? (
                <p className={styles.submitLimitHint} aria-live="polite">
                  Выберите вариант ИИ или сократите текст до {messageLimit} символов.
                </p>
              ) : null}

              <div className={styles.actions}>
                <button type="submit" className={styles.submitButton} disabled={submitDisabled}>
                  {!successMessage ? <span className={styles.buttonIcon} aria-hidden="true" /> : null}
                  {successMessage ? "✓ Слова подарены" : isPending ? "Добавляем..." : "Подарить слова"}
                </button>
              </div>
            </div>
          </section>
        </form>
      )}
      <GiftPollVote
        key={hasSubmitted ? "participant-submitted" : "participant-new"}
        publicSlug={publicSlug}
        active={hasSubmitted}
        inviteToReveal
      />
    </>
  );
};
