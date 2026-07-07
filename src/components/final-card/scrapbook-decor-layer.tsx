"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./final-card.module.css";
import {
  SCRAPBOOK_DECOR_ANCHORS,
  SCRAPBOOK_VISUAL_GROUPS,
  scrapbookComponentAssets,
  scrapbookFloatingAssets,
  scrapbookVisualAssets,
  type ScrapbookComponentAsset,
  type ScrapbookDecorAnchor,
  type ScrapbookFloatingAsset,
  type ScrapbookVisualAsset
} from "./scrapbook-decor-config";

type ProviderProps = {
  children: ReactNode;
  debugEnabled: boolean;
};

type LayerProps = {
  anchor: ScrapbookDecorAnchor;
};

type FrameProps = {
  assetId: string;
  children: ReactNode;
  id?: string;
  className?: string;
  contentClassName?: string;
  as?: ElementType;
};

type FloatingField =
  | "anchor"
  | "top"
  | "left"
  | "right"
  | "bottom"
  | "width"
  | "rotate"
  | "opacity"
  | "zIndex"
  | "visible"
  | "hideOnMobile";

type FloatingMobileField = "top" | "left" | "right" | "bottom" | "width" | "rotate" | "opacity" | "zIndex" | "visible";

type ComponentField =
  | "visible"
  | "backgroundSize"
  | "backgroundPositionX"
  | "backgroundPositionY"
  | "opacity"
  | "paperTop"
  | "paperLeft"
  | "paperRight"
  | "paperBottom"
  | "paperWidth"
  | "paperHeight"
  | "width"
  | "maxWidth"
  | "rotate"
  | "zIndex"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft"
  | "minHeight";

type ComponentMobileField = ComponentField;

type DecorContextValue = {
  floatingAssets: ScrapbookFloatingAsset[];
  componentAssets: ScrapbookComponentAsset[];
  allAssets: ScrapbookVisualAsset[];
  debugEnabled: boolean;
  selectedAssetId: string;
  selectedGroup: (typeof SCRAPBOOK_VISUAL_GROUPS)[number];
  selectedAsset?: ScrapbookVisualAsset;
  filteredAssets: ScrapbookVisualAsset[];
  highlightEnabled: boolean;
  setHighlightEnabled: (enabled: boolean) => void;
  mobilePreview: boolean;
  setMobilePreview: (enabled: boolean) => void;
  setSelectedAssetId: (assetId: string) => void;
  setSelectedGroup: (group: (typeof SCRAPBOOK_VISUAL_GROUPS)[number]) => void;
  updateFloatingField: (field: FloatingField, value: string | boolean) => void;
  updateFloatingMobileField: (field: FloatingMobileField, value: string | boolean) => void;
  updateComponentField: (field: ComponentField, value: string | boolean) => void;
  updateComponentMobileField: (field: ComponentMobileField, value: string | boolean) => void;
  copyConfig: () => Promise<void>;
  copySelectedAssetConfig: () => Promise<void>;
  importConfigText: string;
  importState: "idle" | "applied" | "failed";
  setImportConfigText: (value: string) => void;
  applyImportedConfig: () => void;
  clearLocalConfig: () => void;
  resetSelectedAsset: () => void;
  copyState: "idle" | "copied" | "failed";
};

type StoredVisualConfig = {
  floatingAssets: ScrapbookFloatingAsset[];
  componentAssets: ScrapbookComponentAsset[];
};

const ScrapbookDecorContext = createContext<DecorContextValue | null>(null);

const toCssValue = (value?: string) => value ?? "auto";
const normalizeString = (value: string) => (value.trim() === "" ? undefined : value);
const numberField = (value: number) => String(value);
export const safePaperSize = (value?: string) => {
  const normalized = value?.trim();

  if (!normalized || normalized === "auto") {
    return "auto";
  }

  const numericValue = Number(normalized.replace("px", ""));

  if (Number.isFinite(numericValue) && numericValue <= 2) {
    return "auto";
  }

  return normalized;
};

const defaultFloatingAssetsById = new Map(scrapbookFloatingAssets.map((asset) => [asset.id, asset]));
const defaultComponentAssetsById = new Map(scrapbookComponentAssets.map((asset) => [asset.id, asset]));
const LOCAL_CONFIG_STORAGE_KEY = "scrapbook-visual-config";
const paperAssetsWithSizedDefaults = new Set(["heroPaper", "summaryPaper", "aiSummaryPaper", "closingPaper"]);

const parsePixelValue = (value?: string) => {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)px$/);

  return match ? Number(match[1]) : null;
};

const isFixedPixelSize = (value?: string) => {
  const parsed = parsePixelValue(value);

  return parsed !== null && parsed > 2;
};

const hasBrokenPaperOffset = (asset: ScrapbookComponentAsset) => {
  const offsets = [
    parsePixelValue(asset.paperTop),
    parsePixelValue(asset.paperLeft),
    parsePixelValue(asset.paperRight),
    parsePixelValue(asset.paperBottom)
  ];

  return offsets.some((value) => value !== null && Math.abs(value) >= 300);
};

