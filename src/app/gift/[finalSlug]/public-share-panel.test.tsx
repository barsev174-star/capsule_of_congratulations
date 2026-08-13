import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CardMediaAsset } from "@/lib/cards/types";
import type { PublicCardShare, PublicCardSharePhoto, PublicShareQuality } from "@/lib/public-shares/types";
import { PublicSharePanel } from "./public-share-panel";
import { publishPublicShareAction, revokePublicShareAction, savePublicShareAction } from "./public-share-actions";

vi.mock("@/app/gift/[finalSlug]/public-share-actions", () => ({
  savePublicShareAction: vi.fn((_finalSlug: string, _prev: unknown, _formData: FormData) =>
    Promise.resolve({ ok: true, message: "Сохранено." })),
  publishPublicShareAction: vi.fn((_finalSlug: string) => Promise.resolve({ ok: true, message: "Опубликовано." })),
  revokePublicShareAction: vi.fn((_finalSlug: string) => Promise.resolve({ ok: true, message: "Отключено." }))
}));

const refreshMock = vi.fn();
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock })
}));

const FINAL_SLUG = "final-slug-1";
const PHRASES = ["Фраза альфа", "Фраза бета", "Фраза гамма", "Фраза дельта", "Фраза эпсилон"];
const QUALITIES: PublicShareQuality[] = [
  { id: "q1", text: "Доброта" },
  { id: "q2", text: "Юмор" }
];

const makeAsset = (id: string): CardMediaAsset => ({
  id,
  cardId: "card-1",
  slot: "portrait",
  publicUrl: `/photos/${id}.jpg`,
  storagePath: `cards/card-1/${id}.jpg`,
  fileName: `${id}.jpg`,
  mimeType: "image/jpeg",
  sizeBytes: 1024,
  captionTitle: "",
  captionSubtitle: "",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
});

const makeSharePhoto = (assetId: string, sortOrder: number): PublicCardSharePhoto => ({
  id: `share-photo-${assetId}`,
  publicShareId: "share-1",
  cardMediaAssetId: assetId,
  storagePath: `cards/card-1/${assetId}.jpg`,
  fileName: `${assetId}.jpg`,
  mimeType: "image/jpeg",
  sizeBytes: 1024,
  sortOrder,
  publicCaption: "",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
});

const makeShare = (status: PublicCardShare["status"]): PublicCardShare => ({
  id: "share-1",
  cardId: "card-1",
  tokenHash: "hash",
  status,
  payloadVersion: 1,
  displayName: "Именинник",
  showPublicName: true,
  headlinePreset: "GIFTED_CARD",
  showOccasion: true,
  showEventDate: true,
  showGreetingCount: true,
  showPhotoCount: true,
  publicSummary: null,
  publicQualities: QUALITIES,
  publicPhrases: PHRASES.slice(0, 3).map((text, index) => ({ id: `phrase-${index}`, text })),
  publicPhraseCandidateIds: [],
  photoConsentVersion: "v1",
  photoConsentAcceptedAt: "2024-01-01T00:00:00.000Z",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  activatedAt: status === "ACTIVE" ? "2024-01-02T00:00:00.000Z" : null,
  revision: 1,
  revokedAt: null,
  revokedBy: null
});

type PanelProps = Parameters<typeof PublicSharePanel>[0];

const baseProps = (): PanelProps => ({
  finalSlug: FINAL_SLUG,
  defaultDisplayName: "Именинник",
  share: null,
  photos: [],
  mediaAssets: [],
  phraseCandidates: PHRASES,
  publicQualities: QUALITIES,
  wasRevoked: false,
  publicSharePath: null,
  hasEventDate: true,
  requiresThreePhotos: false
});

const renderPanel = (overrides: Partial<PanelProps> = {}) =>
  render(<PublicSharePanel {...baseProps()} {...overrides} />);

const activeProps = (): PanelProps => ({
  ...baseProps(),
  share: makeShare("ACTIVE"),
  photos: [makeSharePhoto("asset-1", 0), makeSharePhoto("asset-2", 1)],
  mediaAssets: [makeAsset("asset-1"), makeAsset("asset-2"), makeAsset("asset-3"), makeAsset("asset-4")],
  publicSharePath: "/share/public-token"
});

