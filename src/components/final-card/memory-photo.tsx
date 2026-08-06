import type { CardMediaAsset } from "@/lib/cards/types";
import { getCropStyle } from "@/lib/cards/media-slots";
import styles from "./final-card.module.css";

export const MemoryPhoto = ({ asset }: { asset: CardMediaAsset }) => (
  <div className={styles.memoryPhotoViewport} data-memory-photo-viewport>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={asset.publicUrl}
      alt={asset.captionTitle || asset.captionSubtitle || "Фото открытки"}
      className={styles.memoryPhotoImage}
      style={getCropStyle(asset)}
    />
  </div>
);
