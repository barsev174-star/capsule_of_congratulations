import { createRef } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicShareDownloadDialog } from "./public-share-download-dialog";

vi.mock("@/lib/client-telemetry", () => ({ sendClientTelemetry: vi.fn() }));

describe("PublicShareDownloadDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not start Story, Post and A4 exports just to show the dialog", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    render(
      <PublicShareDownloadDialog
        token="public-token"
        publicName="Алиса"
        trigger={createRef<HTMLButtonElement>()}
        onClose={vi.fn()}
      />
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Скачать" })).toHaveLength(3);
  });

  it("returns the selected button to Download and shows the server error", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      "Сейчас уже готовится другой файл. Повторите попытку через несколько секунд.",
      { status: 429 }
    ));

    render(
      <PublicShareDownloadDialog
        token="public-token"
        publicName="Алиса"
        trigger={createRef<HTMLButtonElement>()}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getAllByRole("button", { name: "Скачать" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Сейчас уже готовится другой файл");
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Скачать" })).toHaveLength(3));
  });
});