export const restoreSizedPaperDefaults = (asset: ScrapbookComponentAsset): ScrapbookComponentAsset => {
  if (!paperAssetsWithSizedDefaults.has(asset.id)) {
    return asset;
  }

  const defaultAsset = defaultComponentAssetsById.get(asset.id);

  if (!defaultAsset) {
    return asset;
  }

  const hasCollapsedPaperSize =
    !asset.paperWidth || asset.paperWidth === "auto" || !asset.paperHeight || asset.paperHeight === "auto";
  const hasOldFixedSizing = isFixedPixelSize(asset.paperWidth) || isFixedPixelSize(asset.paperHeight);
  const needsReset = hasCollapsedPaperSize || hasOldFixedSizing || hasBrokenPaperOffset(asset);

  if (!needsReset) {
    return asset;
  }

  return {
    ...asset,
    backgroundSize: defaultAsset.backgroundSize,
    backgroundPositionX: defaultAsset.backgroundPositionX,
    backgroundPositionY: defaultAsset.backgroundPositionY,
    paperTop: defaultAsset.paperTop,
    paperLeft: defaultAsset.paperLeft,
    paperRight: defaultAsset.paperRight,
    paperBottom: defaultAsset.paperBottom,
    paperWidth: defaultAsset.paperWidth,
    paperHeight: defaultAsset.paperHeight
  };
};

const parseVisualConfig = (payload: unknown): StoredVisualConfig | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const nextConfig = payload as Partial<StoredVisualConfig>;

  if (!Array.isArray(nextConfig.floatingAssets) || !Array.isArray(nextConfig.componentAssets)) {
    return null;
  }

  return {
    floatingAssets: nextConfig.floatingAssets,
    componentAssets: nextConfig.componentAssets
  };
};

const mergeAssetList = <T extends ScrapbookVisualAsset>(defaultAssets: T[], incomingAssets: T[]) => {
  const incomingById = new Map(incomingAssets.map((asset) => [asset.id, asset]));
  const defaultIds = new Set(defaultAssets.map((asset) => asset.id));
  const mergedDefaults = defaultAssets.map((asset) => ({ ...asset, ...incomingById.get(asset.id) }));
  const customAssets = incomingAssets.filter((asset) => !defaultIds.has(asset.id));

  return [...mergedDefaults, ...customAssets] as T[];
};

const mergeVisualConfig = (config: StoredVisualConfig): StoredVisualConfig => ({
  floatingAssets: mergeAssetList(scrapbookFloatingAssets, config.floatingAssets),
  componentAssets: mergeAssetList(scrapbookComponentAssets, config.componentAssets).map(restoreSizedPaperDefaults)
});

const readLocalVisualConfig = (debugEnabled: boolean): { config: StoredVisualConfig | null; raw: string } => {
  if (!debugEnabled || typeof window === "undefined") {
    return { config: null, raw: "" };
  }

  const rawConfig = window.localStorage.getItem(LOCAL_CONFIG_STORAGE_KEY) ?? "";

  if (!rawConfig) {
    return { config: null, raw: "" };
  }

  try {
    const parsedConfig = parseVisualConfig(JSON.parse(rawConfig));

    return { config: parsedConfig ? mergeVisualConfig(parsedConfig) : null, raw: rawConfig };
  } catch {
    window.localStorage.removeItem(LOCAL_CONFIG_STORAGE_KEY);
    return { config: null, raw: "" };
  }
};

const toFloatingAssetStyle = (asset: ScrapbookFloatingAsset) =>
  ({
    "--asset-top": toCssValue(asset.top),
    "--asset-left": toCssValue(asset.left),
    "--asset-right": toCssValue(asset.right),
    "--asset-bottom": toCssValue(asset.bottom),
    "--asset-width": asset.width,
    "--asset-rotate": `${asset.rotate}deg`,
    "--asset-opacity": String(asset.opacity),
    "--asset-z-index": String(asset.zIndex),
    "--asset-mobile-top": toCssValue(asset.mobile?.top ?? asset.top),
    "--asset-mobile-left": toCssValue(asset.mobile?.left ?? asset.left),
    "--asset-mobile-right": toCssValue(asset.mobile?.right ?? asset.right),
    "--asset-mobile-bottom": toCssValue(asset.mobile?.bottom ?? asset.bottom),
    "--asset-mobile-width": asset.mobile?.width ?? asset.width,
    "--asset-mobile-rotate": `${asset.mobile?.rotate ?? asset.rotate}deg`,
    "--asset-mobile-opacity": String(asset.mobile?.opacity ?? asset.opacity),
    "--asset-mobile-z-index": String(asset.mobile?.zIndex ?? asset.zIndex)
  }) as CSSProperties;

