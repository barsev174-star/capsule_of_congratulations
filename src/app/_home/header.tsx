"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import { getBirthdayTelemetryContext, getCaregiverTelemetryContext, getColleagueTelemetryContext, getTeacherTelemetryContext } from "@/lib/client-landing-attribution";
import { BIRTHDAY_EXAMPLE_PATH } from "@/lib/birthday-scenario";
import {
  startBirthdayCardFromShowcaseAction,
  startCardFromShowcaseAction,
  startCaregiverCardFromShowcaseAction,
  startColleagueCardFromShowcaseAction,
  startTeacherCardFromShowcaseAction
} from "../home-actions";
import styles from "./header.module.css";

const homeNavItems = [
  { href: "#how-it-works", label: "Как это работает" },
  { href: "/example", label: "Примеры" },
  { href: "#ai", label: "ИИ-помощник" },
  { href: "#faq", label: "FAQ" },
  { href: "/account", label: "Мои открытки" }
];

const teacherNavItems = [
  { href: "#how-it-works", label: "Как это работает" },
  { href: "/example?template=school-classic", label: "Пример" },
  { href: "#price", label: "Цена" },
  { href: "#faq", label: "FAQ" },
  { href: "/account", label: "Мои открытки" }
];

const caregiverNavItems = [
  { href: "#how-it-works", label: "Как это работает" },
  { href: "/example?template=kindergarten-doodles", label: "Пример" },
  { href: "#price", label: "Цена" },
  { href: "#faq", label: "FAQ" },
  { href: "/account", label: "Мои открытки" }
];

const colleagueNavItems = [
  { href: "#how-it-works", label: "Как это работает" },
  { href: "/example?template=team-editorial", label: "Пример" },
  { href: "#price", label: "Цена" },
  { href: "#faq", label: "FAQ" },
  { href: "/account", label: "Мои открытки" }
];

const birthdayNavItems = [
  { href: "#how-it-works", label: "Как это работает" },
  { href: BIRTHDAY_EXAMPLE_PATH, label: "Пример" },
  { href: "#price", label: "Цена" },
  { href: "#faq", label: "FAQ" },
  { href: "/account", label: "Мои открытки" }
];

type HeaderVariant = "home" | "teacher" | "caregiver" | "colleague" | "birthday";

export function HomeHeader({ variant = "home" }: { variant?: HeaderVariant }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navItems = variant === "teacher"
    ? teacherNavItems
    : variant === "caregiver"
      ? caregiverNavItems
      : variant === "colleague"
        ? colleagueNavItems
        : variant === "birthday"
          ? birthdayNavItems
          : homeNavItems;
  const isSeoLanding = variant !== "home";
  const createAction = variant === "teacher"
    ? startTeacherCardFromShowcaseAction
    : variant === "caregiver"
      ? startCaregiverCardFromShowcaseAction
      : variant === "colleague"
        ? startColleagueCardFromShowcaseAction
        : variant === "birthday"
          ? startBirthdayCardFromShowcaseAction
          : startCardFromShowcaseAction;

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    if (menuOpen) {
      header.setAttribute("data-menu-open", "true");
      // Блокируем прокрутку фона без сдвига контента из-за scrollbar
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        header.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      header.removeAttribute("data-menu-open");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      header.style.paddingRight = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      header.style.paddingRight = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const header = headerRef.current;
      if (header && event.target instanceof Node && !header.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
        return;
      }
      // Удерживаем фокус внутри шапки, пока меню открыто
      if (event.key === "Tab" && headerRef.current) {
        const focusable = Array.from(
          headerRef.current.querySelectorAll<HTMLElement>("button, a[href]")
        ).filter((el) => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header ref={headerRef} className={`${styles.header} ${isSeoLanding ? styles.teacherHeader : ""}`}>
      <div className={styles.shell}>
        <Link href="/" className={styles.logo}>
          <BrandLogo variant="marketing" />
        </Link>

        <nav className={styles.nav} aria-label="Главная навигация">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className={styles.navLink} onClick={() => {
              if (variant === "birthday" && item.href === BIRTHDAY_EXAMPLE_PATH) {
                sendClientTelemetry("seo_example_click", { ...getBirthdayTelemetryContext(), template: "paper-birthday", placement: "header" });
              }
            }}>
              {item.label}
            </a>
          ))}
        </nav>

        <button
          ref={toggleRef}
          type="button"
          className={`${styles.menuToggle} ${menuOpen ? styles.menuToggleOpen : ""}`}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>

        {menuOpen ? (
          <nav ref={navRef} id="mobile-nav" aria-label="Мобильная навигация" className={styles.mobileNav}>
            {navItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => {
                setMenuOpen(false);
                if (variant === "birthday" && item.href === BIRTHDAY_EXAMPLE_PATH) {
                  sendClientTelemetry("seo_example_click", { ...getBirthdayTelemetryContext(), template: "paper-birthday", placement: "header" });
                }
              }}>
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}

        <form
          action={createAction}
          className={styles.ctaForm}
          onSubmit={() => {
            if (variant === "teacher") {
              sendClientTelemetry("seo_create_click", {
                ...getTeacherTelemetryContext(),
                placement: "hero",
                template: "school-classic"
              });
            } else if (variant === "caregiver") {
              sendClientTelemetry("seo_create_click", {
                ...getCaregiverTelemetryContext(),
                placement: "header",
                template: "kindergarten-doodles"
              });
            } else if (variant === "colleague") {
              sendClientTelemetry("seo_create_click", {
                ...getColleagueTelemetryContext(),
                placement: "header",
                template: "team-editorial"
              });
            } else if (variant === "birthday") {
              sendClientTelemetry("seo_create_click", {
                ...getBirthdayTelemetryContext(),
                placement: "header",
                template: "paper-birthday"
              });
            }
          }}
        >
          <button type="submit" className={styles.ctaButton}>
            Создать открытку
          </button>
        </form>
      </div>
    </header>
  );
}
