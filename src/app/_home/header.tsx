"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { startCardFromShowcaseAction } from "../home-actions";
import styles from "./header.module.css";

const navItems = [
  { href: "#how-it-works", label: "Как это работает" },
  { href: "/example", label: "Примеры" },
  { href: "#ai", label: "ИИ-помощник" },
  { href: "#faq", label: "FAQ" },
  { href: "/account", label: "Мои открытки" }
];

export function HomeHeader() {
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  const closeMobileMenu = () => {
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
  };

  useEffect(() => {
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const mobileMenu = mobileMenuRef.current;
      if (mobileMenu?.open && event.target instanceof Node && !mobileMenu.contains(event.target)) {
        mobileMenu.open = false;
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.shell}>
        <Link href="/" className={styles.logo}>
          <BrandLogo variant="marketing" />
        </Link>

        <nav className={styles.nav} aria-label="Главная навигация">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
        </nav>

        <details ref={mobileMenuRef} className={styles.mobileMenu}>
          <summary aria-label="Открыть меню"><span /><span /><span /></summary>
          <nav aria-label="Мобильная навигация" className={styles.mobileNav}>
            {navItems.map((item) => <a key={item.href} href={item.href} onClick={closeMobileMenu}>{item.label}</a>)}
          </nav>
        </details>

        <form action={startCardFromShowcaseAction} className={styles.ctaForm}>
          <button type="submit" className={styles.ctaButton}>
            Создать открытку
          </button>
        </form>
      </div>
    </header>
  );
}