const phraseCard = (phrase: string) => screen.getByRole("checkbox", { name: phrase });
const unselectedPhotoCards = () => screen.getAllByRole("checkbox", { name: "Фотография из открытки" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PublicSharePanel: состояния действий", () => {
  it("A: без ACTIVE share показывает предпросмотр перед публикацией и не показывает ссылку на публичную страницу", () => {
    renderPanel();

    expect(screen.getAllByRole("button", { name: "Посмотреть перед публикацией" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /публичную страницу/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /опубликованную страницу/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Создать черновик" })).toBeEnabled();
  });

  it("B: ACTIVE без несохранённых изменений — предпросмотр скрыт, есть ссылка, сохранение выключено", () => {
    renderPanel(activeProps());

    expect(screen.queryByRole("button", { name: /Посмотреть/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Открыть публичную страницу" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Сохранить изменения" })).toBeDisabled();
    expect(screen.getByText("Все изменения сохранены")).toBeInTheDocument();
  });

  it("C: ACTIVE + ввод в поле имени — «Посмотреть изменения», «Открыть опубликованную страницу», статус о неопубликованных изменениях", async () => {
    const user = userEvent.setup();
    renderPanel(activeProps());

    await user.type(screen.getByDisplayValue("Именинник"), "X");

    expect(screen.getAllByRole("button", { name: "Посмотреть изменения" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Открыть опубликованную страницу" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Есть неопубликованные изменения").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Сохранить изменения" })).toBeEnabled();
  });
});

describe("PublicSharePanel: выбор фраз", () => {
  it("присваивает номера в порядке кликов", async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();

    // Снимаем три фразы, выбранные по умолчанию
    await user.click(phraseCard(PHRASES[0]));
    await user.click(phraseCard(PHRASES[1]));
    await user.click(phraseCard(PHRASES[2]));

    // Выбираем в нестандартном порядке: гамма, альфа, дельта
    await user.click(phraseCard(PHRASES[2]));
    await user.click(phraseCard(PHRASES[0]));
    await user.click(phraseCard(PHRASES[3]));

    expect(within(phraseCard(PHRASES[2])).getByLabelText("Порядок на странице: 1")).toHaveTextContent("1");
    expect(within(phraseCard(PHRASES[0])).getByLabelText("Порядок на странице: 2")).toHaveTextContent("2");
    expect(within(phraseCard(PHRASES[3])).getByLabelText("Порядок на странице: 3")).toHaveTextContent("3");

    const hiddenValues = Array.from(container.querySelectorAll<HTMLInputElement>('input[name="phraseText"]')).map((input) => input.value);
    expect(hiddenValues).toEqual([PHRASES[2], PHRASES[0], PHRASES[3]]);
  });

  it("пересчитывает номера при снятии выбора", async () => {
    const user = userEvent.setup();
    renderPanel();

    // По умолчанию выбраны альфа(1), бета(2), гамма(3) — снимаем альфу
    await user.click(phraseCard(PHRASES[0]));

    expect(within(phraseCard(PHRASES[1])).getByLabelText("Порядок на странице: 1")).toBeInTheDocument();
    expect(within(phraseCard(PHRASES[2])).getByLabelText("Порядок на странице: 2")).toBeInTheDocument();
    expect(screen.getByText("Выбрано: 2/3")).toBeInTheDocument();
  });

  it("блокирует невыбранные карточки при лимите в 3 фразы", async () => {
    const user = userEvent.setup();
    renderPanel();

    // Три уже выбраны по умолчанию — четвёртая и пятая заблокированы
    expect(phraseCard(PHRASES[3])).toHaveAttribute("aria-disabled", "true");
    expect(phraseCard(PHRASES[4])).toHaveAttribute("aria-disabled", "true");

    await user.click(phraseCard(PHRASES[3]));
    expect(phraseCard(PHRASES[3])).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Выбрано: 3/3")).toBeInTheDocument();

    // После снятия одной — карточка разблокируется и выбирается третьей
    await user.click(phraseCard(PHRASES[0]));
    expect(phraseCard(PHRASES[3])).toHaveAttribute("aria-disabled", "false");
    await user.click(phraseCard(PHRASES[3]));
    expect(within(phraseCard(PHRASES[3])).getByLabelText("Порядок на странице: 3")).toBeInTheDocument();
  });

  it("показывает каждую выбранную фразу отдельным элементом сводки", async () => {
    const user = userEvent.setup();
    renderPanel();

    const summary = screen.getByLabelText("Что будет опубликовано");
    const items = within(summary).getAllByRole("listitem").filter((item) => PHRASES.some((phrase) => item.textContent?.includes(phrase)));
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(PHRASES[0]);
    expect(items[1]).toHaveTextContent(PHRASES[1]);
    expect(items[2]).toHaveTextContent(PHRASES[2]);

    await user.click(phraseCard(PHRASES[0]));
    const afterItems = within(summary).getAllByRole("listitem").filter((item) => PHRASES.some((phrase) => item.textContent?.includes(phrase)));
    expect(afterItems).toHaveLength(2);
    expect(afterItems[0]).toHaveTextContent(PHRASES[1]);
  });
});

describe("PublicSharePanel: выбор фото", () => {
  const photoProps = (): PanelProps => ({
    ...baseProps(),
    mediaAssets: [makeAsset("asset-1"), makeAsset("asset-2"), makeAsset("asset-3"), makeAsset("asset-4")]
  });

  it("выбирает фото кликом по карточке и нумерует в порядке кликов", async () => {
    const user = userEvent.setup();
    const { container } = renderPanel(photoProps());

    const cards = unselectedPhotoCards();
    await user.click(cards[2]);
    await user.click(cards[0]);

    expect(screen.getByRole("checkbox", { name: "Фотография из открытки, выбрана, порядок 1" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Фотография из открытки, выбрана, порядок 2" })).toBeInTheDocument();
    expect(screen.getAllByText("Выбрано фото: 2 из 3").length).toBeGreaterThan(0);

    const hiddenValues = Array.from(container.querySelectorAll<HTMLInputElement>('input[name="photoAssetId"]')).map((input) => input.value);
    expect(hiddenValues).toEqual(["asset-3", "asset-1"]);
  });

  it("пересчитывает номера фото при снятии выбора", async () => {
    const user = userEvent.setup();
    renderPanel(photoProps());

    const cards = unselectedPhotoCards();
    await user.click(cards[0]);
    await user.click(unselectedPhotoCards()[0]);
    await user.click(unselectedPhotoCards()[0]);

    // Выбраны asset-1 (1), asset-2 (2), asset-3 (3); снимаем asset-1
    await user.click(screen.getByRole("checkbox", { name: "Фотография из открытки, выбрана, порядок 1" }));

    expect(screen.getByRole("checkbox", { name: "Фотография из открытки, выбрана, порядок 2" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Фотография из открытки, выбрана, порядок 3" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Выбрано фото: 2 из 3").length).toBeGreaterThan(0);
  });

  it("блокирует невыбранные фото при лимите в 3", async () => {
    const user = userEvent.setup();
    renderPanel(photoProps());

    const cards = unselectedPhotoCards();
    await user.click(cards[0]);
    await user.click(unselectedPhotoCards()[0]);
    await user.click(unselectedPhotoCards()[0]);

    const remaining = unselectedPhotoCards();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveAttribute("aria-disabled", "true");

    await user.click(remaining[0]);
    expect(screen.getAllByText("Выбрано фото: 3 из 3").length).toBeGreaterThan(0);
    expect(unselectedPhotoCards()).toHaveLength(1);
  });

  it("ввод подписи не переключает выбор фото", async () => {
    const user = userEvent.setup();
    renderPanel(photoProps());

    await user.click(unselectedPhotoCards()[0]);
    const captionInput = screen.getAllByLabelText("Подпись к фотографии")[0];
    await user.click(captionInput);
    await user.type(captionInput, "Тёплая подпись");

    expect(screen.getByRole("checkbox", { name: "Фотография из открытки, выбрана, порядок 1" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByText("Выбрано фото: 1 из 3").length).toBeGreaterThan(0);
  });

  it("скрывает секцию согласия, пока не выбрано ни одного фото", () => {
    renderPanel(photoProps());

    expect(screen.queryByText("Разрешение на публикацию фотографий")).not.toBeInTheDocument();
  });

  it("показывает inline-ошибку и блокирует сохранение без галки согласия", async () => {
    const user = userEvent.setup();
    renderPanel(photoProps());

    await user.click(unselectedPhotoCards()[0]);

    expect(screen.getByText("Разрешение на публикацию фотографий")).toBeInTheDocument();
    expect(screen.getByText("Без подтверждения нельзя сохранить публичные фотографии.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Создать черновик" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Посмотреть перед публикацией" })[0]).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: /подтверждаю, что могу разрешить/i }));

    expect(screen.queryByText("Без подтверждения нельзя сохранить публичные фотографии.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Создать черновик" })).toBeEnabled();
  });

  it("для universal-v1 разрешает сохранить только 0 или 3 фотографии", async () => {
    const user = userEvent.setup();
    renderPanel({ ...photoProps(), requiresThreePhotos: true });

    await user.click(unselectedPhotoCards()[0]);
    await user.click(screen.getByRole("checkbox", { name: /подтверждаю, что могу разрешить/i }));

    expect(screen.getByText("Для блока «Моменты» выберите ровно три фотографии или снимите выбор со всех.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Создать черновик" })).toBeDisabled();

    await user.click(unselectedPhotoCards()[0]);
    await user.click(unselectedPhotoCards()[0]);

    expect(screen.queryByText("Для блока «Моменты» выберите ровно три фотографии или снимите выбор со всех.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Создать черновик" })).toBeEnabled();
  });
});

describe("PublicSharePanel: дата события", () => {
  it("показывает независимый переключатель только когда дата существует", async () => {
    const user = userEvent.setup();
    renderPanel();

    const toggle = screen.getByRole("checkbox", { name: "Дата события" });
    expect(toggle).toBeChecked();
    expect(within(screen.getByLabelText("Что будет опубликовано")).getByText("Дата события")).toBeInTheDocument();

    await user.click(toggle);
    expect(within(screen.getByLabelText("Что будет опубликовано")).queryByText("Дата события")).not.toBeInTheDocument();
  });

  it("не показывает переключатель без даты", () => {
    renderPanel({ hasEventDate: false });
    expect(screen.queryByRole("checkbox", { name: "Дата события" })).not.toBeInTheDocument();
  });
});

describe("PublicSharePanel: отключение публичной страницы", () => {
  it("открывает диалог, отмена закрывает его без вызова revoke", async () => {
    const user = userEvent.setup();
    renderPanel(activeProps());

    await user.click(screen.getAllByRole("button", { name: "Отключить публичную страницу" })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Отключить публичную страницу?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Оставить включённой" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(revokePublicShareAction).not.toHaveBeenCalled();
  });

  it("подтверждение вызывает revokePublicShareAction с finalSlug", async () => {
    const user = userEvent.setup();
    renderPanel(activeProps());

    await user.click(screen.getAllByRole("button", { name: "Отключить публичную страницу" })[0]);
    await user.click(screen.getByRole("button", { name: "Отключить страницу" }));

    expect(revokePublicShareAction).toHaveBeenCalledTimes(1);
    expect(revokePublicShareAction).toHaveBeenCalledWith(FINAL_SLUG);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("PublicSharePanel: DRAFT", () => {
  it("показывает кнопку публикации для черновика", () => {
    renderPanel({ ...activeProps(), share: makeShare("DRAFT") });

    expect(screen.getAllByRole("button", { name: "Опубликовать публичную страницу" })).toHaveLength(1);
    expect(publishPublicShareAction).not.toHaveBeenCalled();
  });
});

describe("PublicSharePanel: моки сохранения", () => {
  it("savePublicShareAction доступен как связанная функция для useActionState", () => {
    renderPanel();
    expect(vi.isMockFunction(savePublicShareAction)).toBe(true);
  });
});
