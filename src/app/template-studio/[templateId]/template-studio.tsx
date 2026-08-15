"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  universalMessageScenarios,
  universalTemplateFixtures,
  type UniversalMessageScenario
} from "@/lib/templates/fixtures";
import {
  universalTemplateBlockOrder,
  validateTemplateProfile,
  type NormalizedRect,
  type TemplateAssetRef,
  type TemplateDecorLayer,
  type TemplateFontToken,
  type UniversalTemplateFixtureId
} from "@/lib/templates/profile";
import {
  getUniversalMessageLayoutRule,
  getUniversalMessageScenarioForPhotoCount
} from "@/lib/templates/layout-presets";
import {
  getUniversalPhotoFramePreset,
  universalPhotoFramePresetIds,
  type UniversalPhotoFramePresetId
} from "@/lib/templates/photo-frame-presets";
import {
  getUniversalSectionUnderlayPreset,
  universalSectionUnderlayPresetIds,
  type UniversalSectionUnderlayPresetId
} from "@/lib/templates/section-underlays";
import { getUniversalTextCardPreset } from "@/lib/templates/text-card-presets";
import {
  createTemplateStudioDecorLayer,
  createTemplateStudioDraft,
  getTemplateStudioStorageKey,
  listTemplateProfileAssets,
  parseTemplateStudioImport,
  replaceTemplateProfileAsset,
  templateStudioFormats,
  templateStudioSurfaces,
  templateStudioViewports,
  validateTemplateStudioDraft,
  type TemplateStudioDraft,
  type TemplateStudioFormat,
  type TemplateStudioSurface,
  type TemplateStudioViewport
} from "@/lib/templates/studio";
import { TemplatePreview, type TemplateStudioTextMode } from "./template-preview";
import styles from "./template-studio.module.css";

type TemplateStudioProps = {
  initialDraft: TemplateStudioDraft;
  registeredTemplateOptions: ReadonlyArray<{ id: string; label: string }>;
};

type ImportStatus = { tone: "neutral" | "success" | "error"; message: string };

const inspectionTemplateOptions = [
  { id: "universal-sandbox", label: "Universal sandbox" },
  { id: "paper-birthday", label: "Paper — инспекция без миграции" },
  { id: "route-adventure", label: "Route — инспекция без миграции" }
] as const;

const formatLabels: Record<TemplateStudioFormat, string> = { web: "Web", story: "Story", post: "Post", a4: "A4" };
const surfaceLabels: Record<TemplateStudioSurface, string> = { private: "Private", public: "Public" };
const viewportLabels: Record<TemplateStudioViewport, string> = { desktop: "Desktop", mobile: "Mobile" };
const decorVisibilityLabels = { desktop: "Desktop", mobile: "Mobile", export: "Экспорт" } as const;
const decorAnchorLabels: Record<TemplateDecorLayer["anchor"], string> = {
  templateRoot: "Вся открытка",
  hero: "Шапка",
  summary: "Главное поздравление",
  qualities: "За что тебя ценят",
  messages: "Поздравления",
  memories: "Моменты",
  quotes: "Лучшие фразы",
  closing: "Подвал"
};

const decorPlacementPresets = [
  { id: "page-top-left", label: "Страница · левый верх", anchor: "templateRoot", rect: { x: 0.02, y: 0.01, width: 0.22, height: 0.08 } },
  { id: "page-top-right", label: "Страница · правый верх", anchor: "templateRoot", rect: { x: 0.76, y: 0.01, width: 0.22, height: 0.08 } },
  { id: "hero-left", label: "Шапка · слева", anchor: "hero", rect: { x: 0.02, y: 0.06, width: 0.24, height: 0.82 } },
  { id: "hero-right", label: "Шапка · справа", anchor: "hero", rect: { x: 0.74, y: 0.06, width: 0.24, height: 0.82 } }
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  anchor: TemplateDecorLayer["anchor"];
  rect: NormalizedRect;
}>;

const clone = <T,>(value: T): T => structuredClone(value);

const downloadJson = (filename: string, value: unknown) => {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
};

const formatBytes = (bytes: number | null) => {
  if (bytes === null) return "измеряется…";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
};

