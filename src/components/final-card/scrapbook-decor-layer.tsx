"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  createContext,
  useContext,
  useMemo,
  useState
} from "react";
import styles from "./final-card.module.css";
import {
  SCRAPBOOK_DECOR_ANCHORS,
  SCRAPBOOK_DECOR_GROUPS,
  scrapbookDecorAssets,
  type ScrapbookDecorAnchor,
  type ScrapbookDecorAsset
} from "./scrapbook-decor-config";

type ProviderProps = {
  children: ReactNode;
  debugEnabled: boolean;
};

type LayerProps = {
  anchor: ScrapbookDecorAnchor;
};

type AssetField =
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

type MobileField = "top" | "left" | "right" | "bottom" | "width" | "rotate" | "opacity" | "zIndex" | "visible";

type DecorContextValue = {
  assets: ScrapbookDecorAsset[];
  debugEnabled: boolean;
  selectedAssetId: string;
  selectedGroup: (typeof SCRAPBOOK_DECOR_GROUPS)[number];
  selectedAsset?: ScrapbookDecorAsset;
  filteredAssets: ScrapbookDecorAsset[];
  setSelectedAssetId: (assetId: string) => void;
  setSelectedGroup: (group: (typeof SCRAPBOOK_DECOR_GROUPS)[number]) => void;
  updateField: (field: AssetField, value: string | boolean) => void;
  updateMobileField: (field: MobileField, value: string | boolean) => void;
  copyConfig: () => Promise<void>;
  copySelectedAssetConfig: () => Promise<void>;
  resetSelectedAsset: () => void;
  copyState: "idle" | "copied" | "failed";
};

const ScrapbookDecorContext = createContext<DecorContextValue | null>(null);

const toCssValue = (value?: string) => value ?? "auto";

const toAssetStyle = (asset: ScrapbookDecorAsset) =>
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

const normalizeString = (value: string) => (value.trim() === "" ? undefined : value);

const numberField = (value: number) => String(value);

const defaultAssetsById = new Map(scrapbookDecorAssets.map((asset) => [asset.id, asset]));

const useDecorContext = () => {
  const value = useContext(ScrapbookDecorContext);

  if (!value) {
    throw new Error("Scrapbook decor components must be used inside ScrapbookDecorProvider.");
  }

  return value;
};

