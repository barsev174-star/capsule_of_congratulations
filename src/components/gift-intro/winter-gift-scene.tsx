import { useId, type CSSProperties } from "react";
import Image from "next/image";
import type { WinterGiftTheme } from "@/lib/gift-animations";
import styles from "./winter-gift-scene.module.css";

const cargo = { x: 36, y: 75 };
const cargoPosition = { "--cargo-x": cargo.x / 400, "--cargo-y": cargo.y / 400 } as CSSProperties;
const giftArt = (theme: WinterGiftTheme) => theme === "green"
  ? "/assets/gift/winter-wonder-gift-green.webp"
  : "/assets/gift/winter-wonder-gift-red.webp";

const PlumTint = ({ id }: { id: string }) => (
  <filter id={id} colorInterpolationFilters="sRGB">
    {/* Shift the burgundy panels toward plum while keeping the gold and highlights warm. */}
    <feColorMatrix values=".64 .666 -.306 0 0
      -.07 1.1295 -.0595 0 0
      .36 -.666 1.306 0 0
      0 0 0 1 0" />
  </filter>
);

const Reindeer = ({ artId, transform }: { artId: string; transform: string }) => (
  <g transform={transform}>
    <g className={styles.deerBody}>
      <g className={styles.hindLeg}><use href={`#${artId}`} clipPath={`url(#${artId}-hind)`} /></g>
      <g className={styles.foreLeg}><use href={`#${artId}`} clipPath={`url(#${artId}-fore)`} /></g>
      <use href={`#${artId}`} clipPath={`url(#${artId}-body)`} />
    </g>
  </g>
);

const Sleigh = ({ delivery = false, theme }: { delivery?: boolean; theme: WinterGiftTheme }) => {
  const artId = useId();
  const tint = theme === "plum" ? `url(#${artId}-plum)` : undefined;
  return (
    <svg viewBox="0 0 400 135" fill="none" aria-hidden="true">
      <defs>
        <image id={artId} href="/assets/gift/winter-wonder-reindeer.webp" width="150" height="100" />
        {/* Keep the shoulder and hip attached to the body while the lower legs flex. */}
        <clipPath id={`${artId}-body`}><path d="M0 0H150V55H112L101 57 95 64 99 70H58L43 76 27 71 0 67Z" /></clipPath>
        <clipPath id={`${artId}-hind`}><path d="M0 59H24L42 64 58 67 54 75 38 84 20 100H0Z" /></clipPath>
        <clipPath id={`${artId}-fore`}><path d="M100 53H150V100H110L93 72 95 62Z" /></clipPath>
        {delivery && tint ? <PlumTint id={`${artId}-plum`} /> : null}
        {delivery ? (
          <radialGradient id={`${artId}-cargo`}>
            <stop stopColor="#ffecaf" stopOpacity=".88" />
            <stop offset=".37" stopColor="#ffca73" stopOpacity=".53" />
            <stop offset="1" stopColor="#ffc06b" stopOpacity="0" />
          </radialGradient>
        ) : null}
      </defs>
      <path d="M78 81C132 87 171 91 221 78C268 74 304 69 340 56" stroke="currentColor" strokeWidth="1.1" opacity=".7" />
      <g className={styles.leadDeer}><Reindeer artId={artId} transform="translate(263 12) scale(.8)" /></g>
      <g className={styles.followDeer}><Reindeer artId={artId} transform="translate(138 33) scale(.87)" /></g>
      <g className={styles.sleighRock}>
        <image href="/assets/gift/winter-wonder-sleigh-festive.webp" x="2" y="56" width="137" height="68.5" />
        {delivery ? (
          <>
            <circle className={styles.cargoGlow} cx={cargo.x} cy={cargo.y} r="27" fill={`url(#${artId}-cargo)`} />
            <image className={styles.cargoGift} href={giftArt(theme)} x={cargo.x - 22} y={cargo.y - 44 / 3} width="44" height={88 / 3} filter={tint} />
          </>
        ) : null}
      </g>
    </svg>
  );
};

