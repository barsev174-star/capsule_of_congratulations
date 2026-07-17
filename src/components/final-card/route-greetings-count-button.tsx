"use client";

import { useEffect, useRef } from "react";
import { pluralize } from "@/lib/i18n/pluralize";
import styles from "./final-card.module.css";

const getCountLabel = (count: number) =>
  `${count} ${pluralize(count, { one: "\u043f\u043e\u0437\u0434\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435", few: "\u043f\u043e\u0437\u0434\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f", many: "\u043f\u043e\u0437\u0434\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0439" })}`;

const ListIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none">
    <path d="M7 5h8M7 10h8M7 15h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M4.25 5h.01M4.25 10h.01M4.25 15h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const RouteGreetingsCountButton = ({ count }: { count: number }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const restoreFocus = (event: Event) => {
      if ((event as CustomEvent<{ source?: string }>).detail?.source !== "mobile") buttonRef.current?.focus();
    };
    window.addEventListener("route-greetings:closed", restoreFocus);
    return () => window.removeEventListener("route-greetings:closed", restoreFocus);
  }, []);

  if (count === 0) {
    return <span className={styles.routeGreetingsCountEmpty}>{"\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u043f\u043e\u0437\u0434\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0439"}</span>;
  }

  const label = getCountLabel(count);
  return (
    <button
      ref={buttonRef}
      type="button"
      className={styles.routeGreetingsCountButton}
      aria-label={`${"\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0432\u0441\u0435"} ${label}`}
      onClick={() => window.dispatchEvent(new CustomEvent("route-greetings:open", { detail: { source: "header" } }))}
    >
      <span>{label}</span>
      <span className={styles.routeGreetingsCountIcon}><ListIcon /></span>
    </button>
  );
};
