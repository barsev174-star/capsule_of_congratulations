import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildInvitationCopyText,
  INVITATION_SHARE_TEXT,
  INVITATION_SHARE_TITLE,
  ShareLinkButton
} from "./copy-link-button";

const joinPath = "/join/public-token";
const absoluteJoinUrl = "http://localhost:3000/join/public-token";

describe("ShareLinkButton", () => {
  const copiedValues: string[] = [];

  beforeEach(() => {
    vi.restoreAllMocks();
    copiedValues.length = 0;
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: false
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => {
        copiedValues.push((document.activeElement as HTMLTextAreaElement).value);
        return true;
      })
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined
    });
  });

  it("passes the exact safe invitation payload to Web Share", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share
    });
    render(<ShareLinkButton value={joinPath} />);

    await user.click(screen.getByRole("button", { name: "Поделиться ссылкой" }));

    expect(share).toHaveBeenCalledWith({
      title: INVITATION_SHARE_TITLE,
      text: INVITATION_SHARE_TEXT,
      url: absoluteJoinUrl
    });
    expect(INVITATION_SHARE_TEXT).toBe(
      "Собираем общую открытку 🎉\n\n" +
        "Добавьте несколько тёплых слов. Всё соберётся в один общий подарок."
    );
    expect(INVITATION_SHARE_TEXT).not.toMatch(/фото|manage|gift|получател/i);
  });

  it("does not treat a cancelled system share as an error", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError"))
    });
    render(<ShareLinkButton value={joinPath} />);

    await user.click(screen.getByRole("button", { name: "Поделиться ссылкой" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("falls back to copying the complete invitation or only the public link", async () => {
    const user = userEvent.setup();
    render(<ShareLinkButton value={joinPath} />);

    const trigger = screen.getByRole("button", { name: "Поделиться ссылкой" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Отправьте приглашение" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Скопировать приглашение" }));
    expect(copiedValues.at(-1)).toBe(buildInvitationCopyText(absoluteJoinUrl));
    expect(screen.getByRole("status")).toHaveTextContent("Приглашение скопировано");

    await user.click(screen.getByRole("button", { name: "Скопировать только ссылку" }));
    expect(copiedValues.at(-1)).toBe(absoluteJoinUrl);
    expect(screen.getByRole("status")).toHaveTextContent("Ссылка скопирована");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
