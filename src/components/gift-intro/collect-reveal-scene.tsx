import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { GiftRevealMessagePreview } from "@/lib/gift-reveal-preview";
import type { GiftRevealPreviewProfile } from "@/lib/gift-reveal-profiles";
import styles from "./collect-reveal-scene.module.css";

type PreviewPhoto = {
  id: string;
  src: string;
  alt: string;
  objectPosition?: string;
};

type Props = {
  phase: string;
  recipientName: string;
  fromLabel?: string;
  messages: readonly GiftRevealMessagePreview[];
  photos: readonly PreviewPhoto[];
  profile: GiftRevealPreviewProfile;
  previewFoundation: ReactNode;
  onOpen: () => void;
  disabled: boolean;
  reducedMotion: boolean;
};

type RevealItemState = "chat" | "collecting" | "collected" | "placing" | "placed";

const ITEM_STATE_RANK: Record<RevealItemState, number> = {
  chat: 0,
  collecting: 1,
  collected: 2,
  placing: 3,
  placed: 4
};

type ChatDefinition = {
  id: "primary" | "top" | "bottom";
  title: string;
  subtitle: string;
  avatarLabel: string;
  flow: readonly (
    | { type: "message"; messageIndex: number }
    | { type: "noise"; id: string; authorName: string; text: string }
    | { type: "photo"; id: string; authorName: string; text: string }
  )[];
};

const CHAT_DEFINITIONS: readonly ChatDefinition[] = [
  {
    id: "primary",
    title: "Собираем вместе",
    subtitle: "общий чат",
    avatarLabel: "Общий чат",
    flow: [
      { type: "message", messageIndex: 0 },
      { type: "noise", id: "hello", authorName: "Катя", text: "Всем привет!" },
      { type: "message", messageIndex: 1 },
      { type: "noise", id: "joining", authorName: "Лена", text: "Я тоже присоединяюсь!" },
      { type: "photo", id: "extra-photo", authorName: "Миша", text: "Вот ещё фото" },
      { type: "message", messageIndex: 2 }
    ]
  },
  {
    id: "top",
    title: "Тёплые слова",
    subtitle: "отдельные сообщения",
    avatarLabel: "Тёплые слова",
    flow: [
      { type: "message", messageIndex: 3 },
      { type: "noise", id: "will-write", authorName: "Саша", text: "Я тоже напишу" },
      { type: "message", messageIndex: 4 },
      { type: "photo", id: "choosing-photo", authorName: "Ира", text: "Подберу фото" }
    ]
  },
  {
    id: "bottom",
    title: "Фото и моменты",
    subtitle: "отдельные сообщения",
    avatarLabel: "Фото и моменты",
    flow: [
      { type: "photo", id: "found-photo", authorName: "Оля", text: "Нашла снимок" },
      { type: "noise", id: "from-us", authorName: "Павел", text: "И от нас тоже" },
      { type: "message", messageIndex: 5 }
    ]
  }
] as const;

const motionStyle = (values: Record<string, string | number>) => values as CSSProperties;

const zoneStyle = (
  zone: GiftRevealPreviewProfile["targetZones"][keyof GiftRevealPreviewProfile["targetZones"]],
  scale = 1
) =>
  ({
    left: `${(zone.x - zone.width * (scale - 1) / 2) * 100}%`,
    top: `${(zone.y - zone.height * (scale - 1) / 2) * 100}%`,
    width: `${zone.width * scale * 100}%`,
    height: `${zone.height * scale * 100}%`
  }) as CSSProperties;

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join("") || "С";

