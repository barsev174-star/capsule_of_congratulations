import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_noStore: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/lib/public-shares/service", () => ({
  getPublicShareDraftPreviewPresentation: vi.fn().mockResolvedValue({ model: {} })
}));
vi.mock("@/components/templates/template-card-renderer", () => ({
  TemplateCardRenderer: () => <div data-testid="draft-card" />
}));

import PublicShareDraftPreviewPage from "./page";

describe("PublicShareDraftPreviewPage", () => {
  it("shows the draft context without publication actions", async () => {
    const page = await PublicShareDraftPreviewPage({
      params: Promise.resolve({ finalSlug: "final-test" })
    });
    render(page);

    expect(screen.getByRole("link", { name: /вернуться к настройке/i })).toHaveAttribute(
      "href",
      "/gift/final-test/share"
    );
    expect(screen.getByText("Предпросмотр черновика")).toBeInTheDocument();
    expect(screen.getByText("Эта страница видна только вам")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /поделиться|скопировать ссылку|скачать/i })).not.toBeInTheDocument();
  });
});