function Segmented<T extends string>({
  label,
  value,
  values,
  labels,
  onChange
}: {
  label: string;
  value: T;
  values: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return <fieldset className={styles.segmentedField}><legend>{label}</legend><div className={styles.segmented}>
    {values.map((entry) => <button key={entry} type="button" aria-pressed={value === entry} onClick={() => onChange(entry)}>{labels[entry]}</button>)}
  </div></fieldset>;
}

function RectEditor({
  label,
  value,
  step,
  allowOverflow = false,
  onChange
}: {
  label: string;
  value: NormalizedRect;
  step: number;
  allowOverflow?: boolean;
  onChange: (value: NormalizedRect) => void;
}) {
  return <fieldset className={styles.rectEditor}><legend>{label}</legend><div className={styles.fieldGrid}>
    {(["x", "y", "width", "height"] as const).map((key) => {
      const minimum = allowOverflow && (key === "x" || key === "y") ? -1 : 0;
      return <label key={key}><span>{key}</span><input
      type="number"
      min={minimum}
      max="1"
      step={step}
      value={value[key]}
      onChange={(event) => onChange({ ...value, [key]: Number(event.target.value) })}
      onKeyDown={(event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        const direction = event.key === "ArrowUp" ? 1 : -1;
        const nextValue = Math.min(1, Math.max(minimum, Number((value[key] + direction * step).toFixed(3))));
        onChange({ ...value, [key]: nextValue });
      }}
    /></label>;
    })}
  </div></fieldset>;
}

export function TemplateStudio({ initialDraft, registeredTemplateOptions }: TemplateStudioProps) {
  const draftStorageKey = useMemo(() => getTemplateStudioStorageKey(initialDraft), [initialDraft]);
  const [draft, setDraft] = useState(initialDraft);
  const [ready, setReady] = useState(false);
  const [fixtureId, setFixtureId] = useState<UniversalTemplateFixtureId>(initialDraft.profile.demo.fixture);
  const [scenario, setScenario] = useState<UniversalMessageScenario>("landscape-trio");
  const [surface, setSurface] = useState<TemplateStudioSurface>("private");
  const [viewport, setViewport] = useState<TemplateStudioViewport>("desktop");
  const [format, setFormat] = useState<TemplateStudioFormat>("web");
  const [photoCount, setPhotoCount] = useState<0 | 1 | 2 | 3>(3);
  const [longName, setLongName] = useState(false);
  const [textMode, setTextMode] = useState<TemplateStudioTextMode>("default");
  const [optionalBlocks, setOptionalBlocks] = useState(true);
  const [longCaptions, setLongCaptions] = useState(false);
  const [showRouteReference, setShowRouteReference] = useState(false);
  const [selectedDecorIndex, setSelectedDecorIndex] = useState(0);
  const [decorUploadPending, setDecorUploadPending] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>({ tone: "neutral", message: "Черновик сохраняется локально после первого изменения." });
  const [assetNetworkBytes, setAssetNetworkBytes] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const hydratedStorageKey = useRef<string | null>(null);
  const validation = useMemo(() => validateTemplateStudioDraft(draft), [draft]);
  const profileValidation = useMemo(() => validateTemplateProfile(draft.profile), [draft.profile]);
  const assets = useMemo(() => listTemplateProfileAssets(draft.profile), [draft.profile]);
  const selectedAsset = assets.find((entry) => entry.path === draft.inspector.selectedAssetPath) ?? assets[0];
  const inspectorVariant = format === "web" ? viewport : "export";
  const variant = draft.inspector.variants[inspectorVariant];
  const frame = draft.profile.assets.photoFrames[draft.inspector.selectedFrame];
  const framePreset = getUniversalPhotoFramePreset(frame.preset);
  const selectedTextCardMatch = /^assets\.(qualityCards|quoteCards)\.(\d+)\.asset$/.exec(selectedAsset.path);
  const selectedTextCard = selectedTextCardMatch
    ? draft.profile.assets[selectedTextCardMatch[1] as "qualityCards" | "quoteCards"][Number(selectedTextCardMatch[2])]
    : null;
  const selectedGreetingCardMatch = /^assets\.greetingCards\.(\d+)\.asset$/.exec(selectedAsset.path);
  const selectedGreetingCard = selectedGreetingCardMatch
    ? draft.profile.assets.greetingCards[Number(selectedGreetingCardMatch[1])]
    : null;
  const selectedGreetingCardNumber = selectedGreetingCardMatch ? Number(selectedGreetingCardMatch[1]) + 1 : null;
  const selectedGreetingCardPreset = selectedGreetingCard ? getUniversalSectionUnderlayPreset(selectedGreetingCard.preset) : null;
  const selectedUnderlay = draft.profile.assets.sections[draft.inspector.selectedBlock];
  const selectedUnderlayPreset = selectedUnderlay ? getUniversalSectionUnderlayPreset(selectedUnderlay.preset) : null;
  const resolvedDecorIndex = Math.min(selectedDecorIndex, Math.max(0, draft.profile.assets.decor.length - 1));
  const selectedDecorLayer = draft.profile.assets.decor[resolvedDecorIndex];
  const templateOptions = [...inspectionTemplateOptions, ...registeredTemplateOptions];
  const currentTemplateListed = templateOptions.some((option) => option.id === draft.profile.id);
  const routeReferenceUrl = `/internal/template-baseline?template=route-adventure&surface=${surface}&scenario=${scenario}`;

  useEffect(() => {
    let cancelled = false;
    hydratedStorageKey.current = null;
    const stored = window.localStorage.getItem(draftStorageKey);
    queueMicrotask(() => {
      if (cancelled) return;
      setReady(false);
      setDraft(initialDraft);
      if (stored) {
        const result = parseTemplateStudioImport(stored, initialDraft);
        if (result.ok) {
          setDraft(result.draft);
          setImportStatus({ tone: "success", message: "Локальный черновик восстановлен." });
        } else {
          setImportStatus({ tone: "error", message: "Локальный черновик повреждён и не был применён." });
        }
      } else {
        setImportStatus({ tone: "neutral", message: "Загружена актуальная исходная конфигурация." });
      }
      hydratedStorageKey.current = draftStorageKey;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [draftStorageKey, initialDraft]);

  useEffect(() => {
    if (!ready || hydratedStorageKey.current !== draftStorageKey) return;
    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [draft, draftStorageKey, ready]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedAsset) return;
    fetch(selectedAsset.asset.src, { method: "HEAD" })
      .then((response) => Number(response.headers.get("content-length")))
      .then((bytes) => { if (!cancelled) setAssetNetworkBytes(Number.isFinite(bytes) && bytes > 0 ? bytes : 0); })
      .catch(() => { if (!cancelled) setAssetNetworkBytes(0); });
    return () => { cancelled = true; };
  }, [selectedAsset]);

  const updateDraft = (updater: (next: TemplateStudioDraft) => void) => {
    setDraft((current) => {
      const next = clone(current);
      updater(next);
      return next;
    });
  };

  const updateVariant = (updater: (next: typeof variant) => void) => updateDraft((next) => updater(next.inspector.variants[inspectorVariant]));
  const updateSelectedAsset = (assetValue: TemplateAssetRef) => setDraft((current) => ({
    ...current,
    profile: replaceTemplateProfileAsset(current.profile, selectedAsset.path, assetValue)
  }));
  const updateFont = (key: keyof typeof draft.profile.typography, patch: Partial<TemplateFontToken>) => updateDraft((next) => {
    next.profile.typography[key] = { ...next.profile.typography[key], ...patch };
  });
  const updateDecorLayer = (updater: (layer: TemplateDecorLayer) => void) => updateDraft((next) => {
    next.profile.assets.decor = next.profile.assets.decor.map((layer, index) => {
      if (index !== resolvedDecorIndex) return layer;
      const updated = clone(layer);
      updater(updated);
      return updated;
    });
  });
  const addDecorLayer = () => {
    const nextIndex = draft.profile.assets.decor.length;
    updateDraft((next) => {
      const layer = createTemplateStudioDecorLayer(next.profile, selectedAsset.asset, next.inspector.selectedBlock);
      next.profile.assets.decor = [...next.profile.assets.decor, layer];
      next.inspector.selectedAssetPath = `assets.decor.${nextIndex}.asset`;
    });
    setSelectedDecorIndex(nextIndex);
  };
  const removeDecorLayer = () => {
    if (!selectedDecorLayer) return;
    updateDraft((next) => {
      next.profile.assets.decor = next.profile.assets.decor.filter((_, index) => index !== resolvedDecorIndex);
      next.inspector.selectedAssetPath = "assets.page";
    });
    setSelectedDecorIndex(Math.max(0, resolvedDecorIndex - 1));
  };
  const uploadDecorAsset = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setDecorUploadPending(true);
    setImportStatus({ tone: "neutral", message: "Загружаем декоративный ассет…" });
    try {
      const form = new FormData();
      form.set("templateId", draft.profile.id);
      form.set("file", file);
      const response = await fetch("/api/internal/template-studio/decor", { method: "POST", body: form });
      const payload = await response.json() as { asset?: TemplateAssetRef; message?: string };
      if (!response.ok || !payload.asset) throw new Error(payload.message ?? "Не удалось загрузить ассет.");

      const nextIndex = draft.profile.assets.decor.length;
      updateDraft((next) => {
        const layer = createTemplateStudioDecorLayer(next.profile, payload.asset as TemplateAssetRef, next.inspector.selectedBlock);
        next.profile.assets.decor = [...next.profile.assets.decor, layer];
        next.inspector.selectedAssetPath = `assets.decor.${nextIndex}.asset`;
      });
      setSelectedDecorIndex(nextIndex);
      setImportStatus({ tone: "success", message: "Ассет загружен и добавлен как декоративный слой." });
    } catch (error) {
      setImportStatus({ tone: "error", message: error instanceof Error ? error.message : "Не удалось загрузить ассет." });
    } finally {
      setDecorUploadPending(false);
    }
  };

  const selectScenario = (value: UniversalMessageScenario) => {
    setScenario(value);
    setPhotoCount(getUniversalMessageLayoutRule(draft.profile.layoutPreset, value).photoCount);
  };

  const selectPhotoCount = (count: 0 | 1 | 2 | 3) => {
    setPhotoCount(count);
    setScenario(getUniversalMessageScenarioForPhotoCount(draft.profile.layoutPreset, count, scenario));
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = parseTemplateStudioImport(await file.text(), draft);
    if (!result.ok) {
      setImportStatus({ tone: "error", message: result.issues.slice(0, 3).map((issue) => `${issue.path || "JSON"}: ${issue.message}`).join(" · ") });
      return;
    }
    setDraft(result.draft);
    setImportStatus({ tone: "success", message: `Импортирован ${file.name}.` });
  };

  const copyProfile = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(draft.profile, null, 2));
      setImportStatus({ tone: "success", message: "Валидный фрагмент TemplateProfile скопирован." });
    } catch {
      setImportStatus({ tone: "error", message: "Буфер обмена недоступен. Используйте экспорт JSON." });
    }
  };

  const resetDraft = () => {
    if (!window.confirm("Сбросить локальные настройки этого черновика?")) return;
    const next = createTemplateStudioDraft(initialDraft.profile);
    setDraft(next);
    window.localStorage.removeItem(draftStorageKey);
    setImportStatus({ tone: "neutral", message: "Черновик сброшен к исходной конфигурации." });
  };

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><span className={styles.headerKicker}>Development only · universal-v1</span><h1>Ателье шаблонов</h1><p>Единые fixtures, поверхности, экспорты и безопасная настройка декларативного профиля.</p></div>
      <div className={styles.headerActions}>
        <button type="button" className={styles.secondaryButton} onClick={() => fileInput.current?.click()}>Импортировать</button>
        <button type="button" className={styles.secondaryButton} onClick={() => downloadJson(`${draft.profile.id}.studio.json`, draft)}>Экспорт JSON</button>
        <button type="button" className={styles.primaryButton} disabled={!profileValidation.ok} onClick={copyProfile}>Скопировать профиль</button>
        <input ref={fileInput} className={styles.visuallyHidden} type="file" accept="application/json,.json" onChange={handleImport} />
      </div>
    </header>

    <section className={styles.matrixPanel} aria-label="Матрица состояний">
      <label><span>Шаблон</span><select value={draft.profile.id} onChange={(event) => { window.location.href = `/template-studio/${event.target.value}`; }}>
        {!currentTemplateListed ? <option value={draft.profile.id}>{draft.profile.id}</option> : null}
        {templateOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select></label>
      <label><span>Fixture</span><select value={fixtureId} onChange={(event) => setFixtureId(event.target.value as UniversalTemplateFixtureId)}>
        {Object.values(universalTemplateFixtures).map((fixture) => <option key={fixture.id} value={fixture.id}>{fixture.label}</option>)}
      </select></label>
      <label><span>Схема поздравлений</span><select value={scenario} onChange={(event) => selectScenario(event.target.value as UniversalMessageScenario)}>
        {universalMessageScenarios.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
      </select></label>
      <Segmented label="Поверхность" value={surface} values={templateStudioSurfaces} labels={surfaceLabels} onChange={setSurface} />
      <Segmented label="Viewport" value={viewport} values={templateStudioViewports} labels={viewportLabels} onChange={setViewport} />
      <Segmented label="Формат" value={format} values={templateStudioFormats} labels={formatLabels} onChange={setFormat} />
      <fieldset className={styles.segmentedField}><legend>Фотографии</legend><div className={styles.segmented}>{([0, 1, 2, 3] as const).map((count) => <button key={count} type="button" aria-pressed={photoCount === count} onClick={() => selectPhotoCount(count)}>{count}</button>)}</div></fieldset>
      <label><span>Тексты</span><select value={textMode} onChange={(event) => setTextMode(event.target.value as TemplateStudioTextMode)}><option value="short">Короткие</option><option value="default">Обычные</option><option value="limit">Предельные</option></select></label>
      <div className={styles.toggleGroup}>
        <label><input type="checkbox" checked={longName} onChange={(event) => setLongName(event.target.checked)} /><span>Имя из двух слов · до 45 знаков</span></label>
        <label><input type="checkbox" checked={optionalBlocks} onChange={(event) => setOptionalBlocks(event.target.checked)} /><span>Необязательные блоки</span></label>
        <label><input type="checkbox" checked={longCaptions} onChange={(event) => setLongCaptions(event.target.checked)} /><span>Подпись 45 знаков</span></label>
      </div>
    </section>

    <div className={styles.workspace}>
      <section className={styles.previewPanel}>
        <div className={styles.panelHeading}>
          <div><span>Предпросмотр</span><h2>{draft.profile.metadata.name}</h2></div>
          <div className={styles.previewHeadingActions}>
            <div className={styles.previewMeta}><span>{surfaceLabels[surface]}</span><span>{formatLabels[format]}</span><span>{viewportLabels[viewport]}</span><span>Структура · {draft.profile.layoutPreset}</span></div>
            <button
              type="button"
              className={styles.secondaryButton}
              aria-pressed={showRouteReference}
              onClick={() => {
                if (format !== "web") setFormat("web");
                setShowRouteReference((current) => !current);
              }}
            >
              {showRouteReference ? "Скрыть эталон" : "Сравнить с «Маршрутом»"}
            </button>
          </div>
        </div>
        <TemplatePreview draft={draft} fixtureId={fixtureId} scenario={scenario} surface={surface} viewport={viewport} format={format} photoCount={photoCount} longName={longName} textMode={textMode} optionalBlocks={optionalBlocks} longCaptions={longCaptions} />
        {showRouteReference ? <section className={styles.referencePanel} aria-label="Эталон шаблона Маршрут">
          <div className={styles.referenceHeading}>
            <div><span>Эталон раскладки</span><strong>Маршрут · {surfaceLabels[surface]} · {scenario}</strong></div>
            <a href={routeReferenceUrl} target="_blank" rel="noreferrer">Открыть отдельно</a>
          </div>
          <iframe className={styles.referenceFrame} src={routeReferenceUrl} title={`Эталон Маршрут, ${surface}, ${scenario}`} />
        </section> : null}
      </section>

      <aside className={styles.inspector}>
        <div className={styles.inspectorHeader}><div><span>Общий инспектор</span><h2>Профиль и геометрия</h2></div><span className={validation.ok ? styles.validBadge : styles.invalidBadge}>{validation.ok ? "Валидно" : `${validation.issues.length} ошибок`}</span></div>
        <p className={styles.inspectorHint}>Числовые поля работают с Arrow Up/Down и шагом сетки. Координаты нормализованы в диапазоне 0…1.</p>

        <details open><summary>Ассет блока</summary><div className={styles.detailsBody}>
          <label><span>Ассет</span><select value={selectedAsset.path} onChange={(event) => updateDraft((next) => { next.inspector.selectedAssetPath = event.target.value; })}>{assets.map((entry) => <option key={entry.path} value={entry.path}>{entry.label}</option>)}</select></label>
          <label><span>Локальный путь</span><input value={selectedAsset.asset.src} onChange={(event) => updateSelectedAsset({ ...selectedAsset.asset, src: event.target.value as `/${string}` })} /></label>
          <div className={styles.fieldGrid}><label><span>Ширина</span><input type="number" min="1" value={selectedAsset.asset.width} onChange={(event) => updateSelectedAsset({ ...selectedAsset.asset, width: Number(event.target.value) })} /></label><label><span>Высота</span><input type="number" min="1" value={selectedAsset.asset.height} onChange={(event) => updateSelectedAsset({ ...selectedAsset.asset, height: Number(event.target.value) })} /></label></div>
          <dl className={styles.assetFacts}><div><dt>Размер</dt><dd>{selectedAsset.asset.width} × {selectedAsset.asset.height}</dd></div><div><dt>Сетевой вес</dt><dd>{formatBytes(assetNetworkBytes)}</dd></div><div><dt>Decoded</dt><dd>{formatBytes(selectedAsset.asset.width * selectedAsset.asset.height * 4)}</dd></div></dl>
        </div></details>

        <details open><summary>Блок и безопасная область</summary><div className={styles.detailsBody}>
          <label><span>Вариант</span><strong>{inspectorVariant}</strong></label>
          <label><span>Семантический блок</span><select value={draft.inspector.selectedBlock} onChange={(event) => updateDraft((next) => { next.inspector.selectedBlock = event.target.value as typeof next.inspector.selectedBlock; })}>{universalTemplateBlockOrder.map((block) => <option key={block} value={block}>{block}</option>)}</select></label>
          <label><span>Шаг сетки</span><select value={draft.inspector.gridStep} onChange={(event) => updateDraft((next) => { next.inspector.gridStep = Number(event.target.value) as typeof next.inspector.gridStep; })}><option value="0.01">0.01</option><option value="0.025">0.025</option><option value="0.05">0.05</option></select></label>
          {selectedUnderlayPreset ? <div className={styles.underlayContract}>
            <span>Автоматическая safe text</span>
            <strong>{Math.round(selectedUnderlayPreset.safeArea.x * 100)}% · {Math.round(selectedUnderlayPreset.safeArea.y * 100)}% · {Math.round(selectedUnderlayPreset.safeArea.width * 100)}% · {Math.round(selectedUnderlayPreset.safeArea.height * 100)}%</strong>
            <p>Вычисляется preset-ом подложки и применяется одинаково в Web и Export.</p>
          </div> : <p className={styles.emptyUnderlayHint}>У этого блока нет художественной подложки. Используется стандартный внутренний отступ структуры.</p>}
          <RectEditor label="Контейнер" value={variant.container} step={draft.inspector.gridStep} onChange={(value) => updateVariant((next) => { next.container = value; })} />
          <label><span>Внутренний отступ</span><select value={variant.padding} onChange={(event) => updateVariant((next) => { next.padding = event.target.value as typeof next.padding; })}>{["xs", "sm", "md", "lg", "xl"].map((token) => <option key={token} value={token}>{token}</option>)}</select></label>
        </div></details>

        <details open><summary>Адаптивная подложка блока</summary><div className={styles.detailsBody}>
          {selectedUnderlay ? <>
            <label><span>Стандартный режим</span><select value={selectedUnderlay.preset} onChange={(event) => updateDraft((next) => {
              const underlay = next.profile.assets.sections[next.inspector.selectedBlock];
              if (underlay) underlay.preset = event.target.value as UniversalSectionUnderlayPresetId;
            })}>{universalSectionUnderlayPresetIds.map((id) => <option key={id} value={id}>{getUniversalSectionUnderlayPreset(id).label}</option>)}</select></label>
            <div className={styles.underlayPresetInfo}><strong>{selectedUnderlayPreset?.label}</strong><p>{selectedUnderlayPreset?.description}</p></div>
            <label><span>Прозрачность изображения</span><input type="number" min="0" max="1" step="0.05" value={selectedUnderlay.opacity ?? 1} onChange={(event) => updateDraft((next) => {
              const underlay = next.profile.assets.sections[next.inspector.selectedBlock];
              if (underlay) underlay.opacity = Number(event.target.value);
            })} /></label>
            {selectedUnderlayPreset?.rendering !== "nine-slice" ? <div className={styles.fieldGrid}>{(["x", "y"] as const).map((key) => <label key={key}><span>Фокус {key}</span><input type="number" min="0" max="1" step="0.05" value={selectedUnderlay.focalPoint?.[key] ?? 0.5} onChange={(event) => updateDraft((next) => {
              const underlay = next.profile.assets.sections[next.inspector.selectedBlock];
              if (underlay) underlay.focalPoint = { ...(underlay.focalPoint ?? { x: 0.5, y: 0.5 }), [key]: Number(event.target.value) };
            })} /></label>)}</div> : null}
          </> : <p className={styles.emptyUnderlayHint}>Сначала назначьте ассет подложки этому семантическому блоку в профиле шаблона.</p>}
        </div></details>

        <details><summary>Фон холста</summary><div className={styles.detailsBody}>
          <p className={styles.inspectorHint}>Эти параметры относятся ко всему холсту предпросмотра, а не к подложке выбранного блока.</p>
          <label><span>Масштабирование</span><select value={variant.background.fit} onChange={(event) => updateVariant((next) => { next.background.fit = event.target.value as typeof next.background.fit; })}><option value="cover">cover</option><option value="contain">contain</option></select></label>
          <div className={styles.fieldGrid}>{(["positionX", "positionY", "scale"] as const).map((key) => <label key={key}><span>{key}</span><input type="number" min={key === "scale" ? 0.5 : 0} max={key === "scale" ? 2 : 1} step={draft.inspector.gridStep} value={variant.background[key]} onChange={(event) => updateVariant((next) => { next.background[key] = Number(event.target.value); })} /></label>)}</div>
        </div></details>

        <details open><summary>Фоторамка и подпись</summary><div className={styles.detailsBody}>
          <label><span>Рамка</span><select value={draft.inspector.selectedFrame} onChange={(event) => updateDraft((next) => { next.inspector.selectedFrame = event.target.value as typeof next.inspector.selectedFrame; })}><option value="messagePortrait">messagePortrait</option><option value="messageLandscape">messageLandscape</option><option value="memory">memory</option></select></label>
          <label><span>Стандарт геометрии</span><select value={frame.preset} onChange={(event) => updateDraft((next) => { next.profile.assets.photoFrames[next.inspector.selectedFrame].preset = event.target.value as UniversalPhotoFramePresetId; })}>{universalPhotoFramePresetIds.map((id) => <option key={id} value={id}>{getUniversalPhotoFramePreset(id).label}</option>)}</select></label>
          <div className={styles.underlayPresetInfo}><strong>{framePreset.label} · {framePreset.source.width} × {framePreset.source.height}</strong><p>{framePreset.description}</p></div>
          <div className={styles.underlayContract}><span>Окно фотографии</span><strong>{Math.round(framePreset.aperture.x * 100)}% · {Math.round(framePreset.aperture.y * 100)}% · {Math.round(framePreset.aperture.width * 100)}% · {Math.round(framePreset.aperture.height * 100)}%</strong><span>Safe text подписи</span><strong>{Math.round(framePreset.captionArea.x * 100)}% · {Math.round(framePreset.captionArea.y * 100)}% · {Math.round(framePreset.captionArea.width * 100)}% · {Math.round(framePreset.captionArea.height * 100)}%</strong><p>Координаты закреплены стандартом и одинаковы для всех шаблонов. Ассеты основы и верхнего слоя выбираются выше в разделе «Ассет блока».</p></div>
        </div></details>

        <details open={Boolean(selectedTextCard || selectedGreetingCard)}><summary>Текстовая плашка</summary><div className={styles.detailsBody}>
          {selectedGreetingCardPreset ? <><div className={styles.underlayPresetInfo}><strong>Циклическая подложка поздравления · {selectedGreetingCardNumber} из 4</strong><p>Четыре ассета назначаются поздравлениям по кругу. Nine-slice сохраняет края при разной высоте карточки.</p></div><div className={styles.underlayContract}><span>Safe text поздравления</span><strong>{Math.round(selectedGreetingCardPreset.safeArea.x * 100)}% · {Math.round(selectedGreetingCardPreset.safeArea.y * 100)}% · {Math.round(selectedGreetingCardPreset.safeArea.width * 100)}% · {Math.round(selectedGreetingCardPreset.safeArea.height * 100)}%</strong><p>Автор и текст остаются внутри общей безопасной области; подложка не требует подгонки под каждое поздравление.</p></div></> : selectedTextCard ? (() => { const preset = getUniversalTextCardPreset(selectedTextCard.preset); return <><div className={styles.underlayPresetInfo}><strong>{preset.label} · {preset.source.width} × {preset.source.height}</strong><p>{preset.description}</p></div><div className={styles.underlayContract}><span>Safe text плашки</span><strong>{Math.round(preset.textArea.x * 100)}% · {Math.round(preset.textArea.y * 100)}% · {Math.round(preset.textArea.width * 100)}% · {Math.round(preset.textArea.height * 100)}%</strong><p>Область закреплена стандартом и применяется одинаково в Web и Export. Попиксельная настройка для отдельного шаблона не требуется.</p></div></>; })() : <p className={styles.emptyUnderlayHint}>Выберите подложку поздравления, карточку качества или карточку фразы, чтобы увидеть её safe text.</p>}
        </div></details>

        <details open><summary>Декоративные слои</summary><div className={styles.detailsBody}>
          <p className={styles.inspectorHint}>Декор располагается под содержимым: он может заходить на фон, но не перекрывает текст и фотографии.</p>
          <label className={styles.decorUpload}>
            <span>Новый декоративный файл</span>
            <input type="file" accept="image/png,image/webp,image/avif" disabled={decorUploadPending} onChange={uploadDecorAsset} />
            <small>{decorUploadPending ? "Загрузка…" : "PNG, WebP или AVIF до 8 МБ. Файл оптимизируется, путь и размеры заполнятся автоматически."}</small>
          </label>
          <div className={styles.decorToolbar}>
            <label><span>Слой</span><select value={selectedDecorLayer ? resolvedDecorIndex : ""} onChange={(event) => setSelectedDecorIndex(Number(event.target.value))} disabled={!selectedDecorLayer}>
              {!selectedDecorLayer ? <option value="">Слоёв пока нет</option> : null}
              {draft.profile.assets.decor.map((layer, index) => <option key={`${layer.id}-${index}`} value={index}>{layer.id}</option>)}
            </select></label>
            <button type="button" className={styles.secondaryButton} onClick={addDecorLayer}>Добавить из выбранного ассета</button>
            <button type="button" className={styles.textButton} onClick={removeDecorLayer} disabled={!selectedDecorLayer}>Удалить</button>
          </div>
          {selectedDecorLayer ? <div className={styles.decorEditor}>
            <div className={styles.fieldGrid}>
              <label><span>ID слоя</span><input value={selectedDecorLayer.id} onChange={(event) => updateDecorLayer((layer) => { layer.id = event.target.value; })} /></label>
              <label><span>Привязка</span><select value={selectedDecorLayer.anchor} onChange={(event) => updateDecorLayer((layer) => { layer.anchor = event.target.value as TemplateDecorLayer["anchor"]; })}>
                <option value="templateRoot">{decorAnchorLabels.templateRoot}</option>
                {universalTemplateBlockOrder.map((block) => <option key={block} value={block}>{decorAnchorLabels[block]}</option>)}
              </select></label>
            </div>
            <label><span>Web-путь ассета</span><input value={selectedDecorLayer.asset.src} aria-invalid={!selectedDecorLayer.asset.src.startsWith("/templates/")} onChange={(event) => updateDecorLayer((layer) => { layer.asset.src = event.target.value as `/${string}`; })} /><small>Используйте путь `/templates/…`, а не `C:\Project\…`. Проще загрузить файл полем выше.</small></label>
            <div className={styles.fieldGrid}>
              <label><span>Ширина файла</span><input type="number" min="1" value={selectedDecorLayer.asset.width} onChange={(event) => updateDecorLayer((layer) => { layer.asset.width = Number(event.target.value); })} /></label>
              <label><span>Высота файла</span><input type="number" min="1" value={selectedDecorLayer.asset.height} onChange={(event) => updateDecorLayer((layer) => { layer.asset.height = Number(event.target.value); })} /></label>
            </div>
            <label><span>Готовая позиция</span><select value="" onChange={(event) => {
              const preset = decorPlacementPresets.find((entry) => entry.id === event.target.value);
              if (preset) updateDecorLayer((layer) => { layer.anchor = preset.anchor; layer.rect = clone(preset.rect); });
            }}><option value="">Выберите позицию…</option>{decorPlacementPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
            <RectEditor label="Положение относительно привязки" value={selectedDecorLayer.rect} step={draft.inspector.gridStep} allowOverflow onChange={(value) => updateDecorLayer((layer) => { layer.rect = value; })} />
            <div className={styles.fieldGrid}>
              <label><span>Прозрачность</span><input type="number" min="0" max="1" step="0.05" value={selectedDecorLayer.opacity ?? 1} onChange={(event) => updateDecorLayer((layer) => { layer.opacity = Number(event.target.value); })} /></label>
              <label><span>Поворот, °</span><input type="number" min="-360" max="360" step="1" value={selectedDecorLayer.rotation ?? 0} onChange={(event) => updateDecorLayer((layer) => { layer.rotation = Number(event.target.value); })} /></label>
            </div>
            <fieldset className={styles.decorVisibility}><legend>Показывать</legend><div className={styles.toggleGroup}>{(["desktop", "mobile", "export"] as const).map((target) => {
              const visible = selectedDecorLayer.visibleOn?.includes(target) ?? true;
              return <label key={target}><input type="checkbox" checked={visible} onChange={(event) => updateDecorLayer((layer) => {
                const targets = new Set<"desktop" | "mobile" | "export">(layer.visibleOn ?? ["desktop", "mobile", "export"]);
                if (event.target.checked) targets.add(target); else targets.delete(target);
                layer.visibleOn = [...targets];
              })} /><span>{decorVisibilityLabels[target]}</span></label>;
            })}</div></fieldset>
          </div> : <p className={styles.emptyUnderlayHint}>Выберите подходящий ассет выше и добавьте его как декоративный слой.</p>}
        </div></details>

        <details><summary>Типографика</summary><div className={styles.detailsBody}>
          {(Object.keys(draft.profile.typography) as Array<keyof typeof draft.profile.typography>).map((key) => <fieldset className={styles.fontEditor} key={key}><legend>{key}</legend><div className={styles.fieldGrid}><label><span>Семейство</span><input value={draft.profile.typography[key].family} onChange={(event) => updateFont(key, { family: event.target.value })} /></label><label><span>Вес</span><select value={draft.profile.typography[key].weight} onChange={(event) => updateFont(key, { weight: Number(event.target.value) as TemplateFontToken["weight"] })}>{[400, 500, 600, 700, 800, 900].map((weight) => <option key={weight} value={weight}>{weight}</option>)}</select></label></div></fieldset>)}
        </div></details>

        {!validation.ok ? <div className={styles.issueList}><strong>Публикация заблокирована</strong><ul>{validation.issues.slice(0, 8).map((issue, index) => <li key={`${issue.path}-${index}`}><code>{issue.path || "draft"}</code> {issue.message}</li>)}</ul></div> : null}
        <div className={styles.inspectorFooter}><p data-tone={importStatus.tone}>{importStatus.message}</p><div><button type="button" className={styles.textButton} onClick={resetDraft}>Сбросить</button><button type="button" className={styles.primaryButton} disabled={!validation.ok} onClick={() => setImportStatus({ tone: "success", message: "Проверка пройдена: черновик можно передавать на регистрацию." })}>Проверить к регистрации</button></div></div>
      </aside>
    </div>
  </main>;
}