const toComponentAssetStyle = (asset: ScrapbookComponentAsset) => {
  const hasFixedPaperWidth = safePaperSize(asset.paperWidth) !== "auto";
  const hasFixedPaperHeight = safePaperSize(asset.paperHeight) !== "auto";
  const mobilePaperWidth = asset.mobile?.paperWidth ?? asset.paperWidth;
  const mobilePaperHeight = asset.mobile?.paperHeight ?? asset.paperHeight;
  const hasFixedMobilePaperWidth = safePaperSize(mobilePaperWidth) !== "auto";
  const hasFixedMobilePaperHeight = safePaperSize(mobilePaperHeight) !== "auto";

  return {
    "--component-asset-image": asset.visible ? `url(${asset.src})` : "none",
    "--component-asset-bg-size": asset.backgroundSize,
    "--component-asset-bg-position-x": asset.backgroundPositionX,
    "--component-asset-bg-position-y": asset.backgroundPositionY,
    "--component-asset-opacity": String(asset.visible ? asset.opacity : 0),
    "--component-asset-paper-top": asset.paperTop ?? "0",
    "--component-asset-paper-left": asset.paperLeft ?? "0",
    "--component-asset-paper-right": hasFixedPaperWidth ? "auto" : asset.paperRight,
    "--component-asset-paper-bottom": hasFixedPaperHeight ? "auto" : asset.paperBottom,
    "--component-asset-paper-width": safePaperSize(asset.paperWidth),
    "--component-asset-paper-height": safePaperSize(asset.paperHeight),
    "--component-asset-width": asset.width ?? "auto",
    "--component-asset-max-width": asset.maxWidth ?? "none",
    "--component-asset-rotate": `${asset.rotate ?? 0}deg`,
    "--component-asset-z-index": String(asset.zIndex ?? "auto"),
    "--component-asset-padding-top": asset.paddingTop,
    "--component-asset-padding-right": asset.paddingRight,
    "--component-asset-padding-bottom": asset.paddingBottom,
    "--component-asset-padding-left": asset.paddingLeft,
    "--component-asset-min-height": asset.minHeight ?? "auto",
    "--component-asset-mobile-image": asset.mobile?.visible === false ? "none" : asset.visible ? `url(${asset.src})` : "none",
    "--component-asset-mobile-bg-size": asset.mobile?.backgroundSize ?? asset.backgroundSize,
    "--component-asset-mobile-bg-position-x": asset.mobile?.backgroundPositionX ?? asset.backgroundPositionX,
    "--component-asset-mobile-bg-position-y": asset.mobile?.backgroundPositionY ?? asset.backgroundPositionY,
    "--component-asset-mobile-opacity": String(asset.mobile?.visible === false ? 0 : asset.mobile?.opacity ?? asset.opacity),
    "--component-asset-mobile-paper-top": asset.mobile?.paperTop ?? asset.paperTop ?? "0",
    "--component-asset-mobile-paper-left": asset.mobile?.paperLeft ?? asset.paperLeft ?? "0",
    "--component-asset-mobile-paper-right": hasFixedMobilePaperWidth
      ? "auto"
      : (asset.mobile?.paperRight ?? asset.paperRight),
    "--component-asset-mobile-paper-bottom": hasFixedMobilePaperHeight
      ? "auto"
      : (asset.mobile?.paperBottom ?? asset.paperBottom),
    "--component-asset-mobile-paper-width": safePaperSize(asset.mobile?.paperWidth ?? asset.paperWidth),
    "--component-asset-mobile-paper-height": safePaperSize(asset.mobile?.paperHeight ?? asset.paperHeight),
    "--component-asset-mobile-width": asset.mobile?.width ?? asset.width ?? "auto",
    "--component-asset-mobile-max-width": asset.mobile?.maxWidth ?? asset.maxWidth ?? "none",
    "--component-asset-mobile-rotate": `${asset.mobile?.rotate ?? asset.rotate ?? 0}deg`,
    "--component-asset-mobile-z-index": String(asset.mobile?.zIndex ?? asset.zIndex ?? "auto"),
    "--component-asset-mobile-padding-top": asset.mobile?.paddingTop ?? asset.paddingTop,
    "--component-asset-mobile-padding-right": asset.mobile?.paddingRight ?? asset.paddingRight,
    "--component-asset-mobile-padding-bottom": asset.mobile?.paddingBottom ?? asset.paddingBottom,
    "--component-asset-mobile-padding-left": asset.mobile?.paddingLeft ?? asset.paddingLeft,
    "--component-asset-mobile-min-height": asset.mobile?.minHeight ?? asset.minHeight ?? "auto"
  } as CSSProperties;
};

const useDecorContext = () => {
  const value = useContext(ScrapbookDecorContext);

  if (!value) {
    throw new Error("Scrapbook decor components must be used inside ScrapbookDecorProvider.");
  }

  return value;
};

const isFloatingAsset = (asset: ScrapbookVisualAsset | undefined): asset is ScrapbookFloatingAsset => asset?.type === "floating";
const isComponentAsset = (asset: ScrapbookVisualAsset | undefined): asset is ScrapbookComponentAsset => asset?.type === "component";

