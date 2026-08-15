/* eslint-disable @next/next/no-img-element -- Export renderer and web renderer share the same declarative underlay primitive. */
import type { CSSProperties } from "react";
import {
  getUniversalSectionUnderlayPreset,
  type TemplateSectionUnderlay
} from "@/lib/templates/section-underlays";

type SectionUnderlayProps = {
  underlay: TemplateSectionUnderlay;
  resolveAsset?: (src: `/${string}`) => string;
  className?: string;
  targetSize?: { width: number; height: number };
};

type Slice = {
  key: string;
  source: [number, number, number, number];
  target: [number, number, number, number];
};

const nineSlices = (
  underlay: TemplateSectionUnderlay,
  targetSize: { width: number; height: number }
): Slice[] => {
  const preset = getUniversalSectionUnderlayPreset(underlay.preset);
  const edges = preset.slices ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const sourceXs = [0, edges.left, 1 - edges.right, 1];
  const sourceYs = [0, edges.top, 1 - edges.bottom, 1];
  const horizontalScale = targetSize.width / underlay.asset.width;
  const verticalEdgesHeight = (edges.top + edges.bottom) * underlay.asset.height;
  const uniformScale = Math.min(
    horizontalScale,
    verticalEdgesHeight > 0 ? targetSize.height / verticalEdgesHeight : horizontalScale
  );
  const targetXs = [
    0,
    edges.left * underlay.asset.width * uniformScale,
    targetSize.width - edges.right * underlay.asset.width * uniformScale,
    targetSize.width
  ];
  const targetYs = [
    0,
    edges.top * underlay.asset.height * uniformScale,
    targetSize.height - edges.bottom * underlay.asset.height * uniformScale,
    targetSize.height
  ];
  const slices: Slice[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      slices.push({
        key: `${row}-${column}`,
        source: [sourceXs[column], sourceYs[row], sourceXs[column + 1] - sourceXs[column], sourceYs[row + 1] - sourceYs[row]],
        target: [targetXs[column], targetYs[row], targetXs[column + 1] - targetXs[column], targetYs[row + 1] - targetYs[row]]
      });
    }
  }
  return slices;
};

export function SectionUnderlay({
  underlay,
  resolveAsset = (src) => src,
  className = "",
  targetSize
}: SectionUnderlayProps) {
  const preset = getUniversalSectionUnderlayPreset(underlay.preset);
  const src = resolveAsset(underlay.asset.src);
  const mobileSrc = underlay.mobileAsset ? resolveAsset(underlay.mobileAsset.src) : null;
  const opacity = underlay.opacity ?? 1;
  const rootStyle = {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    pointerEvents: "none",
    opacity
  } as CSSProperties;

  if (preset.rendering === "nine-slice") {
    if (!targetSize) {
      const slices = preset.slices!;
      const borderWidth = `${slices.top * underlay.asset.height / underlay.asset.width * 100}cqw ${slices.right * 100}cqw ${slices.bottom * underlay.asset.height / underlay.asset.width * 100}cqw ${slices.left * 100}cqw`;
      const borderImageSlice = `${slices.top * 100}% ${slices.right * 100}% ${slices.bottom * 100}% ${slices.left * 100}%`;
      const frameLayerStyle = {
        position: "absolute",
        inset: 0,
        boxSizing: "border-box",
        borderStyle: "solid",
        borderWidth,
        borderImageSource: `url("${src}")`,
        borderImageWidth: 1
      } as CSSProperties;
      return (
        <span
          className={className}
          aria-hidden="true"
          data-underlay-preset={underlay.preset}
          style={rootStyle}
        >
          <span
            data-underlay-layer="standard"
            style={{
              ...frameLayerStyle,
              borderImageSlice: `${borderImageSlice} fill`,
              borderImageRepeat: "stretch"
            }}
          />
          <span
            data-underlay-layer="mobile-variable-frame"
            style={{
              ...frameLayerStyle,
              borderImageSlice,
              borderImageRepeat: "stretch round"
            }}
          />
        </span>
      );
    }
    return (
      <svg
        className={className}
        viewBox={`0 0 ${targetSize.width} ${targetSize.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        data-underlay-preset={underlay.preset}
        style={rootStyle}
      >
        {nineSlices(underlay, targetSize).map(({ key, source, target }) => (
          <svg
            key={key}
            x={target[0]}
            y={target[1]}
            width={target[2]}
            height={target[3]}
            viewBox={`${source[0] * underlay.asset.width} ${source[1] * underlay.asset.height} ${source[2] * underlay.asset.width} ${source[3] * underlay.asset.height}`}
            preserveAspectRatio="none"
            overflow="hidden"
          >
            <image href={src} width={underlay.asset.width} height={underlay.asset.height} />
          </svg>
        ))}
      </svg>
    );
  }

  const focalPoint = underlay.focalPoint ?? { x: 0.5, y: 0.5 };
  return (
    <span
      className={className}
      aria-hidden="true"
      data-underlay-preset={underlay.preset}
      data-has-mobile-asset={mobileSrc ? "true" : undefined}
      style={{
        ...rootStyle,
        ...(preset.rendering === "bottom-edge" ? { height: `${(preset.edgeSize ?? 0.12) * 100}%`, top: "auto" } : {})
      }}
    >
      <img
        src={src}
        alt=""
        data-underlay-variant="desktop"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${focalPoint.x * 100}% ${focalPoint.y * 100}%`
        }}
      />
      {mobileSrc ? <img
        src={mobileSrc}
        alt=""
        data-underlay-variant="mobile"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${focalPoint.x * 100}% ${focalPoint.y * 100}%`
        }}
      /> : null}
    </span>
  );
}
