import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { universalMessageScenarios } from "@/lib/templates/fixtures";
import type { CardBlockReadinessView } from "@/lib/manage/card-design-readiness";
import { universalTemplateBlockOrder } from "@/lib/templates/profile";
import { createTemplateStudioProfile } from "@/lib/templates/studio";
import { getUniversalPhotoFramePreset } from "@/lib/templates/photo-frame-presets";
import { school_classicProfile } from "@/templates/school-classic/profile";
import {
  buildUniversalFixtureViewModel,
  universalScenarioCardCount,
  universalScenarioPhotoCount
} from "@/lib/templates/view-model";
import { UniversalTemplateCard } from "./universal-card";
import { UniversalTemplateIntroPreview } from "./universal-intro-preview";

const profile = createTemplateStudioProfile("universal-renderer-test");

describe("UniversalTemplateCard", () => {
  it("uses the school-classic counter labels in the card itself", () => {
    const model = buildUniversalFixtureViewModel("teacher-classic", { templateId: school_classicProfile.id });
    model.publicPhotoCount = 3;
    const { container } = render(<UniversalTemplateCard profile={school_classicProfile} model={model} surface="public" />);

    const page = container.querySelector<HTMLElement>('[data-template-id="school-classic"]');
    const congratulations = container.querySelector<HTMLElement>('[data-hero-stat="congratulations"]');
    const photos = container.querySelector<HTMLElement>('[data-hero-stat="photos"]');

    expect(page).toHaveAttribute("data-counter-preset", "classic-label");
    expect(page?.style.getPropertyValue("--uv1-counter-congratulations-surface")).toBe("#fffaf0");
    expect(page?.style.getPropertyValue("--uv1-counter-photos-surface")).toBe("#eef3ed");
    expect(congratulations).toHaveTextContent("20 поздравлений");
    expect(photos).toHaveTextContent("3 фото");
  });

  it("renders the canonical private and public block orders", () => {
    const model = buildUniversalFixtureViewModel("full-card-default", { templateId: profile.id });
    const { container, rerender } = render(<UniversalTemplateCard profile={profile} model={model} />);

    expect(Array.from(container.querySelectorAll("[data-universal-block]"), (node) => node.getAttribute("data-universal-block"))).toEqual([
      "hero",
      "summary",
      "qualities",
      "messages",
      "memories",
      "quotes",
      "closing"
    ]);
    expect(screen.getByText(model.privateSignature)).toBeInTheDocument();

    rerender(<UniversalTemplateCard profile={profile} model={model} surface="public" />);
    expect(Array.from(container.querySelectorAll("[data-universal-block]"), (node) => node.getAttribute("data-universal-block"))).toEqual([
      "hero",
      "qualities",
      "memories",
      "quotes",
      "public-note"
    ]);
  });

  it("keeps enabled incomplete blocks in the private preview and hides only disabled blocks", () => {
    const model = buildUniversalFixtureViewModel("minimal", {
      templateId: profile.id,
      optionalBlocks: false
    });
    const blockReadiness: CardBlockReadinessView[] = universalTemplateBlockOrder.map((blockId) => ({
      blockId,
      enabled: blockId !== "memories",
      required: ["hero", "summary", "messages", "closing"].includes(blockId),
      isLocked: ["hero", "summary", "messages", "closing"].includes(blockId),
      status: blockId === "memories"
        ? "DISABLED"
        : blockId === "qualities"
          ? "ACTION_REQUIRED"
          : blockId === "quotes"
            ? "WAITING_FOR_CONTENT"
            : "READY",
      title: blockId === "qualities" ? "Качества" : blockId === "quotes" ? "Лучшие фразы" : blockId,
      description: "Описание блока",
      statusLabel: "Требует настройки",
      explanation: blockId === "qualities" ? "Качества нужно обновить." : "Нужно больше поздравлений.",
      action: blockId === "qualities"
        ? { label: "Обновить качества", target: "block-qualities", kind: "anchor" }
        : undefined
    }));
    const { container, rerender } = render(
      <UniversalTemplateCard
        profile={profile}
        model={model}
        manageToken="manage-token"
        blockReadiness={blockReadiness}
      />
    );

    expect(Array.from(container.querySelectorAll("[data-universal-block]"), (node) => node.getAttribute("data-universal-block"))).toEqual([
      "hero",
      "summary",
      "qualities",
      "messages",
      "quotes",
      "closing"
    ]);
    expect(container.querySelector('[data-universal-block="qualities"]')).toHaveAttribute("data-block-readiness", "ACTION_REQUIRED");
    expect(container.querySelector('[data-universal-block="quotes"]')).toHaveAttribute("data-block-readiness", "WAITING_FOR_CONTENT");
    expect(screen.getByRole("link", { name: "Обновить качества" })).toHaveAttribute(
      "href",
      "/manage/manage-token#block-qualities"
    );
    expect(container.querySelector('[data-universal-block="memories"]')).not.toBeInTheDocument();

    rerender(
      <UniversalTemplateCard
        profile={profile}
        model={model}
        surface="public"
        blockReadiness={blockReadiness}
      />
    );
    expect(Array.from(container.querySelectorAll("[data-universal-block]"), (node) => node.getAttribute("data-universal-block"))).toEqual([
      "hero",
      "public-note"
    ]);
  });

  it("renders standardized underlays and separate labeled artwork/text guides", () => {
    const model = buildUniversalFixtureViewModel("full-card-default", { templateId: profile.id });
    const { container } = render(<UniversalTemplateCard profile={profile} model={model} debugSafeAreas />);
    const hero = container.querySelector('[data-universal-block="hero"]') as HTMLElement;
    const pageBackground = container.querySelector<HTMLElement>('[data-template-family="universal-v1"] > span[aria-hidden="true"]');

    expect(pageBackground?.style.backgroundImage).toContain(profile.assets.page?.src);
    expect(pageBackground?.querySelector("img")).not.toBeInTheDocument();

    for (const block of ["hero", "qualities", "quotes"]) {
      const bareSection = container.querySelector(`[data-universal-block="${block}"]`) as HTMLElement;
      expect(bareSection).toHaveAttribute("data-section-presentation", "bare");
      expect(bareSection).not.toHaveAttribute("data-underlay-preset");
      expect(bareSection.querySelector("[data-underlay-preset]")).not.toBeInTheDocument();
    }
    expect(hero.querySelector(`[data-decor-layer="${profile.assets.decor[0]?.id}"]`)).toBeInTheDocument();
    const messagesUnderlay = container.querySelector('[data-universal-block="messages"] > [data-underlay-preset="adaptive-frame"]');
    expect(messagesUnderlay?.querySelector('[data-underlay-layer="standard"]')).toBeInTheDocument();
    expect(messagesUnderlay?.querySelector('[data-underlay-layer="mobile-variable-frame"]')).toHaveStyle({
      borderImageSlice: "8% 5% 8% 5% fill",
      borderImageRepeat: "stretch round"
    });
    expect(container).not.toHaveTextContent("Собрано из поздравлений");
  });

  it("keeps overflowing decor attached to its semantic section", () => {
    const overflowProfile = structuredClone(profile);
    overflowProfile.assets.decor[0] = {
      ...overflowProfile.assets.decor[0],
      anchor: "summary",
      rect: { x: -0.1, y: 0.2, width: 0.2, height: 0.3 }
    };
    const model = buildUniversalFixtureViewModel("full-card-default", { templateId: profile.id });
    const { container } = render(<UniversalTemplateCard profile={overflowProfile} model={model} viewport="desktop" />);
    const summary = container.querySelector('[data-universal-block="summary"]');

    expect(summary).toHaveAttribute("data-decor-overflow", "visible");
    expect(summary?.querySelector(`[data-decor-layer="${overflowProfile.assets.decor[0].id}"]`)).toBeInTheDocument();
  });

  it.each(universalMessageScenarios)("implements the %s greeting composition", (scenario) => {
    const model = buildUniversalFixtureViewModel("full-card-default", {
      templateId: profile.id,
      scenario,
      photoCount: universalScenarioPhotoCount[scenario],
      optionalBlocks: false
    });
    const { container } = render(<UniversalTemplateCard profile={profile} model={model} />);
    const composition = container.querySelector(`[data-message-scenario="${scenario}"]`);

    expect(composition).toBeInTheDocument();
    expect(composition).toHaveAttribute("data-message-scenario", scenario);
    expect(composition?.querySelector("[data-visible-card-count]")).toHaveAttribute("data-visible-card-count", String(universalScenarioCardCount[scenario]));
    expect(within(composition as HTMLElement).getAllByRole("article")).toHaveLength(model.contributions.length);
    expect(composition?.querySelectorAll("[data-photo-frame]")).toHaveLength(universalScenarioPhotoCount[scenario]);
  });

  it.each([
    ["grid-2", 2, 2, [0, 2, 1, 3]],
    ["carousel-1", 1, 3, [0, 1, 2, 3]],
    ["carousel-2", 2, 3, [0, 2, 4, 1]]
  ] as const)("preserves the %s geometry in the desktop no-photo carousel", (scenario, rows, columns, expectedOrder) => {
    const model = buildUniversalFixtureViewModel("full-card-default", { templateId: profile.id, scenario, photoCount: 0 });
    const { container } = render(<UniversalTemplateCard profile={profile} model={model} viewport="desktop" />);
    const carousel = container.querySelector('[data-message-layout="no-media-carousel"]');

    expect(carousel).toHaveAttribute("data-carousel-rows", String(rows));
    expect(carousel).toHaveAttribute("data-carousel-columns", String(columns));
    expect(carousel?.children).toHaveLength(model.contributions.length);
    expect(Array.from(carousel?.children ?? []).slice(0, 4).map((card) => (card as HTMLElement).style.getPropertyValue("--uv1-desktop-carousel-order"))).toEqual(expectedOrder.map(String));
    expect(screen.queryByRole("button", { name: /столбик поздравлений/ })).not.toBeInTheDocument();
  });

  it("applies normalized crop data and preserves the full 45-character caption", () => {
    const model = buildUniversalFixtureViewModel("photo-crop-stress", {
      templateId: profile.id,
      scenario: "portrait",
      photoCount: 1,
      longCaptions: true,
      optionalBlocks: false
    });
    const { container } = render(<UniversalTemplateCard profile={profile} model={model} />);
    const frame = container.querySelector("[data-photo-frame]") as HTMLElement;
    const photo = frame.querySelector(`img[alt="${model.messagePhotos[0].alt}"]`) as HTMLImageElement;
    const caption = frame.querySelector("figcaption") as HTMLElement;

    expect(photo.style.objectPosition).toBe(`${model.messagePhotos[0].crop.x * 100}% ${model.messagePhotos[0].crop.y * 100}%`);
    expect(photo.style.transform).toBe(`scale(${model.messagePhotos[0].crop.zoom})`);
    expect(photo.style.transformOrigin).toBe(`${model.messagePhotos[0].crop.x * 100}% ${model.messagePhotos[0].crop.y * 100}%`);
    expect(caption.textContent).toHaveLength(45);
    expect(caption.textContent).not.toContain("…");
    expect(caption.style.getPropertyValue("--uv1-caption-scale")).toBe(String(profile.assets.photoFrames.messagePortrait.caption.minScale));
  });

  it("keeps an ordinary photo caption above the configured minimum scale", () => {
    const model = buildUniversalFixtureViewModel("public-full", {
      templateId: profile.id,
      photoCount: 3
    });
    model.memoryPhotos[0] = {
      ...model.memoryPhotos[0],
      caption: "Самая тёплая прогулка этого года"
    };
    const { container } = render(<UniversalTemplateCard profile={profile} model={model} surface="public" />);
    const caption = Array.from(container.querySelectorAll<HTMLElement>("figcaption"))
      .find((node) => node.textContent === model.memoryPhotos[0].caption);

    expect(Number(caption?.style.getPropertyValue("--uv1-caption-scale")))
      .toBeGreaterThan(profile.assets.photoFrames.memory.caption.minScale);
  });

  it("renders hard text-capacity boundaries independently of current text height", () => {
    const model = buildUniversalFixtureViewModel("full-card-default", {
      templateId: profile.id,
      longName: true,
      longCaptions: true
    });
    const { container } = render(<UniversalTemplateCard profile={profile} model={model} debugSafeAreas />);

    expect(container.querySelector('[data-text-preset="recipient-name"]')).toHaveAttribute("data-max-lines", "2");
    expect(container.querySelector('[data-text-preset="message-card"]')).toHaveAttribute("data-max-chars", "280");
    expect(container.querySelector('[data-text-preset="photo-caption"]')).toHaveAttribute("data-max-lines", "2");
    expect(container.querySelectorAll("[data-text-boundary]").length).toBeGreaterThan(10);
  });

  it("shows an ordinary greeting through the honest layout limit and keeps overflow in the full dialog", async () => {
    const user = userEvent.setup();
    const model = buildUniversalFixtureViewModel("full-card-default", {
      templateId: profile.id,
      scenario: "grid-2",
      photoCount: 0
    });
    const withinLimit = `Тёплые слова ${"для прекрасного праздника ".repeat(12)}`.slice(0, 280);
    const overLimit = `${withinLimit} и полный текст сверх лимита`;
    model.contributions = model.contributions.map((contribution, index) => index === 0
      ? { ...contribution, message: withinLimit }
      : index === 1
        ? { ...contribution, message: overLimit }
        : contribution);

    const { container } = render(<UniversalTemplateCard profile={profile} model={model} />);
    const cards = container.querySelectorAll<HTMLElement>("[data-message-card]");
    expect(cards[0]).toHaveTextContent(withinLimit);
    expect(cards[0]).not.toHaveAttribute("data-message-over-limit");
    expect(cards[1]).toHaveAttribute("data-message-over-limit", "true");
    expect(cards[1]).not.toHaveTextContent(overLimit);

    await user.click(screen.getByRole("button", { name: "12 поздравлений" }));
    expect(within(screen.getByRole("dialog", { name: "Все поздравления" })).getByText(overLimit)).toBeVisible();
  });

  it("puts a Russian first name and patronymic on separate hero lines", () => {
    const model = buildUniversalFixtureViewModel("full-card-default", { templateId: profile.id });
    model.recipientName = "Наталья Афанасьевна";
    const { container, rerender } = render(<UniversalTemplateCard profile={profile} model={model} />);
    const heading = container.querySelector("h1") as HTMLElement;

    expect(Array.from(heading.children, (line) => line.textContent)).toEqual(["Наталья", "Афанасьевна"]);

    model.recipientName = "Анна Иванова";
    rerender(<UniversalTemplateCard profile={profile} model={model} />);
    expect(Array.from((container.querySelector("h1") as HTMLElement).children, (line) => line.textContent)).toEqual(["Анна Иванова"]);
  });

  it("uses four greeting slots and three landscape frames for landscape-trio", () => {
    const model = buildUniversalFixtureViewModel("full-card-default", {
      templateId: profile.id,
      scenario: "landscape-trio",
      photoCount: 3
    });
    const { container } = render(<UniversalTemplateCard profile={profile} model={model} />);
    const composition = container.querySelector('[data-message-scenario="landscape-trio"]') as HTMLElement;
    const frames = Array.from(composition.querySelectorAll<HTMLElement>("[data-photo-frame]"));

    expect(composition).toHaveAttribute("data-media-distribution", "distributed-trio");
    expect(composition.firstElementChild).toContainElement(frames[0]);
    expect(composition.querySelector("[data-visible-card-count]")).toHaveAttribute("data-visible-card-count", "4");
    expect((container.querySelector('[data-template-family="universal-v1"]') as HTMLElement).style.getPropertyValue("--uv1-message-trio-photo-width")).toBe("95%");
    expect(frames.map((frame) => frame.style.aspectRatio)).toEqual([
      String(getUniversalPhotoFramePreset(profile.assets.photoFrames.messageLandscape.preset).aspectRatio),
      String(getUniversalPhotoFramePreset(profile.assets.photoFrames.messageLandscape.preset).aspectRatio),
      String(getUniversalPhotoFramePreset(profile.assets.photoFrames.messageLandscape.preset).aspectRatio)
    ]);
    expect(Array.from(composition.querySelectorAll("[data-message-card]"), (card) => card.getAttribute("data-greeting-card-index"))).toEqual([
      "0", "1", "2", "3", "0", "1", "2", "3", "0", "1", "2", "3"
    ]);
  });

  it("uses the portrait frame and three greeting slots whenever one photo is selected", () => {
    const model = buildUniversalFixtureViewModel("full-card-default", {
      templateId: profile.id,
      scenario: "landscape-trio",
      photoCount: 1
    });
    const { container } = render(<UniversalTemplateCard profile={profile} model={model} />);
    const composition = container.querySelector('[data-message-scenario="portrait"]') as HTMLElement;
    const frame = composition.querySelector<HTMLElement>("[data-photo-frame]");

    expect(composition).toHaveAttribute("data-media-distribution", "single-fill");
    expect(composition.querySelector("[data-visible-card-count]")).toHaveAttribute("data-visible-card-count", "3");
    expect(frame?.style.aspectRatio).toBe(String(getUniversalPhotoFramePreset(profile.assets.photoFrames.messagePortrait.preset).aspectRatio));
  });

  it("renders the Route-compatible three-photo memory composition and all messages dialog", async () => {
    const user = userEvent.setup();
    const model = buildUniversalFixtureViewModel("full-card-default", {
      templateId: profile.id,
      scenario: "grid-2",
      photoCount: 3
    });
    const { container } = render(<UniversalTemplateCard profile={profile} model={model} viewport="mobile" />);
    const memories = container.querySelector('[data-universal-block="memories"]') as HTMLElement;

    expect(memories.querySelector('[data-memories-layout="route-strip"]')).toBeInTheDocument();
    expect(container.querySelector('[data-hero-stat="photos"]')).toHaveTextContent("6 фото");
    expect(memories.querySelector("[data-memory-photo-row]")).toHaveTextContent(model.memoryTitle);
    expect(memories).not.toHaveTextContent("Фотоистория");
    expect(memories.querySelectorAll("[data-photo-frame]")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Все поздравления" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "12 поздравлений" }));
    const dialog = screen.getByRole("dialog", { name: "Все поздравления" });
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(dialog.parentElement).toHaveAttribute("data-viewport", "mobile");
    expect(within(dialog).getAllByRole("article")).toHaveLength(model.contributions.length);
    await user.click(within(dialog).getByRole("button", { name: "Закрыть все поздравления" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "12 поздравлений" })).toHaveFocus());

    const mobileTrigger = screen.getByRole("button", { name: "Посмотреть все 12 поздравлений" });
    await user.click(mobileTrigger);
    expect(screen.getByRole("dialog", { name: "Все поздравления" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(mobileTrigger).toHaveFocus());
  });

  it.each([0, 1, 2, 3] as const)("keeps moments visible with %s greeting photos", (photoCount) => {
    const model = buildUniversalFixtureViewModel("full-card-default", {
      templateId: profile.id,
      photoCount
    });
    const { container } = render(<UniversalTemplateCard profile={profile} model={model} />);

    expect(container.querySelector('[data-universal-block="memories"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-universal-block="memories"] [data-photo-frame]')).toHaveLength(3);
  });

  it("shows footer actions for demo, private and studio contexts", () => {
    const model = buildUniversalFixtureViewModel("full-card-default", { templateId: profile.id });
    const { container, rerender } = render(<UniversalTemplateCard profile={profile} model={model} surface="public" actionContext="demo" />);

    expect(screen.getByRole("button", { name: "Создать такую же открытку" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Настроить публичную версию" })).not.toBeInTheDocument();
    const publicFooter = container.querySelector('[data-universal-block="public-note"]');
    expect(publicFooter).toHaveAttribute("data-underlay-preset", profile.assets.sections.closing?.preset);
    expect(publicFooter?.innerHTML).toContain(profile.assets.sections.closing?.asset.src);
    expect(screen.getByRole("link", { name: "Создано в Slovesto" })).toHaveAttribute("href", "/");

    rerender(<UniversalTemplateCard profile={profile} model={model} actionContext="private" />);
    expect(screen.getByRole("button", { name: "Настроить публичную версию" })).toBeInTheDocument();

    rerender(<UniversalTemplateCard profile={profile} model={model} surface="public" actionContext="studio" />);
    expect(screen.getByRole("button", { name: "Создать такую же открытку" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Настроить публичную версию" })).toBeInTheDocument();
  });

  it("links the Slovesto footer branding to the homepage and shows the tagline", () => {
    const model = buildUniversalFixtureViewModel("full-card-default", { templateId: profile.id });
    render(<UniversalTemplateCard profile={profile} model={model} />);

    expect(screen.getByRole("link", { name: "Создано в Slovesto" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Место, где слова становятся подарком")).toBeInTheDocument();
  });

  it("reveals motion-enabled sections and opens the accessible photo viewer", async () => {
    const user = userEvent.setup();
    const motionProfile = structuredClone(profile);
    motionProfile.motion = { preset: "playful", revealSections: true, photoViewer: true };
    const model = buildUniversalFixtureViewModel("full-card-default", {
      templateId: motionProfile.id,
      scenario: "landscape-trio",
      photoCount: 3
    });
    const { container } = render(<UniversalTemplateCard profile={motionProfile} model={model} viewport="mobile" />);
    const page = container.querySelector("[data-template-family=\"universal-v1\"]");
    const hero = container.querySelector("[data-universal-block=\"hero\"]");
    const trigger = screen.getAllByRole("button", { name: /Открыть фотографию:/ })[0];
    const uniquePhotoCount = new Set([...model.messagePhotos, ...model.memoryPhotos].map((photo) => photo.id)).size;

    expect(page).toHaveAttribute("data-motion-preset", "playful");
    expect(hero).toHaveAttribute("data-motion-section", "true");
    expect(hero).toHaveAttribute("data-reveal-visible", "true");

    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: model.messagePhotos[0].caption });
    expect(dialog).toHaveAttribute("data-photo-viewer");
    expect(dialog.parentElement).toHaveAttribute("data-viewport", "mobile");
    expect(within(dialog).getByText(`1 из ${uniquePhotoCount}`)).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("dialog", { name: model.messagePhotos[1].caption })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("keeps the opening preview lightweight and profile-driven", () => {
    const introProfile = { ...profile, intro: { ...profile.intro, kicker: "Открытка" } };
    const { container } = render(
      <UniversalTemplateIntroPreview profile={introProfile} recipientName="Александра" fromLabel="От команды" />
    );
    const intro = container.querySelector('[data-universal-intro="lightweight"]') as HTMLElement;

    expect(intro).toHaveAttribute("data-template-id", introProfile.id);
    expect(intro).toHaveTextContent("Александра");
    expect(intro).toHaveTextContent("Открытка");
    expect(intro).not.toHaveTextContent("Открытка для");
    expect(intro.innerHTML).toContain(introProfile.intro.mark?.src);
    expect(intro.innerHTML).not.toContain(introProfile.assets.page?.src);
    expect(intro.querySelectorAll("img")).toHaveLength(1);
  });
});
