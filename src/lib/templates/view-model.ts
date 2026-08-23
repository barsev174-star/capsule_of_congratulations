import {
  getUniversalTemplateFixture,
  type UniversalFixtureContribution,
  type UniversalFixturePhoto,
  type UniversalMessageScenario
} from "@/lib/templates/fixtures";
import type { UniversalTemplateBlockId, UniversalTemplateFixtureId } from "@/lib/templates/profile";
import {
  getUniversalMessageScenarioForPhotoCount,
  routeV1LayoutPreset
} from "@/lib/templates/layout-presets";

export type UniversalTemplateSurface = "private" | "public";

export type UniversalTemplatePhoto = UniversalFixturePhoto & {
  alt: string;
};

export type UniversalTemplateContribution = UniversalFixtureContribution & {
  avatarUrl?: string | null;
};

export type UniversalTemplateViewModel = {
  templateId: string;
  recipientName: string;
  occasion: string;
  eventDate: string | null;
  fromLabel: string;
  heroDescription: string;
  participantCount: number;
  /** Private aggregate count of unique source photos; layouts may reuse a photo in several blocks. */
  privatePhotoCount?: number | null;
  /** Public-only aggregate count; selected public photos remain a separate safe list. */
  publicPhotoCount?: number | null;
  summaryTitle: string;
  mainGreeting: string;
  mainGreetingAuthorName?: string | null;
  qualities: readonly string[];
  contributions: readonly UniversalTemplateContribution[];
  messageScenario: UniversalMessageScenario;
  messagePhotos: readonly UniversalTemplatePhoto[];
  memoryTitle: string;
  memoryDescription: string;
  memoryPhotos: readonly UniversalTemplatePhoto[];
  privateQuotes: readonly string[];
  publicQuotes: readonly string[];
  privateSignature: string;
};

export type UniversalFixtureModelOptions = {
  templateId?: string;
  scenario?: UniversalMessageScenario;
  photoCount?: 0 | 1 | 2 | 3;
  longName?: boolean;
  textMode?: "short" | "default" | "limit";
  optionalBlocks?: boolean;
  longCaptions?: boolean;
};

export const universalScenarioCardCount: Record<UniversalMessageScenario, number> = {
  "grid-2": routeV1LayoutPreset.messages["grid-2"].cardsPerPage,
  "carousel-1": routeV1LayoutPreset.messages["carousel-1"].cardsPerPage,
  "carousel-2": routeV1LayoutPreset.messages["carousel-2"].cardsPerPage,
  portrait: routeV1LayoutPreset.messages.portrait.cardsPerPage,
  "landscape-pair": routeV1LayoutPreset.messages["landscape-pair"].cardsPerPage,
  "landscape-trio": routeV1LayoutPreset.messages["landscape-trio"].cardsPerPage
};

export const universalScenarioPhotoCount: Record<UniversalMessageScenario, 0 | 1 | 2 | 3> = {
  "grid-2": 0,
  "carousel-1": 0,
  "carousel-2": 0,
  portrait: 1,
  "landscape-pair": 2,
  "landscape-trio": 3
};

const resolveQuotes = (
  fixture: ReturnType<typeof getUniversalTemplateFixture>,
  ids: readonly string[]
) => ids
  .map((id) => fixture.quoteCandidates.find((quote) => quote.id === id)?.text)
  .filter((quote): quote is string => Boolean(quote));

const withPhotoAlt = (photo: UniversalFixturePhoto, recipientName: string): UniversalTemplatePhoto => ({
  ...photo,
  alt: `Фотография для открытки ${recipientName}`
});