const GiftBox = ({ theme }: { theme: WinterGiftTheme }) => {
  const id = useId();
  const isGreen = theme === "green";
  const art = giftArt(theme);
  const mask = isGreen ? `url(#${id}-silhouette)` : undefined;
  const tint = theme === "plum" ? `url(#${id}-plum)` : undefined;

  // Both illustrations share the same seam and camera angle.
  return (
    <span className={styles.giftBox} aria-hidden="true">
      <svg className={styles.giftBody} viewBox="0 0 1536 1024">
        <defs>
          {tint ? <PlumTint id={`${id}-plum`} /> : null}
          {isGreen ? (
            <mask id={`${id}-silhouette`} maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024" style={{ maskType: "alpha" }}>
              <image href="/assets/gift/winter-wonder-gift-silhouette.webp" width="1536" height="1024" />
            </mask>
          ) : null}
          <clipPath id={`${id}-lid`}>
            <path d="M0 0H1536V401H1368L1277 563H0Z" />
          </clipPath>
          <clipPath id={`${id}-body`}>
            <path d="M0 561H1276L1367 400H1536V1024H0Z" />
          </clipPath>
          <radialGradient id={`${id}-glow`} cx=".52" cy=".94" r=".62">
            <stop stopColor="#ffdb8b" stopOpacity=".65" />
            <stop offset=".48" stopColor="#f1a846" stopOpacity=".32" />
            <stop offset="1" stopColor="#ba762d" stopOpacity="0" />
          </radialGradient>
        </defs>
        <image href={art} width="1536" height="1024" clipPath={`url(#${id}-body)`} mask={mask} filter={tint} />
        <g className={styles.giftInterior}>
          {/* The photo insert is registered to the body seam, with a narrower back rim. */}
          <image href="/assets/gift/winter-wonder-gift-interior.webp" x="131" y="403" width="1236" height="166" preserveAspectRatio="none" />
          <path className={styles.innerGlow} d="M141 564 302 409H1358L1269 564Z" fill={`url(#${id}-glow)`} />
        </g>
      </svg>
      <svg className={styles.giftLid} viewBox="0 0 1536 1024">
        <image href={art} width="1536" height="1024" clipPath={`url(#${id}-lid)`} mask={mask} filter={tint} />
      </svg>
    </span>
  );
};

const snow = Array.from({ length: 26 }, (_, index) => ({
  "--x": `${(index * 37 + 3) % 101}%`,
  "--diameter": `${index % 8 === 0 ? 3 : index % 3 === 0 ? 2 : 1.5}px`,
  "--travel": `${index % 2 ? 27 : -19}px`,
  "--duration": `${8 + (index * 7) % 10}s`,
  "--delay": `${-((index * 23 + 1) % 141) / 10}s`,
  "--alpha": 0.26 + (index % 6) * 0.085
} as CSSProperties));

const sparks = [
  [-138, -112], [-92, -159], [-57, -97], [-26, -188], [22, -126],
  [58, -165], [94, -104], [142, -121], [111, -50], [-102, -36]
].map(([x, y], index) => ({
  "--x": `${x}px`,
  "--y": `${y}px`,
  "--delay": `${1240 + index % 4 * 115}ms`
} as CSSProperties));

type WinterGiftSceneProps = {
  theme: WinterGiftTheme;
  phase: "delivering" | "ready" | "opening" | "handoff";
  reducedMotion: boolean;
  forceFullMotion: boolean;
  onOpen: () => void;
};

export const WinterGiftScene = ({ theme, phase, reducedMotion, forceFullMotion, onOpen }: WinterGiftSceneProps) => {
  const isReady = phase === "ready";
  const hasOpened = phase === "opening" || phase === "handoff";
  return (
    <div
      className={styles.scene}
      data-winter-theme={theme}
      data-winter-phase={phase}
      data-winter-motion={reducedMotion ? "reduced" : "full"}
      data-winter-force={forceFullMotion || undefined}
      data-winter-open={hasOpened || undefined}
      style={cargoPosition}
    >
      <div className={styles.landscape} aria-hidden="true">
        <span className={styles.forest} />
        <span className={styles.vignette} />
        <span className={styles.moon} />
        <span className={styles.lanterns} />
      </div>
      {!reducedMotion && (
        <div className={styles.snow} aria-hidden="true">
          {snow.map((style, index) => <span key={index} style={style} />)}
        </div>
      )}
      {!reducedMotion && phase === "delivering" && (
        <div className={styles.sky} aria-hidden="true">
          <span className={styles.flight}>
            <Sleigh delivery theme={theme} />
          </span>
        </div>
      )}
      {!isReady && !reducedMotion && <div className={styles.stage} aria-hidden="true">
        <span className={styles.landing}>
          <span className={styles.groundLight} />
          <span className={styles.boxShadow} />
        </span>
        {!reducedMotion && phase === "delivering" ? (
          <span className={styles.deliveryTrace}>
            <i /><i /><i /><i /><i />
          </span>
        ) : null}
        <span className={styles.arrival}>
          <span className={styles.arrivalDepth}>
            <span className={styles.giftMotion}>
              <span className={styles.giftSettle}>
                <GiftBox theme={theme} />
              </span>
            </span>
          </span>
        </span>
        {hasOpened && !reducedMotion && (
          <>
            <span className={styles.seamLight} />
            <span className={styles.lightWave} />
            <span className={styles.sparkBurst}>
              {sparks.map((style, index) => <span key={index} style={style} />)}
            </span>
          </>
        )}
      </div>}
      <div className={styles.copy} aria-hidden={!isReady}>
        <h1>Для тебя приготовили особенный подарок</h1>
        <button type="button" disabled={!isReady} onClick={onOpen}>
          Получить подарок <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};

export const WinterGiftPreview = ({ theme, templatePreviewSrc }: {
  theme: WinterGiftTheme;
  templatePreviewSrc: string;
}) => (
  <span className={styles.preview} data-winter-theme={theme} aria-hidden="true">
    <span className={styles.previewFlight}><Sleigh theme={theme} /></span>
    <span className={styles.previewBox}><GiftBox theme={theme} /></span>
    <span className={styles.previewCard}>
      <Image src={templatePreviewSrc} alt="" fill sizes="112px" />
    </span>
  </span>
);
