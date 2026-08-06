import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CardMediaAsset } from "@/lib/cards/types";
import { MemoryPhoto } from "./memory-photo";

const asset: CardMediaAsset = {
  id: "memory-1",
  cardId: "card-1",
  slot: "memory-a",
  publicUrl: "/photo.jpg",
  storagePath: "cards/card-1/photo.jpg",
  fileName: "photo.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 1024,
  captionTitle: "Кадрированный момент",
  captionSubtitle: "",
  cropX: 82,
  cropY: 34,
  cropZoom: 1.4,
  createdAt: "2026-08-06T00:00:00.000Z",
  updatedAt: "2026-08-06T00:00:00.000Z"
};

describe("MemoryPhoto", () => {
  it("keeps the reversible crop inside a dedicated clipping viewport", () => {
    const { container } = render(<MemoryPhoto asset={asset} />);
    const image = screen.getByRole("img", { name: "Кадрированный момент" });
    const viewport = container.querySelector("[data-memory-photo-viewport]");

    expect(viewport).toContainElement(image);
    expect(image).toHaveStyle({
      objectPosition: "82% 34%",
      transform: "scale(1.4)",
      transformOrigin: "82% 34%"
    });
  });
});
