"use client";

import { useEffect, useState } from "react";

const isTextEntryElement = (element: Element | null) => {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  return element.matches("input, textarea, select, [role='combobox'], [role='menu']");
};

export const useMobileInputActivity = () => {
  const [isInputActive, setIsInputActive] = useState(false);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    const initialViewportHeight = visualViewport?.height ?? window.innerHeight;

    const updateFromFocus = () => {
      setIsInputActive(isTextEntryElement(document.activeElement));
    };
    const updateFromViewport = () => {
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const keyboardLikelyOpen = viewportHeight < initialViewportHeight * 0.78;
      setIsInputActive(
        keyboardLikelyOpen || isTextEntryElement(document.activeElement)
      );
    };
    const handleFocusOut = () => {
      window.requestAnimationFrame(updateFromFocus);
    };

    document.addEventListener("focusin", updateFromFocus);
    document.addEventListener("focusout", handleFocusOut);
    visualViewport?.addEventListener("resize", updateFromViewport);

    return () => {
      document.removeEventListener("focusin", updateFromFocus);
      document.removeEventListener("focusout", handleFocusOut);
      visualViewport?.removeEventListener("resize", updateFromViewport);
    };
  }, []);

  return isInputActive;
};
