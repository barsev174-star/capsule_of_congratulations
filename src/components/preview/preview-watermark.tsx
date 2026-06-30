import styles from "./preview-watermark.module.css";

const MARK_COUNT = 7;

export const PreviewWatermark = () => {
  return (
    <div className={styles.watermark} aria-hidden="true">
      <div className={styles.watermarkInner}>
        {Array.from({ length: MARK_COUNT }).map((_, index) => (
          <span key={index} className={styles.mark}>
            Предпросмотр
          </span>
        ))}
      </div>
    </div>
  );
};
