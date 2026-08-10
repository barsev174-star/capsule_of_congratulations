import styles from "./manage-page.module.css";

type Props = {
  audience: string;
  purpose: string;
  nextStep: string;
  nextStepLabel?: string;
  compact?: boolean;
  tone?: "participant" | "recipient";
};

export const LinkPurposeList = ({
  audience,
  purpose,
  nextStep,
  nextStepLabel = "Следующий шаг",
  compact = false,
  tone = "participant"
}: Props) => (
  <dl
    className={`${styles.linkPurposeList} ${
      tone === "recipient" ? styles.linkPurposeListRecipient : ""
    } ${compact ? styles.linkPurposeListCompact : ""}`.trim()}
  >
    <div>
      <dt>Кому</dt>
      <dd>{audience}</dd>
    </div>
    <div>
      <dt>Для чего</dt>
      <dd>{purpose}</dd>
    </div>
    <div>
      <dt>{nextStepLabel}</dt>
      <dd>{nextStep}</dd>
    </div>
  </dl>
);
