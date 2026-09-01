"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { CardTemplate } from "@/lib/cards/templates";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import { giftAnimations, type GiftAnimationId } from "@/lib/gift-animations";
import { useModalFocus } from "./use-modal-focus";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  templateId: CardTemplate["id"];
  templatePreviewSrc: string;
  selectedAnimationId: GiftAnimationId;
  action: (formData: FormData) => void;
  isPending: boolean;
  statusMessage: string;
  onClose: () => void;
};

export const getRevealExampleHref = (
  templateId: CardTemplate["id"],
  animationId: GiftAnimationId
) => `/example?template=${encodeURIComponent(templateId)}&animation=${encodeURIComponent(animationId)}`;

export const RevealIcon = ({ animationId }: { animationId: GiftAnimationId }) => (
  <span
    className={animationId === "envelope" ? styles.animationEnvelopeMark : styles.animationCollectMark}
    aria-hidden="true"
  >
    {animationId === "collect-messages" ? <><i /><i /><i /></> : <i />}
  </span>
);

const EnvelopeStoryboard = ({ templatePreviewSrc }: { templatePreviewSrc: string }) => (
  <div className={styles.revealStoryboard} data-preview-story="envelope" aria-label="Конверт открывается и показывает открытку">
    <figure data-preview-stage="closed">
      <span className={styles.storyStep}>1</span>
      <div className={`${styles.storyEnvelope} ${styles.storyEnvelopeClosed}`} aria-hidden="true">
        <Image src="/assets/gift/envelope-closed.png" alt="" fill sizes="120px" className={styles.storyEnvelopeImage} />
      </div>
      <figcaption>Конверт</figcaption>
    </figure>
    <figure data-preview-stage="opening">
      <span className={styles.storyStep}>2</span>
      <div className={`${styles.storyEnvelope} ${styles.storyEnvelopeOpening}`} aria-hidden="true">
        <span className={styles.storyEnvelopePeek}>
          <Image src={templatePreviewSrc} alt="" fill sizes="70px" className={styles.storyTemplateImage} />
        </span>
        <Image src="/assets/gift/envelope-open.png" alt="" fill sizes="120px" className={styles.storyEnvelopeImage} />
      </div>
      <figcaption>Открытие</figcaption>
    </figure>
    <figure data-preview-stage="card">
      <span className={styles.storyStep}>3</span>
      <div className={`${styles.storyEnvelope} ${styles.storyEnvelopeRevealed}`} aria-hidden="true">
        <span className={styles.storyEnvelopeResult}>
          <Image src={templatePreviewSrc} alt="" fill sizes="90px" className={styles.storyTemplateImage} />
        </span>
        <Image src="/assets/gift/envelope-open.png" alt="" fill sizes="120px" className={styles.storyEnvelopeImage} />
      </div>
      <figcaption>Открытка</figcaption>
    </figure>
  </div>
);

const CollectStoryboard = ({ templatePreviewSrc }: { templatePreviewSrc: string }) => (
  <div className={styles.revealStoryboard} data-preview-story="collect-messages" aria-label="Поздравления и фото собираются в готовую открытку">
    <figure data-preview-stage="messages">
      <span className={styles.storyStep}>1</span>
      <div className={`${styles.storyCollect} ${styles.storyCollectLoose}`} aria-hidden="true">
        <i className={styles.storyMessageOne} />
        <i className={styles.storyMessageTwo} />
        <i className={styles.storyPhoto} />
        <i className={styles.storyReadyCard} />
      </div>
      <figcaption>Сообщения и фото</figcaption>
    </figure>
    <figure data-preview-stage="assembling">
      <span className={styles.storyStep}>2</span>
      <div className={`${styles.storyCollect} ${styles.storyCollectAssembling}`} aria-hidden="true">
        <i className={styles.storyMessageOne} />
        <i className={styles.storyMessageTwo} />
        <i className={styles.storyPhoto} />
        <i className={styles.storyReadyCard} />
      </div>
      <figcaption>Собираются</figcaption>
    </figure>
    <figure data-preview-stage="ready">
      <span className={styles.storyStep}>3</span>
      <div className={`${styles.storyCollect} ${styles.storyCollectReady}`} aria-hidden="true">
        <i className={styles.storyMessageOne} />
        <i className={styles.storyMessageTwo} />
        <i className={styles.storyPhoto} />
        <i className={styles.storyReadyCard}>
          <Image src={templatePreviewSrc} alt="" fill sizes="90px" className={styles.storyTemplateImage} />
        </i>
      </div>
      <figcaption>Готовая открытка</figcaption>
    </figure>
  </div>
);