export const buildUniversalFixtureViewModel = (
  fixtureId: UniversalTemplateFixtureId,
  options: UniversalFixtureModelOptions = {}
): UniversalTemplateViewModel => {
  const fixture = getUniversalTemplateFixture(fixtureId);
  const stressFixture = getUniversalTemplateFixture("text-stress");
  const defaultFixture = getUniversalTemplateFixture("full-card-default");
  const fallbackPhotos = defaultFixture.photos;
  const requestedScenario = options.scenario ?? "landscape-trio";
  const photoCount = options.photoCount ?? universalScenarioPhotoCount[requestedScenario];
  const scenario = getUniversalMessageScenarioForPhotoCount("route-v1", photoCount, requestedScenario);
  const recipientName = options.longName
    ? stressFixture.recipientName
    : fixtureId === "text-stress"
      ? defaultFixture.recipientName
      : fixture.recipientName;
  const sourcePhotos = fixture.photos.length > 0 ? fixture.photos : fallbackPhotos;
  const captionOverride = options.longCaptions ? stressFixture.photos[0]?.caption : null;
  const preparePhoto = (photo: UniversalFixturePhoto) => withPhotoAlt({
    ...photo,
    caption: captionOverride ?? photo.caption
  }, recipientName);
  const messagePhotos = sourcePhotos.slice(0, photoCount).map(preparePhoto);
  const sourcePhotosById = new Map(sourcePhotos.map((photo) => [photo.id, photo]));
  const memoryPhotos = fixture.memoryPhotoIds
    .map((id) => sourcePhotosById.get(id))
    .filter((photo): photo is UniversalFixturePhoto => Boolean(photo))
    .slice(0, 3)
    .map(preparePhoto);
  const mainGreeting = options.textMode === "limit"
    ? stressFixture.mainGreeting
    : options.textMode === "short"
      ? fixture.mainGreeting.slice(0, 112)
      : fixture.mainGreeting;
  const contributions = options.textMode === "limit"
    ? stressFixture.contributions
    : fixture.contributions;
  const optionalBlocks = options.optionalBlocks ?? true;

  return {
    templateId: options.templateId ?? "universal-sandbox",
    recipientName,
    occasion: fixture.occasion,
    eventDate: fixture.eventDate,
    fromLabel: fixture.fromLabel,
    heroDescription: fixture.heroDescription ?? "Тёплые слова, яркие моменты и пожелания специально для тебя.",
    participantCount: fixture.contributions.length,
    privatePhotoCount: sourcePhotos.length,
    publicPhotoCount: null,
    summaryTitle: fixture.summaryTitle ?? "Главное о тебе",
    mainGreeting,
    mainGreetingAuthorName: fixture.mainGreetingAuthorName ?? contributions[0]?.authorName ?? null,
    qualities: optionalBlocks ? fixture.qualities : [],
    contributions,
    messageScenario: scenario,
    messagePhotos,
    memoryTitle: fixture.memoryTitle,
    memoryDescription: fixture.memoryDescription,
    memoryPhotos: optionalBlocks && memoryPhotos.length === 3 ? memoryPhotos : [],
    privateQuotes: optionalBlocks ? resolveQuotes(fixture, fixture.organizerQuoteIds) : [],
    publicQuotes: optionalBlocks ? resolveQuotes(fixture, fixture.recipientQuoteIds) : [],
    privateSignature: fixture.privateSignature
  };
};

export type UniversalRenderedBlockId = UniversalTemplateBlockId | "public-note";

export const getUniversalRenderedBlocks = (
  model: UniversalTemplateViewModel,
  surface: UniversalTemplateSurface
): UniversalRenderedBlockId[] => {
  if (surface === "public") {
    return [
      "hero",
      ...(model.qualities.length === 5 ? ["qualities" as const] : []),
      ...(model.memoryPhotos.length === 3 ? ["memories" as const] : []),
      ...(model.publicQuotes.length >= 2 ? ["quotes" as const] : []),
      "public-note"
    ];
  }

  return [
    "hero",
    "summary",
    ...(model.qualities.length === 5 ? ["qualities" as const] : []),
    "messages",
    ...(model.memoryPhotos.length === 3 ? ["memories" as const] : []),
    ...(model.privateQuotes.length >= 2 ? ["quotes" as const] : []),
    "closing"
  ];
};

export const formatUniversalEventDate = (value: string | null) => {
  if (!value) return null;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00.000Z`)).replace(" г.", "");
};
