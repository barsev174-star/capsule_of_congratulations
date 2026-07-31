import styles from "./manage-page.module.css";

type Props = {
  assignedCount: number;
  requiredCount: number;
  href?: string;
  context: "messages" | "memories";
};

export const getMissingPhotoText = (missingCount: number, context: Props["context"]) => {
  if (missingCount <= 0) {
    return context === "messages"
      ? "Фотографии для выбранного вида настроены."
      : "Фотографии для раздела настроены.";
  }
  if (context === "messages") {
    if (missingCount === 1) return "Для выбранного вида нужно назначить ещё одну фотографию.";
    return `Для выбранного вида нужно назначить ещё ${missingCount} фотографии.`;
  }
  if (missingCount === 1) return "Выберите ещё одну фотографию для раздела.";
  if (missingCount >= 2 && missingCount <= 4) return `Выберите ещё ${missingCount} фотографии для раздела.`;
  return `Выберите ещё ${missingCount} фотографий для раздела.`;
};

export const DesignPhotoSummary = ({
  assignedCount,
  requiredCount,
  href,
  context
}: Props) => {
  if (requiredCount === 0) {
    return (
      <div className={styles.compactPhotoSummary}>
        <h4 className={styles.messageSettingsTitle}>Фотографии</h4>
        <p>Для выбранного вида фотографии не используются.</p>
      </div>
    );
  }

  const safeAssignedCount = Math.min(Math.max(assignedCount, 0), requiredCount);

  return (
    <div className={styles.compactPhotoSummary}>
      <h4 className={styles.messageSettingsTitle}>Фотографии</h4>
      <strong>Выбрано {safeAssignedCount} из {requiredCount}</strong>
      <p>{getMissingPhotoText(requiredCount - safeAssignedCount, context)}</p>
      {href ? (
        <a href={href} className={styles.previewSecondaryLink}>
          {safeAssignedCount === requiredCount ? "Изменить фотографии" : "Назначить фотографии"}
        </a>
      ) : null}
    </div>
  );
};