export const RevealSettingsDialog = ({
  manageToken,
  templateId,
  templatePreviewSrc,
  selectedAnimationId,
  action,
  isPending,
  statusMessage,
  onClose
}: Props) => {
  const dialogRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const choiceRefs = useRef<Partial<Record<GiftAnimationId, HTMLButtonElement | null>>>({});
  useModalFocus(dialogRef, onClose);

  useEffect(() => {
    sendClientTelemetry("REVEAL_SETTINGS_MODAL_OPENED", {
      templateId,
      revealType: selectedAnimationId,
      source: "editor_sidebar"
    });
  }, [selectedAnimationId, templateId]);

  const handleChoiceKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    animationId: GiftAnimationId
  ) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const nextAnimationId: GiftAnimationId = animationId === "envelope" ? "collect-messages" : "envelope";
    const nextChoice = choiceRefs.current[nextAnimationId];
    nextChoice?.focus();
    if (nextAnimationId !== selectedAnimationId && nextChoice) {
      formRef.current?.requestSubmit(nextChoice);
    }
  };

  const trackExample = (animationId: GiftAnimationId) => {
    sendClientTelemetry("REVEAL_EXAMPLE_OPENED", {
      templateId,
      revealType: animationId,
      source: "reveal_modal"
    });
  };

  return createPortal(
    <div className={styles.revealDialogBackdrop} role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className={styles.revealDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reveal-dialog-title"
        aria-describedby="reveal-dialog-description"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.revealDialogHeader}>
          <div>
            <h3 id="reveal-dialog-title">Выберите способ открытия</h3>
            <p id="reveal-dialog-description">Как получатель впервые увидит открытку</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть выбор способа открытия">×</button>
        </header>

        <form ref={formRef} action={action} className={styles.revealDialogForm}>
          <input type="hidden" name="manageToken" value={manageToken} />
          <div className={styles.revealDialogBody} role="radiogroup" aria-label="Способ открытия открытки">
            {giftAnimations.map((animation) => {
              const selected = animation.id === selectedAnimationId;
              return (
                <article
                  key={animation.id}
                  className={`${styles.revealOptionCard} ${selected ? styles.revealOptionCardSelected : ""}`}
                >
                  {animation.id === "envelope"
                    ? <EnvelopeStoryboard templatePreviewSrc={templatePreviewSrc} />
                    : <CollectStoryboard templatePreviewSrc={templatePreviewSrc} />}
                  <div className={styles.revealOptionCopy}>
                    <div className={styles.revealOptionTitle}>
                      <RevealIcon animationId={animation.id} />
                      <strong>{animation.name}</strong>
                    </div>
                    <p>{animation.description}</p>
                  </div>
                  <div className={styles.revealOptionActions}>
                    <button
                      ref={(node) => { choiceRefs.current[animation.id] = node; }}
                      type={selected ? "button" : "submit"}
                      name={selected ? undefined : "giftAnimationId"}
                      value={selected ? undefined : animation.id}
                      className={selected ? styles.revealSelectedButton : styles.revealSelectButton}
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      aria-label={`${animation.name} — ${selected ? "выбрано" : "выбрать"}`}
                      data-reveal-choice={animation.id}
                      disabled={isPending}
                      onKeyDown={(event) => handleChoiceKeyDown(event, animation.id)}
                    >
                      {selected ? "✓ Выбрано" : isPending ? "Сохраняем…" : "Выбрать"}
                    </button>
                    <a
                      href={getRevealExampleHref(templateId, animation.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.revealExampleLink}
                      onClick={() => trackExample(animation.id)}
                    >
                      Посмотреть пример <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
          <footer className={styles.revealDialogFooter}>
            <span role="status" aria-live="polite">
              {isPending ? "Сохраняем способ открытия…" : statusMessage}
            </span>
            <button type="button" onClick={onClose}>Закрыть</button>
          </footer>
        </form>
      </section>
    </div>,
    document.body
  );
};