export const CollectRevealScene = ({
  phase,
  recipientName,
  fromLabel,
  messages,
  photos,
  profile,
  previewFoundation,
  onOpen,
  disabled,
  reducedMotion
}: Props) => {
  const safeMessages = messages.slice(0, 6);
  const safePhotos = photos.slice(0, 3);
  const [greetingStates, setGreetingStates] = useState<Record<string, RevealItemState>>(() =>
    Object.fromEntries(safeMessages.map((message) => [message.id, "chat"]))
  );
  const [photoStates, setPhotoStates] = useState<Record<string, RevealItemState>>(() =>
    Object.fromEntries(safePhotos.map((photo) => [photo.id, "chat"]))
  );
  const transferTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const photoOverlaysRef = useRef(new Map<string, HTMLElement>());
  const completedPhasesRef = useRef(new Set<string>());
  const sourceLabel = fromLabel?.trim();
  const sourceCopy = sourceLabel
    ? (sourceLabel.toLocaleLowerCase("ru").startsWith("от ") ? sourceLabel : `от ${sourceLabel}`)
    : "для вас собрали особенный подарок";
  const allGreetingsPlaced = safeMessages.length > 0
    && safeMessages.every((message) => greetingStates[message.id] === "placed");
  const allPhotosPlaced = safePhotos.every((photo) => photoStates[photo.id] === "placed");

  const setGreetingState = useCallback((id: string, state: RevealItemState) => {
    setGreetingStates((current) => {
      const previous = current[id] ?? "chat";
      return ITEM_STATE_RANK[state] <= ITEM_STATE_RANK[previous] ? current : { ...current, [id]: state };
    });
  }, []);
  const setPhotoState = useCallback((id: string, state: RevealItemState) => {
    setPhotoStates((current) => {
      const previous = current[id] ?? "chat";
      return ITEM_STATE_RANK[state] <= ITEM_STATE_RANK[previous] ? current : { ...current, [id]: state };
    });
  }, []);

  const animateTransfer = useCallback((
    sourceSelector: string,
    targetSelector: string,
    kind: "message" | "photo",
    destination: "source" | "target",
    duration: number,
    onFinish: () => void
  ) => {
    const source = document.querySelector<HTMLElement>(sourceSelector);
    const target = document.querySelector<HTMLElement>(targetSelector);
    if (!source || !target || reducedMotion || typeof source.animate !== "function") {
      onFinish();
      return;
    }

    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    if (!from.width || !from.height || !to.width || !to.height) {
      onFinish();
      return;
    }

    const clone = source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("*").forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        if (attribute.name.startsWith("data-") || attribute.name === "id") node.removeAttribute(attribute.name);
      });
    });
    [...clone.attributes].forEach((attribute) => {
      if (attribute.name.startsWith("data-") || attribute.name === "id") clone.removeAttribute(attribute.name);
    });
    clone.dataset.transferOverlay = kind;
    clone.dataset.transferDestination = destination;
    clone.setAttribute("aria-hidden", "true");

    const fromStyle = getComputedStyle(source);
    const toStyle = getComputedStyle(target);
    Object.assign(clone.style, {
      position: "fixed",
      zIndex: "2147483000",
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      margin: "0",
      opacity: "1",
      visibility: "visible",
      pointerEvents: "none",
      transformOrigin: "top left",
      transition: "none",
      animation: "none",
      filter: fromStyle.filter
    });
    clone.style.setProperty("--transfer-duration", `${duration}ms`);
    document.body.append(clone);

    const translateX = to.left - from.left;
    const translateY = to.top - from.top;
    const scaleX = to.width / from.width;
    const scaleY = to.height / from.height;
    const animation = clone.animate([
      {
        transform: "translate3d(0, 0, 0) scale(1, 1)",
        borderRadius: fromStyle.borderRadius,
        boxShadow: fromStyle.boxShadow,
        backgroundColor: fromStyle.backgroundColor,
        filter: fromStyle.filter,
        offset: 0
      },
      {
        transform: `translate3d(${translateX * 0.5}px, ${translateY * 0.5}px, 0) scale(${(1 + scaleX) / 2}, ${(1 + scaleY) / 2})`,
        borderRadius: toStyle.borderRadius,
        boxShadow: "0 8px 20px rgba(0, 0, 0, 0.09)",
        backgroundColor: toStyle.backgroundColor,
        filter: kind === "photo" ? "blur(1.5px) saturate(0.94)" : "none",
        offset: 0.5
      },
      {
        transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`,
        borderRadius: toStyle.borderRadius,
        boxShadow: toStyle.boxShadow,
        backgroundColor: toStyle.backgroundColor,
        filter: toStyle.filter,
        offset: 1
      }
    ], { duration, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "forwards" });

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      flushSync(onFinish);
      clone.remove();
    };
    animation.addEventListener("finish", finish, { once: true });
    animation.addEventListener("cancel", finish, { once: true });
  }, [reducedMotion]);

  const animatePhotoTransfer = useCallback((
    photoId: string,
    sourceSelector: string,
    targetSelector: string,
    destination: "source" | "target",
    duration: number,
    onFinish: () => void
  ) => {
    const source = document.querySelector<HTMLElement>(sourceSelector);
    const target = document.querySelector<HTMLElement>(targetSelector);
    if (!source || !target || reducedMotion || typeof source.animate !== "function") {
      onFinish();
      return;
    }

    const targetRect = target.getBoundingClientRect();
    if (!targetRect.width || !targetRect.height) {
      onFinish();
      return;
    }

    let overlay = photoOverlaysRef.current.get(photoId);
    if (!overlay) {
      const sourceRect = source.getBoundingClientRect();
      if (!sourceRect.width || !sourceRect.height) {
        onFinish();
        return;
      }

      overlay = source.cloneNode(true) as HTMLElement;
      overlay.querySelectorAll("*").forEach((node) => {
        [...node.attributes].forEach((attribute) => {
          if (attribute.name.startsWith("data-") || attribute.name === "id") node.removeAttribute(attribute.name);
        });
      });
      [...overlay.attributes].forEach((attribute) => {
        if (attribute.name.startsWith("data-") || attribute.name === "id") overlay?.removeAttribute(attribute.name);
      });
      overlay.dataset.transferOverlay = "photo";
      overlay.dataset.transferPhotoId = photoId;
      overlay.setAttribute("aria-hidden", "true");
      const sourceImage = source.querySelector<HTMLImageElement>("img");
      const overlayImage = overlay.querySelector<HTMLImageElement>("img");
      if (sourceImage && overlayImage) {
        const resolvedSource = sourceImage.currentSrc || sourceImage.src;
        overlayImage.removeAttribute("srcset");
        overlayImage.removeAttribute("sizes");
        overlayImage.loading = "eager";
        overlayImage.decoding = "sync";
        overlayImage.src = resolvedSource;
        Object.assign(overlayImage.style, {
          display: "block",
          opacity: "1",
          visibility: "visible"
        });
      }
      Object.assign(overlay.style, {
        position: "fixed",
        zIndex: "2147483000",
        left: `${sourceRect.left}px`,
        top: `${sourceRect.top}px`,
        width: `${sourceRect.width}px`,
        height: `${sourceRect.height}px`,
        margin: "0",
        opacity: "1",
        visibility: "visible",
        pointerEvents: "none",
        transform: "none",
        transition: "none",
        animation: "none"
      });
      document.body.append(overlay);
      photoOverlaysRef.current.set(photoId, overlay);
    }

    const from = overlay.getBoundingClientRect();
    const fromStyle = getComputedStyle(overlay);
    const toStyle = getComputedStyle(target);
    const mobile = window.matchMedia("(max-width: 720px)").matches;
    const targetFilter = destination === "source"
      ? mobile
        ? "blur(1.1px) saturate(0.9) contrast(0.96)"
        : "blur(2px) saturate(0.86) contrast(0.92)"
      : "blur(0px) saturate(1) contrast(1)";
    const targetRotation = target.dataset.photoRotation ?? "0deg";

    overlay.dataset.transferDestination = destination;
    overlay.style.setProperty("--transfer-duration", `${duration}ms`);
    overlay.getAnimations().forEach((animation) => animation.cancel());
    overlay.style.transition = "none";
    overlay.style.transform = "none";

    const translateX = targetRect.left - from.left;
    const translateY = targetRect.top - from.top;
    const scaleX = targetRect.width / from.width;
    const scaleY = targetRect.height / from.height;

    const animation = overlay.animate([
      {
        borderRadius: fromStyle.borderRadius,
        boxShadow: fromStyle.boxShadow,
        filter: fromStyle.filter,
        transform: "translate3d(0, 0, 0) scale(1, 1)",
        offset: 0
      },
      {
        borderRadius: toStyle.borderRadius,
        boxShadow: toStyle.boxShadow,
        filter: targetFilter,
        transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`,
        offset: 1
      }
    ], { duration, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "forwards" });

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      animation.cancel();
      flushSync(onFinish);
      const landedRect = target.getBoundingClientRect();
      Object.assign(overlay.style, {
        left: `${landedRect.left}px`,
        top: `${landedRect.top}px`,
        width: `${landedRect.width}px`,
        height: `${landedRect.height}px`,
        borderRadius: toStyle.borderRadius,
        boxShadow: toStyle.boxShadow,
        filter: targetFilter,
        transform: "none"
      });
      const overlayImage = overlay.querySelector<HTMLElement>("img");
      if (overlayImage) {
        overlayImage.style.transform = destination === "target"
          ? `rotate(${targetRotation}) scale(1.04)`
          : "none";
      }
    };
    animation.addEventListener("finish", finish, { once: true });
    transferTimersRef.current.push(setTimeout(finish, duration + 34));
  }, [reducedMotion]);

  useEffect(() => () => {
    transferTimersRef.current.forEach(clearTimeout);
    document.querySelectorAll("[data-transfer-overlay]").forEach((node) => node.remove());
    photoOverlaysRef.current.clear();
  }, []);

  useEffect(() => {
    if (phase !== "handoff") return;
    photoOverlaysRef.current.forEach((overlay) => {
      overlay.getAnimations().forEach((animation) => animation.cancel());
      overlay.style.transition = "opacity 520ms cubic-bezier(0.2, 0, 0, 1), filter 520ms cubic-bezier(0.2, 0, 0, 1)";
      overlay.style.opacity = "0";
      overlay.style.filter = "blur(2px) saturate(1)";
    });
  }, [phase]);

  useEffect(() => {
    if (completedPhasesRef.current.has(phase)) return;

    const schedule = (callback: () => void, delay: number) => {
      transferTimersRef.current.push(setTimeout(callback, delay));
    };

    if (phase === "grouping-content") {
      completedPhasesRef.current.add(phase);
      const mobile = window.matchMedia("(max-width: 720px)").matches;
      safeMessages.forEach((message, index) => schedule(() => {
        setGreetingState(message.id, "collecting");
        animateTransfer(
          `[data-reveal-message="${message.id}"]`,
          `[data-material-message="${message.id}"]`,
          "message",
          "source",
          mobile ? 360 : 420,
          () => setGreetingState(message.id, "collected")
        );
      }, index * (mobile ? 90 : 130)));
      safePhotos.forEach((photo, index) => schedule(() => {
        setPhotoState(photo.id, "collecting");
        animatePhotoTransfer(
          photo.id,
          `[data-reveal-photo="${photo.id}"]`,
          `[data-material-photo="${photo.id}"]`,
          "source",
          mobile ? 340 : 400,
          () => setPhotoState(photo.id, "collected")
        );
      }, index * (mobile ? 100 : 140)));
    }

    if (phase === "embedding-messages") {
      completedPhasesRef.current.add(phase);
      const mobile = window.matchMedia("(max-width: 720px)").matches;
      safeMessages.forEach((message, index) => schedule(() => {
        setGreetingState(message.id, "placing");
        animateTransfer(
          `[data-material-message="${message.id}"]`,
          `[data-preview-message-slot="${message.id}"]`,
          "message",
          "target",
          mobile ? 235 : 285,
          () => setGreetingState(message.id, "placed")
        );
      }, index * (mobile ? 85 : 125)));
    }

    if (phase === "embedding-photos") {
      completedPhasesRef.current.add(phase);
      const mobile = window.matchMedia("(max-width: 720px)").matches;
      safePhotos.forEach((photo, index) => schedule(() => {
        setPhotoState(photo.id, "placing");
        animatePhotoTransfer(
          photo.id,
          `[data-material-photo="${photo.id}"]`,
          `[data-preview-photo="${photo.id}"]`,
          "target",
          mobile ? 240 : 280,
          () => setPhotoState(photo.id, "placed")
        );
      }, index * (mobile ? 90 : 110)));
    }
  }, [animatePhotoTransfer, animateTransfer, phase, safeMessages, safePhotos, setGreetingState, setPhotoState]);

  return (
    <div
      className={styles.collectLayout}
      data-phase={phase}
      data-visual-preset={profile.visualPreset}
      data-motion-preset={profile.motionPreset}
      data-message-count={safeMessages.length}
      data-photo-count={safePhotos.length}
    >
      <div className={styles.sceneCopy}>
        <p>Тёплые слова уже здесь</p>
        <h1>{recipientName}</h1>
        <span>{sourceCopy}</span>
      </div>

      <div className={styles.collectStage} aria-label="Три переписки с поздравлениями и фотографиями собираются в открытку">
        <div className={styles.sceneHalo} aria-hidden="true" />

        {CHAT_DEFINITIONS.map((chat, chatIndex) => {
          const chatMessages = chat.flow
            .filter((item): item is Extract<(typeof chat.flow)[number], { type: "message" }> => item.type === "message")
            .map(({ messageIndex }) => ({ message: safeMessages[messageIndex], messageIndex }))
            .filter((item): item is { message: GiftRevealMessagePreview; messageIndex: number } => Boolean(item.message));
          const positionClass = chat.id === "primary"
            ? styles.chatPanelPrimary
            : chat.id === "top"
              ? styles.chatPanelTop
              : styles.chatPanelBottom;

          return (
            <section
              key={chat.id}
              className={`${styles.chatPanel} ${positionClass}`}
              data-chat-panel={chat.id}
              data-chat-message-count={chatMessages.length}
              aria-hidden="true"
            >
              <span className={styles.chatSurface} />
              <header className={styles.chatHeader}>
                <span className={styles.chatAvatars} aria-label={chat.avatarLabel}>
                  {chatMessages.slice(0, chat.id === "primary" ? 3 : 1).map(({ message }) => (
                    <i key={message.id}>{initials(message.authorName)}</i>
                  ))}
                </span>
                <span className={styles.chatMeta}>
                  <strong>{chat.title}</strong>
                  <small>{chat.subtitle}</small>
                </span>
              </header>

              <div className={styles.messageList}>
                {chat.flow.map((flowItem, flowIndex) => {
                  if (flowItem.type === "noise") {
                    return (
                      <article
                        key={flowItem.id}
                        className={styles.chatMessage}
                        data-chat-noise
                        data-stream-kind="noise"
                        data-stream-position={flowIndex}
                      >
                        <span className={styles.messageAvatar}>{initials(flowItem.authorName)}</span>
                        <span className={styles.messageCopy}>
                          <strong>{flowItem.authorName}</strong>
                          <small>{flowItem.text}</small>
                        </span>
                      </article>
                    );
                  }

                  if (flowItem.type === "photo") {
                    const photo = safePhotos[chatIndex];
                    if (!photo) return null;
                    return (
                      <article
                        key={flowItem.id}
                        className={`${styles.chatMessage} ${styles.photoMessage}`}
                        data-chat-noise
                        data-stream-kind="photo"
                        data-stream-position={flowIndex}
                      >
                        <span className={styles.messageAvatar}>{initials(flowItem.authorName)}</span>
                        <span className={styles.messageCopy}>
                          <strong>{flowItem.authorName}</strong>
                          <small>{flowItem.text}</small>
                        </span>
                        <span
                          className={styles.photoAttachment}
                          data-reveal-photo={photo.id}
                          data-item-state={photoStates[photo.id] ?? "chat"}
                          style={motionStyle({
                            "--photo-order": chatIndex,
                            "--stagger": `${chatIndex * 80}ms`
                          })}
                        >
                          <Image
                            src={photo.src}
                            alt={photo.alt}
                            fill
                            sizes="(max-width: 720px) 64px, 78px"
                            style={{ objectPosition: photo.objectPosition }}
                          />
                          <span>Фото</span>
                        </span>
                      </article>
                    );
                  }

                  const messageIndex = flowItem.messageIndex;
                  const message = safeMessages[messageIndex];
                  if (!message) return null;
                  return (
                    <article
                      key={message.id}
                      className={styles.chatMessage}
                      data-reveal-message={message.id}
                      data-stream-kind="greeting"
                      data-message-index={messageIndex}
                      data-main-message={message.isMain ? "true" : undefined}
                      data-item-state={greetingStates[message.id] ?? "chat"}
                      style={motionStyle({
                        "--message-order": messageIndex,
                        "--stack-rotate": `${(messageIndex - 2.5) * 0.7}deg`,
                        "--stagger": `${messageIndex * 70}ms`
                      })}
                    >
                      <span className={styles.messageAvatar}>{initials(message.authorName)}</span>
                      <span className={styles.messageCopy}>
                        <strong>{message.authorName}</strong>
                        <small>{message.excerpt}</small>
                      </span>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}

        <div className={styles.materialTray} data-material-tray aria-hidden="true">
          <div className={styles.materialMessages} data-all-placed={allGreetingsPlaced ? "true" : "false"}>
            {safeMessages.map((message, index) => (
              <article
                key={message.id}
                className={styles.materialMessage}
                data-material-message={message.id}
                data-item-state={greetingStates[message.id] ?? "chat"}
                style={{ "--item": index } as CSSProperties}
              >
                <span className={styles.messageAvatar}>{initials(message.authorName)}</span>
                <span className={styles.messageCopy}>
                  <strong>{message.authorName}</strong>
                  <small>{message.excerpt}</small>
                </span>
              </article>
            ))}
          </div>
          {safePhotos.length > 0 ? (
            <div className={styles.materialPhotos} data-material-photos data-all-placed={allPhotosPlaced ? "true" : "false"}>
              {safePhotos.map((photo, index) => (
                <i key={photo.id} data-material-photo={photo.id} data-item-state={photoStates[photo.id] ?? "chat"} style={{ "--item": index } as CSSProperties}>
                </i>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.previewShell} aria-hidden="true">
          {previewFoundation}
          <div className={styles.previewIdentity}>
            <span>Открытка для</span>
            <strong>{recipientName}</strong>
          </div>
          <div className={`${styles.previewZone} ${styles.previewMessages}`} style={zoneStyle(profile.targetZones.messages, 1.07)}>
            <div className={styles.previewMessageSlots} data-preview-message-slots>
              {safeMessages.map((message, index) => (
                <i
                  key={message.id}
                  data-preview-message-slot={message.id}
                  data-item-state={greetingStates[message.id] ?? "chat"}
                  style={{ "--item": index } as CSSProperties}
                >
                  <span className={styles.messageAvatar}>{initials(message.authorName).slice(0, 1)}</span>
                  <span className={styles.messageCopy}>
                    <strong>{message.authorName}</strong>
                    <small>{message.excerpt}</small>
                  </span>
                </i>
              ))}
            </div>
            <div className={styles.previewTextBlock} data-preview-text-block data-preview-message-content>
              <strong>Тёплые слова от {safeMessages.length} человек</strong>
              {safeMessages.slice(0, 2).map((message) => <span key={message.id}>{message.excerpt}</span>)}
            </div>
          </div>
          <div className={`${styles.previewZone} ${styles.previewPhotos}`} style={zoneStyle(profile.targetZones.photos, 0.88)}>
            {safePhotos.map((photo, index) => (
              <i
                key={photo.id}
                data-preview-photo={photo.id}
                data-photo-rotation={index === 0 ? "-2deg" : index === 1 ? "1deg" : "-1deg"}
                data-item-state={photoStates[photo.id] ?? "chat"}
                style={{ "--item": index } as CSSProperties}
              >
                {reducedMotion ? <Image src={photo.src} alt="" fill sizes="150px" style={{ objectPosition: photo.objectPosition }} /> : null}
              </i>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.collectActions}>
        <button type="button" onClick={onOpen} disabled={disabled}>
          Собрать поздравления
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};
