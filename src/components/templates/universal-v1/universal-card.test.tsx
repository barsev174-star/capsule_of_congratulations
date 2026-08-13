import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { universalMessageScenarios } from "@/lib/templates/fixtures";
import { createTemplateStudioProfile } from "@/lib/templates/studio";
import { getUniversalPhotoFramePreset } from "@/lib/templates/photo-frame-presets";
import {
  buildUniversalFixtureViewModel,
  universalScenarioCardCount,
  universalScenarioPhotoCount
} from "@/lib/templates/view-model";
import { UniversalTemplateCard } from "./universal-card";
import { UniversalTemplateIntroPreview } from "./universal-intro-preview";

const profile = createTemplateStudioProfile("universal-renderer-test");

describe("UniversalTemplateCard", () => {
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

    rerender(<UniversalTemplateCard profile={profile} model={model} surface="public" />);
    expect(Array.from(container.querySelectorAll("[data-universal-block]"), (node) => node.getAttribute("data-universal-block"))).toEqual([
      "hero",
      "qualities",
      "memories",
      "quotes",
      "public-note"
    ]);
  });

  it("renders standardized underlays and separate labeled artwork/text guides", () => {
    const model = buildUniversalFixtureViewModel("full-card-default", { templateId: profile.id });
    const { container } = render(<UniversalTemplateCard profile={profile} model={model} debugSafeAreas />);
    const hero = container.querySelector('[data-universal-block="hero"]') as HTMLElement;

    expect(hero).toHaveAttribute("data-underlay-preset", "adaptive-frame");
    const underlay = hero.querySelector<HTMLElement>('[data-underlay-preset="adaptive-frame"]');
    expect(underlay).toBeInTheDocument();
    expect(underlay?.style.borderImageSource).toContain(profile.assets.sections.hero?.asset.src);
    expect(hero).toHaveTextContent("подложка");
    expect(hero).toHaveTextContent("safe text");
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
    const renderedCardCount = model.messagePhotos.length > 0
      ? model.contributions.length
      : universalScenarioCardCount[scenario];
    expect(composition).toHaveAttribute("data-message-scenario", scenario);
    expect(composition?.querySelector("[data-visible-card-count]")).toHaveAttribute("data-visible-card-count", String(universalScenarioCardCount[scenario]));
    expect(within(composition as HTMLElement).getAllByRole("article")).toHaveLength(renderedCardCount);
    expect(composition?.querySelectorAll("[data-photo-frame]")).toHaveLength(universalScenarioPhotoCount[scenario]);
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
    expect(caption.textContent).toHaveLength(45);
    expect(caption.textContent).not.toContain("…");
  });

  it("renders hard text-capacity boundaries independently of current text height", () => {
    const model = buildUniversalFixtureViewModel("full-card-default", {
      templateId: profile.id,
      longName: true,
      longCaptions: true
    });
    const { container } = render(<UniversalTemplateCard profile={profile} model={model} debugSafeAreas />);

    expect(container.querySelector('[data-text-preset="recipient-name"]')).toHaveAttribute("data-max-lines", "2");
    expect(container.querySelector('[data-text-preset="message-card"]')).toHaveAttribute("data-max-lines", "5");
    expect(container.querySelector('[data-text-preset="photo-caption"]')).toHaveAttribute("data-max-lines", "2");
    expect(container.querySelectorAll("[data-text-boundary]").length).toBeGreaterThan(10);
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
    expect(composition.querySelector("[data-visible-card-count]")).toHaveAttribute("data-visible-card-count", "4");
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
    const { container } = render(<UniversalTemplateCard profile={profile} model={model} />);
    const memories = container.querySelector('[data-universal-block="memories"]') as HTMLElement;

    expect(memories.querySelector('[data-memories-layout="route-strip"]')).toBeInTheDocument();
    expect(memories.querySelector("[data-memory-photo-row]")).toHaveTextContent(model.memoryTitle);
    expect(memories).not.toHaveTextContent("Фотоистория");
    expect(memories.querySelectorAll("[data-photo-frame]")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Все поздравления" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "12 поздравлений" }));
    const dialog = screen.getByRole("dialog", { name: "Все поздравления" });
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(within(dialog).getAllByRole("article")).toHaveLength(model.contributions.length);
    await user.click(within(dialog).getByRole("button", { name: "Закрыть все поздравления" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
    const { rerender } = render(<UniversalTemplateCard profile={profile} model={model} surface="public" actionContext="demo" />);

    expect(screen.getByRole("button", { name: "Создать такую же открытку" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Настроить публичную версию" })).not.toBeInTheDocument();

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

  it("keeps the opening preview lightweight and profile-driven", () => {
    const { container } = render(
      <UniversalTemplateIntroPreview profile={profile} recipientName="Александра" fromLabel="От команды" />
    );
    const intro = container.querySelector('[data-universal-intro="lightweight"]') as HTMLElement;

    expect(intro).toHaveAttribute("data-template-id", profile.id);
    expect(intro).toHaveTextContent("Александра");
    expect(intro.innerHTML).toContain(profile.intro.mark?.src);
    expect(intro.innerHTML).not.toContain(profile.assets.page?.src);
    expect(intro.querySelectorAll("img")).toHaveLength(1);
  });
});
