import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CardMediaAsset } from "@/lib/cards/types";
import { MessagesSection } from "./messages-section";

const routeAsset: CardMediaAsset = {
  id: "route-photo-1",
  cardId: "card-1",
  slot: "landscape-a",
  publicUrl: "/route-photo.jpg",
  storagePath: "route-photo.jpg",
  fileName: "route-photo.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 1,
  captionTitle: "Route crop",
  captionSubtitle: "",
  cropX: 62,
  cropY: 45,
  cropZoom: 1.4,
  createdAt: "2026-08-06T00:00:00.000Z",
  updatedAt: "2026-08-06T00:00:00.000Z"
};

describe("route greeting photo frame", () => {
  it("keeps the reversible crop inside the shared polaroid viewport", () => {
    const { container } = render(
      <MessagesSection
        contributions={[
          {
            id: "contribution-1",
            cardId: "card-1",
            authorName: "Author",
            authorRole: null,
            authorAvatarUrl: null,
            message: "Greeting",
            sortOrder: 0,
            status: "visible",
            source: "manual",
            createdAt: "2026-08-06T00:00:00.000Z",
            updatedAt: "2026-08-06T00:00:00.000Z"
          }
        ]}
        messageLayoutMode="column-media"
        messageMediaAssets={[routeAsset]}
        messageMediaLayout="landscape-pair"
        isPaperBirthday={false}
        isRouteAdventure
      />
    );

    const image = screen.getByRole("img", { name: "Route crop" });
    const viewport = image.closest("[data-memory-photo-viewport]");
    const card = image.closest("[data-route-greeting-photo-card]");

    expect(viewport).toContainElement(image);
    expect(card).toContainElement(viewport);
    expect(container.querySelectorAll("[data-memory-photo-viewport]")).toHaveLength(1);
    expect(container.querySelectorAll("[data-route-greeting-photo-card]")).toHaveLength(2);
    expect(image).toHaveStyle({
      objectPosition: "62% 45%",
      transform: "scale(1.4)",
      transformOrigin: "62% 45%"
    });
  });
});