export const ScrapbookDecorProvider = ({ children, debugEnabled }: ProviderProps) => {
  const [assets, setAssets] = useState<ScrapbookDecorAsset[]>(scrapbookDecorAssets);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(scrapbookDecorAssets[0]?.id ?? "");
  const [selectedGroup, setSelectedGroup] = useState<(typeof SCRAPBOOK_DECOR_GROUPS)[number]>("All");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const filteredAssets = useMemo(
    () => assets.filter((asset) => selectedGroup === "All" || asset.group === selectedGroup),
    [assets, selectedGroup]
  );

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? filteredAssets[0] ?? assets[0],
    [assets, filteredAssets, selectedAssetId]
  );

  const updateAsset = (assetId: string, updater: (asset: ScrapbookDecorAsset) => ScrapbookDecorAsset) => {
    setAssets((current) => current.map((asset) => (asset.id === assetId ? updater(asset) : asset)));
  };

  const updateField = (field: AssetField, value: string | boolean) => {
    if (!selectedAsset) {
      return;
    }

    updateAsset(selectedAsset.id, (asset) => {
      if (field === "visible" || field === "hideOnMobile") {
        return {
          ...asset,
          [field]: Boolean(value)
        };
      }

      if (field === "anchor") {
        return {
          ...asset,
          anchor: value as ScrapbookDecorAnchor
        };
      }

      if (field === "rotate" || field === "opacity" || field === "zIndex") {
        return {
          ...asset,
          [field]: value === "" ? 0 : Number(value)
        };
      }

      return {
        ...asset,
        [field]: normalizeString(String(value))
      };
    });
  };

  const updateMobileField = (field: MobileField, value: string | boolean) => {
    if (!selectedAsset) {
      return;
    }

    updateAsset(selectedAsset.id, (asset) => {
      const currentMobile = asset.mobile ?? {};

      if (field === "visible") {
        return {
          ...asset,
          mobile: {
            ...currentMobile,
            visible: Boolean(value)
          }
        };
      }

      if (field === "rotate" || field === "opacity" || field === "zIndex") {
        return {
          ...asset,
          mobile: {
            ...currentMobile,
            [field]: value === "" ? undefined : Number(value)
          }
        };
      }

      return {
        ...asset,
        mobile: {
          ...currentMobile,
          [field]: normalizeString(String(value))
        }
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

  const copyConfig = async () => withCopyState(JSON.stringify(assets, null, 2));

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

    const defaultAsset = defaultAssetsById.get(selectedAsset.id);

    if (!defaultAsset) {
      return;
    }

    updateAsset(selectedAsset.id, () => ({ ...defaultAsset }));
  };

  return (
    <ScrapbookDecorContext.Provider
      value={{
        assets,
        debugEnabled,
        selectedAssetId,
        selectedGroup,
        selectedAsset,
        filteredAssets,
        setSelectedAssetId,
        setSelectedGroup,
        updateField,
        updateMobileField,
        copyConfig,
        copySelectedAssetConfig,
        resetSelectedAsset,
        copyState
      }}
    >
      {children}
    </ScrapbookDecorContext.Provider>
  );
};

export const ScrapbookDecorLayer = ({ anchor }: LayerProps) => {
  const { assets } = useDecorContext();

  const anchorAssets = assets.filter((asset) => asset.visible && asset.anchor === anchor);

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
            style={toAssetStyle(asset)}
            data-hide-on-mobile={asset.hideOnMobile}
            data-mobile-visible={asset.mobile?.visible ?? true}
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

export const ScrapbookDecorDebugPanel = () => {
  const {
    debugEnabled,
    selectedAsset,
    selectedAssetId,
    selectedGroup,
    filteredAssets,
    setSelectedAssetId,
    setSelectedGroup,
    updateField,
    updateMobileField,
    copyConfig,
    copySelectedAssetConfig,
    resetSelectedAsset,
    copyState
  } = useDecorContext();

  if (!debugEnabled || !selectedAsset) {
    return null;
  }

  return (
    <aside className={styles.assetDebugPanel}>
      <div className={styles.assetDebugHeader}>
        <strong>Asset Debug</strong>
        <button type="button" className={styles.assetDebugCopyButton} onClick={copyConfig}>
          Copy config
        </button>
      </div>

      <div className={styles.assetDebugActions}>
        <button type="button" className={styles.assetDebugCopyButton} onClick={copySelectedAssetConfig}>
          Copy asset
        </button>
        <button type="button" className={styles.assetDebugCopyButton} onClick={resetSelectedAsset}>
          Reset asset
        </button>
      </div>

      <label className={styles.assetDebugField}>
        <span>Group</span>
        <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value as (typeof SCRAPBOOK_DECOR_GROUPS)[number])}>
          {SCRAPBOOK_DECOR_GROUPS.map((group) => (
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

      <label className={styles.assetDebugField}>
        <span>Anchor</span>
        <select value={selectedAsset.anchor} onChange={(event) => updateField("anchor", event.target.value)}>
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
          <input value={selectedAsset.top ?? ""} onChange={(event) => updateField("top", event.target.value)} />
        </label>
        <label className={styles.assetDebugField}>
          <span>left</span>
          <input value={selectedAsset.left ?? ""} onChange={(event) => updateField("left", event.target.value)} />
        </label>
        <label className={styles.assetDebugField}>
          <span>right</span>
          <input value={selectedAsset.right ?? ""} onChange={(event) => updateField("right", event.target.value)} />
        </label>
        <label className={styles.assetDebugField}>
          <span>bottom</span>
          <input value={selectedAsset.bottom ?? ""} onChange={(event) => updateField("bottom", event.target.value)} />
        </label>
        <label className={styles.assetDebugField}>
          <span>width</span>
          <input value={selectedAsset.width} onChange={(event) => updateField("width", event.target.value)} />
        </label>
        <label className={styles.assetDebugField}>
          <span>rotate</span>
          <input
            type="number"
            value={numberField(selectedAsset.rotate)}
            onChange={(event) => updateField("rotate", event.target.value)}
          />
        </label>
        <label className={styles.assetDebugField}>
          <span>opacity</span>
          <input
            type="number"
            step="0.05"
            value={numberField(selectedAsset.opacity)}
            onChange={(event) => updateField("opacity", event.target.value)}
          />
        </label>
        <label className={styles.assetDebugField}>
          <span>zIndex</span>
          <input
            type="number"
            value={numberField(selectedAsset.zIndex)}
            onChange={(event) => updateField("zIndex", event.target.value)}
          />
        </label>
      </div>

      <div className={styles.assetDebugToggles}>
        <label>
          <input
            type="checkbox"
            checked={selectedAsset.visible}
            onChange={(event) => updateField("visible", event.target.checked)}
          />
          <span>visible</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={selectedAsset.hideOnMobile}
            onChange={(event) => updateField("hideOnMobile", event.target.checked)}
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
              onChange={(event) => updateMobileField("top", event.target.value)}
            />
          </label>
          <label className={styles.assetDebugField}>
            <span>mobileLeft</span>
            <input
              value={selectedAsset.mobile?.left ?? ""}
              onChange={(event) => updateMobileField("left", event.target.value)}
            />
          </label>
          <label className={styles.assetDebugField}>
            <span>mobileRight</span>
            <input
              value={selectedAsset.mobile?.right ?? ""}
              onChange={(event) => updateMobileField("right", event.target.value)}
            />
          </label>
          <label className={styles.assetDebugField}>
            <span>mobileBottom</span>
            <input
              value={selectedAsset.mobile?.bottom ?? ""}
              onChange={(event) => updateMobileField("bottom", event.target.value)}
            />
          </label>
          <label className={styles.assetDebugField}>
            <span>mobileWidth</span>
            <input
              value={selectedAsset.mobile?.width ?? ""}
              onChange={(event) => updateMobileField("width", event.target.value)}
            />
          </label>
          <label className={styles.assetDebugField}>
            <span>mobileRotate</span>
            <input
              type="number"
              value={selectedAsset.mobile?.rotate ?? ""}
              onChange={(event) => updateMobileField("rotate", event.target.value)}
            />
          </label>
          <label className={styles.assetDebugField}>
            <span>mobileOpacity</span>
            <input
              type="number"
              step="0.05"
              value={selectedAsset.mobile?.opacity ?? ""}
              onChange={(event) => updateMobileField("opacity", event.target.value)}
            />
          </label>
          <label className={styles.assetDebugField}>
            <span>mobileZIndex</span>
            <input
              type="number"
              value={selectedAsset.mobile?.zIndex ?? ""}
              onChange={(event) => updateMobileField("zIndex", event.target.value)}
            />
          </label>
        </div>
        <label className={styles.assetDebugToggleSingle}>
          <input
            type="checkbox"
            checked={selectedAsset.mobile?.visible ?? true}
            onChange={(event) => updateMobileField("visible", event.target.checked)}
          />
          <span>mobileVisible</span>
        </label>
      </div>

      <div className={styles.assetDebugStatus}>
        {copyState === "copied" ? "Config copied" : copyState === "failed" ? "Copy failed" : "Live preview enabled"}
      </div>
    </aside>
  );
};
