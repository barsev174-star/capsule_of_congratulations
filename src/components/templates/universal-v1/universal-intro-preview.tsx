import Image from "next/image";
import type { CSSProperties } from "react";
import type { TemplateProfile } from "@/lib/templates/profile";
import styles from "./universal-card.module.css";

export function UniversalTemplateIntroPreview({
  profile,
  recipientName,
  fromLabel,
  className = ""
}: {
  profile: TemplateProfile;
  recipientName: string;
  fromLabel?: string;
  className?: string;
}) {
  const style = {
    "--uv1-intro-surface": profile.intro.surface,
    "--uv1-intro-text": profile.intro.text,
    "--uv1-intro-accent": profile.intro.accent,
    "--uv1-heading-font": profile.typography.heading.family
  } as CSSProperties;

  return (
    <article
      className={`${styles.introPreview} ${className}`.trim()}
      data-universal-intro="lightweight"
      data-template-id={profile.id}
      style={style}
    >
      {profile.intro.pattern ? <Image className={styles.introPattern} src={profile.intro.pattern.src} alt="" fill sizes="280px" aria-hidden="true" /> : null}
      {profile.intro.mark ? <span className={styles.introMark}><Image src={profile.intro.mark.src} alt="" fill sizes="44px" /></span> : <span className={styles.introFallbackMark} aria-hidden="true">♡</span>}
      <span>{profile.intro.kicker?.trim() || "Открытка для"}</span>
      <strong>{recipientName}</strong>
      <i aria-hidden="true" />
      <small>{fromLabel?.trim() || "С тёплыми словами"}</small>
    </article>
  );
}