export const ScrapbookDecorProvider = ({ children, debugEnabled }: ProviderProps) => {
  const [floatingAssets, setFloatingAssets] = useState<ScrapbookFloatingAsset[]>(
    () => readLocalVisualConfig(debugEnabled).config?.floatingAssets ?? scrapbookFloatingAssets
  );
  const [componentAssets, setComponentAssets] = useState<ScrapbookComponentAsset[]>(
    () => readLocalVisualConfig(debugEnabled).config?.componentAssets ?? scrapbookComponentAssets
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string>(scrapbookVisualAssets[0]?.id ?? "");
  const [selectedGroup, setSelectedGroup] = useState<(typeof SCRAPBOOK_VISUAL_GROUPS)[number]>("All");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [importConfigText, setImportConfigText] = useState(() => readLocalVisualConfig(debugEnabled).raw);
  const [importState, setImportState] = useState<"idle" | "applied" | "failed">("idle");
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  const [mobilePreview, setMobilePreview] = useState(debugEnabled);

  const allAssets = useMemo(() => [...floatingAssets, ...componentAssets], [floatingAssets, componentAssets]);

  const filteredAssets = useMemo(
    () => allAssets.filter((asset) => selectedGroup === "All" || asset.group === selectedGroup),
    [allAssets, selectedGroup]
  );

  const selectedAsset = useMemo(() => {
    const selectedFromGroup = filteredAssets.find((asset) => asset.id === selectedAssetId);

    if (selectedFromGroup) {
      return selectedFromGroup;
    }

    return filteredAssets[0] ?? allAssets[0];
  }, [allAssets, filteredAssets, selectedAssetId]);

  const applyConfigPayload = (payload: unknown) => {
    const nextConfig = parseVisualConfig(payload);

    if (!nextConfig) {
      return false;
    }

    const mergedConfig = mergeVisualConfig(nextConfig);

    setFloatingAssets(mergedConfig.floatingAssets);
    setComponentAssets(mergedConfig.componentAssets);
    setSelectedAssetId((current) => {
      const allIds = new Set([
        ...mergedConfig.floatingAssets.map((asset) => asset.id),
        ...mergedConfig.componentAssets.map((asset) => asset.id)
      ]);

      return allIds.has(current)
        ? current
        : (mergedConfig.floatingAssets[0]?.id ?? mergedConfig.componentAssets[0]?.id ?? "");
    });

    return true;
  };

  const applyImportedConfig = () => {
    try {
      const parsedConfig = JSON.parse(importConfigText);

      if (!applyConfigPayload(parsedConfig)) {
        throw new Error("Invalid scrapbook config.");
      }

      window.localStorage.setItem(LOCAL_CONFIG_STORAGE_KEY, JSON.stringify(parsedConfig, null, 2));
      setImportState("applied");
      window.setTimeout(() => setImportState("idle"), 1800);
    } catch {
      setImportState("failed");
      window.setTimeout(() => setImportState("idle"), 1800);
    }
  };

  const clearLocalConfig = () => {
    window.localStorage.removeItem(LOCAL_CONFIG_STORAGE_KEY);
    setFloatingAssets(scrapbookFloatingAssets);
    setComponentAssets(scrapbookComponentAssets);
    setImportConfigText("");
    setImportState("idle");
    setSelectedAssetId(scrapbookVisualAssets[0]?.id ?? "");
  };

  useEffect(() => {
    if (!debugEnabled) {
      return;
    }

    window.localStorage.setItem(
      LOCAL_CONFIG_STORAGE_KEY,
      JSON.stringify(
        {
          floatingAssets,
          componentAssets
        },
        null,
        2
      )
    );
  }, [componentAssets, debugEnabled, floatingAssets]);

  const updateFloatingAsset = (assetId: string, updater: (asset: ScrapbookFloatingAsset) => ScrapbookFloatingAsset) => {
    setFloatingAssets((current) => current.map((asset) => (asset.id === assetId ? updater(asset) : asset)));
  };

  const updateComponentAsset = (assetId: string, updater: (asset: ScrapbookComponentAsset) => ScrapbookComponentAsset) => {
    setComponentAssets((current) => current.map((asset) => (asset.id === assetId ? updater(asset) : asset)));
  };

  const updateFloatingField = (field: FloatingField, value: string | boolean) => {
    if (!isFloatingAsset(selectedAsset)) {
      return;
    }

    updateFloatingAsset(selectedAsset.id, (asset) => {
      if (field === "visible" || field === "hideOnMobile") {
        return { ...asset, [field]: Boolean(value) };
      }

      if (field === "anchor") {
        return { ...asset, anchor: value as ScrapbookDecorAnchor };
      }

      if (field === "rotate" || field === "opacity" || field === "zIndex") {
        return { ...asset, [field]: value === "" ? 0 : Number(value) };
      }

      return { ...asset, [field]: normalizeString(String(value)) };
    });
  };

  const updateFloatingMobileField = (field: FloatingMobileField, value: string | boolean) => {
    if (!isFloatingAsset(selectedAsset)) {
      return;
    }

    updateFloatingAsset(selectedAsset.id, (asset) => {
      const currentMobile = asset.mobile ?? {};

      if (field === "visible") {
        return { ...asset, mobile: { ...currentMobile, visible: Boolean(value) } };
      }

      if (field === "rotate" || field === "opacity" || field === "zIndex") {
        return {
          ...asset,
          mobile: { ...currentMobile, [field]: value === "" ? undefined : Number(value) }
        };
      }

      return {
        ...asset,
        mobile: { ...currentMobile, [field]: normalizeString(String(value)) }
      };
    });
  };

  const updateComponentField = (field: ComponentField, value: string | boolean) => {
    if (!isComponentAsset(selectedAsset)) {
      return;
    }

    updateComponentAsset(selectedAsset.id, (asset) => {
      if (field === "visible") {
        return { ...asset, visible: Boolean(value) };
      }

      if (field === "opacity" || field === "rotate" || field === "zIndex") {
        return { ...asset, [field]: value === "" ? 0 : Number(value) };
      }

      return { ...asset, [field]: normalizeString(String(value)) };
    });
  };

  const updateComponentMobileField = (field: ComponentMobileField, value: string | boolean) => {
    if (!isComponentAsset(selectedAsset)) {
      return;
    }

    updateComponentAsset(selectedAsset.id, (asset) => {
      const currentMobile = asset.mobile ?? {};

      if (field === "visible") {
        return { ...asset, mobile: { ...currentMobile, visible: Boolean(value) } };
      }

      if (field === "opacity" || field === "rotate" || field === "zIndex") {
        return {
          ...asset,
          mobile: { ...currentMobile, [field]: value === "" ? undefined : Number(value) }
        };
      }

      return {
        ...asset,
        mobile: { ...currentMobile, [field]: normalizeString(String(value)) }
      };
    });
  };

  const withCopyState = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  const copyConfig = async () =>
    withCopyState(
      JSON.stringify(
        {
          floatingAssets,
          componentAssets
        },
        null,
        2
      )
    );

  const copySelectedAssetConfig = async () => {
    if (!selectedAsset) {
      return;
    }

    await withCopyState(JSON.stringify(selectedAsset, null, 2));
  };

  const resetSelectedAsset = () => {
    if (!selectedAsset) {
      return;
    }

    if (selectedAsset.type === "floating") {
      const defaultAsset = defaultFloatingAssetsById.get(selectedAsset.id);

      if (defaultAsset) {
        updateFloatingAsset(selectedAsset.id, () => ({ ...defaultAsset }));
      }

      return;
    }

    const defaultAsset = defaultComponentAssetsById.get(selectedAsset.id);

    if (defaultAsset) {
      updateComponentAsset(selectedAsset.id, () => ({ ...defaultAsset }));
    }
  };

  return (
    <ScrapbookDecorContext.Provider
      value={{
        floatingAssets,
        componentAssets,
        allAssets,
        debugEnabled,
        selectedAssetId,
        selectedGroup,
        selectedAsset,
        filteredAssets,
        highlightEnabled,
        setHighlightEnabled,
        mobilePreview,
        setMobilePreview,
        setSelectedAssetId,
        setSelectedGroup,
        updateFloatingField,
        updateFloatingMobileField,
        updateComponentField,
        updateComponentMobileField,
        copyConfig,
        copySelectedAssetConfig,
        importConfigText,
        importState,
        setImportConfigText,
        applyImportedConfig,
        clearLocalConfig,
        resetSelectedAsset,
        copyState
      }}
    >
      {children}
    </ScrapbookDecorContext.Provider>
  );
};

export const ScrapbookDecorLayer = ({ anchor }: LayerProps) => {
  const { floatingAssets, selectedAssetId, highlightEnabled, debugEnabled } = useDecorContext();
  const anchorAssets = floatingAssets.filter((asset) => asset.visible && asset.anchor === anchor);

  if (anchorAssets.length === 0) {
    return null;
  }

  return (
    <div className={styles.paperDecorLayer} aria-hidden="true" data-anchor={anchor}>
      {anchorAssets.map((asset) => {
        const className =
          asset.kind === "note"
            ? `${styles.paperDecorAsset} ${styles.paperDecorNote}`
            : styles.paperDecorAsset;

        return (
          <div
            key={asset.id}
            className={className}
            style={toFloatingAssetStyle(asset)}
            data-hide-on-mobile={asset.hideOnMobile}
            data-mobile-visible={asset.mobile?.visible ?? true}
            data-asset-id={asset.id}
            data-selected={debugEnabled && highlightEnabled && asset.id === selectedAssetId ? "true" : undefined}
          >
            {asset.kind === "note" ? (
              <div className={styles.paperDecorNoteInner} style={{ backgroundImage: `url(${asset.src})` }}>
                {asset.content}
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.src} alt="" className={styles.paperDecorImage} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const ScrapbookComponentFrame = ({ assetId, children, id, className, contentClassName, as }: FrameProps) => {
  const { componentAssets, selectedAssetId, highlightEnabled, debugEnabled } = useDecorContext();
  const asset = componentAssets.find((item) => item.id === assetId);
  const Tag = (as ?? "div") as ElementType;

  if (!asset) {
    return (
      <Tag id={id} className={className}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      id={id}
      className={`${styles.componentAssetFrame} ${className ?? ""}`.trim()}
      style={toComponentAssetStyle(asset)}
      data-component-group={asset.group}
      data-component-asset-id={asset.id}
      data-selected={debugEnabled && highlightEnabled && asset.id === selectedAssetId ? "true" : undefined}
    >
      <span className={styles.componentAssetPaperLayer} aria-hidden="true" />
      <div className={`${styles.componentAssetContent} ${contentClassName ?? ""}`.trim()}>{children}</div>
      <span className={styles.componentAssetOverlayLayer} aria-hidden="true" />
    </Tag>
  );
};

export const ScrapbookDecorDebugPanel = () => {
  const {
    allAssets,
    debugEnabled,
    selectedAsset,
    selectedGroup,
    filteredAssets,
    highlightEnabled,
    setHighlightEnabled,
    mobilePreview,
    setMobilePreview,
    setSelectedAssetId,
    setSelectedGroup,
    updateFloatingField,
    updateFloatingMobileField,
    updateComponentField,
    updateComponentMobileField,
    copyConfig,
    copySelectedAssetConfig,
    importConfigText,
    importState,
    setImportConfigText,
    applyImportedConfig,
    clearLocalConfig,
    resetSelectedAsset,
    copyState
  } = useDecorContext();

  const [isCollapsed, setIsCollapsed] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 919px)").matches
  );

  const computedStyle = useMemo(() => {
    if (selectedAsset?.type === "floating") {
      return toFloatingAssetStyle(selectedAsset);
    }

    if (selectedAsset?.type === "component") {
      return toComponentAssetStyle(selectedAsset);
    }

    return {} as CSSProperties;
  }, [selectedAsset]);

  useEffect(() => {
    if (!debugEnabled) {
      return;
    }

    document.body.setAttribute("data-scrapbook-debug-active", "");

    return () => {
      document.body.removeAttribute("data-scrapbook-debug-active");
    };
  }, [debugEnabled]);

  useEffect(() => {
    if (!debugEnabled) {
      return;
    }

    if (mobilePreview) {
      document.body.setAttribute("data-scrapbook-mobile-preview", "");
    } else {
      document.body.removeAttribute("data-scrapbook-mobile-preview");
    }

    return () => {
      document.body.removeAttribute("data-scrapbook-mobile-preview");
    };
  }, [debugEnabled, mobilePreview]);

  if (!debugEnabled || !selectedAsset) {
    return null;
  }

  const panel = (
    <aside className={styles.assetDebugPanel}>
      <div className={styles.assetDebugPanelBody}>
        <div className={styles.assetDebugHeader}>
          <strong>Asset Debug</strong>
        <div className={styles.assetDebugHeaderActions}>
          <button type="button" className={styles.assetDebugCopyButton} onClick={copyConfig}>
            Copy config
          </button>
          <button
            type="button"
            className={styles.assetDebugCloseButton}
            onClick={() => setIsCollapsed(true)}
            aria-label="Close debug panel"
          >
            ×
          </button>
        </div>
      </div>

      <div className={styles.assetDebugActions}>
        <button type="button" className={styles.assetDebugCopyButton} onClick={copySelectedAssetConfig}>
          Copy asset
        </button>
        <button type="button" className={styles.assetDebugCopyButton} onClick={resetSelectedAsset}>
          Reset asset
        </button>
      </div>

      <div className={styles.assetDebugToggles}>
        <label>
          <input
            type="checkbox"
            checked={highlightEnabled}
            onChange={(event) => setHighlightEnabled(event.target.checked)}
          />
          <span>Highlight selected</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={mobilePreview}
            onChange={(event) => setMobilePreview(event.target.checked)}
          />
          <span>Mobile preview</span>
        </label>
      </div>

      <details className={styles.assetDebugImport}>
        <summary>Paste config</summary>
        <textarea
          value={importConfigText}
          onChange={(event) => setImportConfigText(event.target.value)}
          placeholder="Paste full Copy config JSON here"
          rows={5}
        />
        <div className={styles.assetDebugActions}>
          <button type="button" className={styles.assetDebugCopyButton} onClick={applyImportedConfig}>
            Apply config
          </button>
          <button type="button" className={styles.assetDebugCopyButton} onClick={clearLocalConfig}>
            Reset local
          </button>
        </div>
        <span className={styles.assetDebugStatus}>
          {importState === "applied" ? "Config applied" : importState === "failed" ? "Invalid JSON/config" : "Saved locally in this browser"}
        </span>
      </details>

      <label className={styles.assetDebugField}>
        <span>Group</span>
        <select
          value={selectedGroup}
          onChange={(event) => {
            const nextGroup = event.target.value as (typeof SCRAPBOOK_VISUAL_GROUPS)[number];
            const nextFilteredAssets = allAssets.filter((asset) => nextGroup === "All" || asset.group === nextGroup);

            setSelectedGroup(nextGroup);
            setSelectedAssetId(nextFilteredAssets[0]?.id ?? "");
          }}
        >
          {SCRAPBOOK_VISUAL_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.assetDebugField}>
        <span>Asset</span>
        <select value={selectedAsset.id} onChange={(event) => setSelectedAssetId(event.target.value)}>
          {filteredAssets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.label}
            </option>
          ))}
        </select>
      </label>

      <details className={styles.assetDebugComputed}>
        <summary>Computed values ({selectedAsset.type})</summary>
        <pre className={styles.assetDebugComputedCode}>{JSON.stringify(computedStyle, null, 2)}</pre>
      </details>

      {selectedAsset.type === "floating" ? (
        <>
          <label className={styles.assetDebugField}>
            <span>Anchor</span>
            <select value={selectedAsset.anchor} onChange={(event) => updateFloatingField("anchor", event.target.value)}>
              {SCRAPBOOK_DECOR_ANCHORS.map((anchor) => (
                <option key={anchor} value={anchor}>
                  {anchor}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.assetDebugGrid}>
            <label className={styles.assetDebugField}>
              <span>top</span>
              <input value={selectedAsset.top ?? ""} onChange={(event) => updateFloatingField("top", event.target.value)} />
            </label>
            <label className={styles.assetDebugField}>
              <span>left</span>
              <input value={selectedAsset.left ?? ""} onChange={(event) => updateFloatingField("left", event.target.value)} />
            </label>
            <label className={styles.assetDebugField}>
              <span>right</span>
              <input value={selectedAsset.right ?? ""} onChange={(event) => updateFloatingField("right", event.target.value)} />
            </label>
            <label className={styles.assetDebugField}>
              <span>bottom</span>
              <input
                value={selectedAsset.bottom ?? ""}
                onChange={(event) => updateFloatingField("bottom", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>width</span>
              <input value={selectedAsset.width} onChange={(event) => updateFloatingField("width", event.target.value)} />
            </label>
            <label className={styles.assetDebugField}>
              <span>rotate</span>
              <input
                type="number"
                value={numberField(selectedAsset.rotate)}
                onChange={(event) => updateFloatingField("rotate", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>opacity</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={numberField(selectedAsset.opacity)}
                onChange={(event) => updateFloatingField("opacity", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>zIndex</span>
              <input
                type="number"
                value={numberField(selectedAsset.zIndex)}
                onChange={(event) => updateFloatingField("zIndex", event.target.value)}
              />
            </label>
          </div>

          <div className={styles.assetDebugToggles}>
            <label>
              <input
                type="checkbox"
                checked={selectedAsset.visible}
                onChange={(event) => updateFloatingField("visible", event.target.checked)}
              />
              <span>visible</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={selectedAsset.hideOnMobile}
                onChange={(event) => updateFloatingField("hideOnMobile", event.target.checked)}
              />
              <span>hideOnMobile</span>
            </label>
          </div>

          <div className={styles.assetDebugMobileSection}>
            <strong>Mobile overrides</strong>
            <div className={styles.assetDebugGrid}>
              <label className={styles.assetDebugField}>
                <span>mobileTop</span>
                <input
                  value={selectedAsset.mobile?.top ?? ""}
                  onChange={(event) => updateFloatingMobileField("top", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobileLeft</span>
                <input
                  value={selectedAsset.mobile?.left ?? ""}
                  onChange={(event) => updateFloatingMobileField("left", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobileRight</span>
                <input
                  value={selectedAsset.mobile?.right ?? ""}
                  onChange={(event) => updateFloatingMobileField("right", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobileBottom</span>
                <input
                  value={selectedAsset.mobile?.bottom ?? ""}
                  onChange={(event) => updateFloatingMobileField("bottom", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobileWidth</span>
                <input
                  value={selectedAsset.mobile?.width ?? ""}
                  onChange={(event) => updateFloatingMobileField("width", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobileRotate</span>
                <input
                  type="number"
                  value={selectedAsset.mobile?.rotate ?? ""}
                  onChange={(event) => updateFloatingMobileField("rotate", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobileOpacity</span>
                <input
                  type="number"
                  step="0.05"
                  value={selectedAsset.mobile?.opacity ?? ""}
                  onChange={(event) => updateFloatingMobileField("opacity", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobileZIndex</span>
                <input
                  type="number"
                  value={selectedAsset.mobile?.zIndex ?? ""}
                  onChange={(event) => updateFloatingMobileField("zIndex", event.target.value)}
                />
              </label>
            </div>
            <label className={styles.assetDebugToggleSingle}>
              <input
                type="checkbox"
                checked={selectedAsset.mobile?.visible ?? true}
                onChange={(event) => updateFloatingMobileField("visible", event.target.checked)}
              />
              <span>mobileVisible</span>
            </label>
          </div>
        </>
      ) : (
        <>
          <div className={styles.assetDebugGrid}>
            <label className={styles.assetDebugField}>
              <span>backgroundSize</span>
              <input
                value={selectedAsset.backgroundSize}
                onChange={(event) => updateComponentField("backgroundSize", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>positionX</span>
              <input
                value={selectedAsset.backgroundPositionX}
                onChange={(event) => updateComponentField("backgroundPositionX", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>positionY</span>
              <input
                value={selectedAsset.backgroundPositionY}
                onChange={(event) => updateComponentField("backgroundPositionY", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>opacity</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={numberField(selectedAsset.opacity)}
                onChange={(event) => updateComponentField("opacity", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>paperTop</span>
              <input
                value={selectedAsset.paperTop ?? ""}
                onChange={(event) => updateComponentField("paperTop", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>paperLeft</span>
              <input
                value={selectedAsset.paperLeft ?? ""}
                onChange={(event) => updateComponentField("paperLeft", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>paperRight</span>
              <input
                value={selectedAsset.paperRight ?? ""}
                onChange={(event) => updateComponentField("paperRight", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>paperBottom</span>
              <input
                value={selectedAsset.paperBottom ?? ""}
                onChange={(event) => updateComponentField("paperBottom", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>paperWidth</span>
              <input
                value={selectedAsset.paperWidth ?? ""}
                onChange={(event) => updateComponentField("paperWidth", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>paperHeight</span>
              <input
                value={selectedAsset.paperHeight ?? ""}
                onChange={(event) => updateComponentField("paperHeight", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>width</span>
              <input
                value={selectedAsset.width ?? ""}
                onChange={(event) => updateComponentField("width", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>maxWidth</span>
              <input
                value={selectedAsset.maxWidth ?? ""}
                onChange={(event) => updateComponentField("maxWidth", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>rotate</span>
              <input
                type="number"
                step="0.1"
                value={selectedAsset.rotate ?? ""}
                onChange={(event) => updateComponentField("rotate", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>zIndex</span>
              <input
                type="number"
                value={selectedAsset.zIndex ?? ""}
                onChange={(event) => updateComponentField("zIndex", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>paddingTop</span>
              <input
                value={selectedAsset.paddingTop}
                onChange={(event) => updateComponentField("paddingTop", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>paddingRight</span>
              <input
                value={selectedAsset.paddingRight}
                onChange={(event) => updateComponentField("paddingRight", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>paddingBottom</span>
              <input
                value={selectedAsset.paddingBottom}
                onChange={(event) => updateComponentField("paddingBottom", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>paddingLeft</span>
              <input
                value={selectedAsset.paddingLeft}
                onChange={(event) => updateComponentField("paddingLeft", event.target.value)}
              />
            </label>
            <label className={styles.assetDebugField}>
              <span>minHeight</span>
              <input
                value={selectedAsset.minHeight ?? ""}
                onChange={(event) => updateComponentField("minHeight", event.target.value)}
              />
            </label>
          </div>

          <div className={styles.assetDebugToggles}>
            <label>
              <input
                type="checkbox"
                checked={selectedAsset.visible}
                onChange={(event) => updateComponentField("visible", event.target.checked)}
              />
              <span>visible</span>
            </label>
          </div>

          <div className={styles.assetDebugMobileSection}>
            <strong>Mobile overrides</strong>
            <div className={styles.assetDebugGrid}>
              <label className={styles.assetDebugField}>
                <span>mobileSize</span>
                <input
                  value={selectedAsset.mobile?.backgroundSize ?? ""}
                  onChange={(event) => updateComponentMobileField("backgroundSize", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobilePosX</span>
                <input
                  value={selectedAsset.mobile?.backgroundPositionX ?? ""}
                  onChange={(event) => updateComponentMobileField("backgroundPositionX", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobilePosY</span>
                <input
                  value={selectedAsset.mobile?.backgroundPositionY ?? ""}
                  onChange={(event) => updateComponentMobileField("backgroundPositionY", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobileOpacity</span>
                <input
                  type="number"
                  step="0.05"
                  value={selectedAsset.mobile?.opacity ?? ""}
                  onChange={(event) => updateComponentMobileField("opacity", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobilePaperTop</span>
                <input
                  value={selectedAsset.mobile?.paperTop ?? ""}
                  onChange={(event) => updateComponentMobileField("paperTop", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobilePaperLeft</span>
                <input
                  value={selectedAsset.mobile?.paperLeft ?? ""}
                  onChange={(event) => updateComponentMobileField("paperLeft", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobilePaperRight</span>
                <input
                  value={selectedAsset.mobile?.paperRight ?? ""}
                  onChange={(event) => updateComponentMobileField("paperRight", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobilePaperBottom</span>
                <input
                  value={selectedAsset.mobile?.paperBottom ?? ""}
                  onChange={(event) => updateComponentMobileField("paperBottom", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobilePaperWidth</span>
                <input
                  value={selectedAsset.mobile?.paperWidth ?? ""}
                  onChange={(event) => updateComponentMobileField("paperWidth", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobilePaperHeight</span>
                <input
                  value={selectedAsset.mobile?.paperHeight ?? ""}
                  onChange={(event) => updateComponentMobileField("paperHeight", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobileWidth</span>
                <input
                  value={selectedAsset.mobile?.width ?? ""}
                  onChange={(event) => updateComponentMobileField("width", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobileMaxWidth</span>
                <input
                  value={selectedAsset.mobile?.maxWidth ?? ""}
                  onChange={(event) => updateComponentMobileField("maxWidth", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobileRotate</span>
                <input
                  type="number"
                  step="0.1"
                  value={selectedAsset.mobile?.rotate ?? ""}
                  onChange={(event) => updateComponentMobileField("rotate", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobileZIndex</span>
                <input
                  type="number"
                  value={selectedAsset.mobile?.zIndex ?? ""}
                  onChange={(event) => updateComponentMobileField("zIndex", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobilePadTop</span>
                <input
                  value={selectedAsset.mobile?.paddingTop ?? ""}
                  onChange={(event) => updateComponentMobileField("paddingTop", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobilePadRight</span>
                <input
                  value={selectedAsset.mobile?.paddingRight ?? ""}
                  onChange={(event) => updateComponentMobileField("paddingRight", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobilePadBottom</span>
                <input
                  value={selectedAsset.mobile?.paddingBottom ?? ""}
                  onChange={(event) => updateComponentMobileField("paddingBottom", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobilePadLeft</span>
                <input
                  value={selectedAsset.mobile?.paddingLeft ?? ""}
                  onChange={(event) => updateComponentMobileField("paddingLeft", event.target.value)}
                />
              </label>
              <label className={styles.assetDebugField}>
                <span>mobileMinHeight</span>
                <input
                  value={selectedAsset.mobile?.minHeight ?? ""}
                  onChange={(event) => updateComponentMobileField("minHeight", event.target.value)}
                />
              </label>
            </div>
            <label className={styles.assetDebugToggleSingle}>
              <input
                type="checkbox"
                checked={selectedAsset.mobile?.visible ?? true}
                onChange={(event) => updateComponentMobileField("visible", event.target.checked)}
              />
              <span>mobileVisible</span>
            </label>
          </div>
        </>
      )}

      <div className={styles.assetDebugStatus}>
        {copyState === "copied" ? "Config copied" : copyState === "failed" ? "Copy failed" : "Live preview enabled"}
      </div>
      </div>
    </aside>
  );

  const floatingButton = (
    <button
      type="button"
      className={styles.assetDebugFloatingButton}
      onClick={() => setIsCollapsed(false)}
      aria-label="Open debug panel"
    >
      Debug
    </button>
  );

  const content = isCollapsed ? floatingButton : panel;

  if (typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
};
