import styles from "./manage-page.module.css";

type Props = {
  audience: string;
  purpose: string;
  nextStep: string;
  tone?: "participant" | "recipient";
};

export const LinkPurposeList = ({
  audience,
  purpose,
  nextStep,
  tone = "participant"
}: Props) => (
  <dl
    className={`${styles.linkPurposeList} ${
      tone === "recipient" ? styles.linkPurposeListRecipient : ""
    }`}
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
      <dt>Следующий шаг</dt>
      <dd>{nextStep}</dd>
    </div>
  </dl>
);
