"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  readAnalyticsConsent,
  saveAnalyticsConsent,
  type AnalyticsConsent,
  type AnalyticsConsentDecision
} from "@/lib/client-analytics-consent";
import { ensureCurrentLandingFirstTouch, removeFirstTouchCookie } from "@/lib/client-landing-attribution";
import styles from "./yandex-metrika-consent.module.css";

export const YANDEX_METRIKA_ID = 111957811;
export { ANALYTICS_CONSENT_STORAGE_KEY };
export const ANALYTICS_PREFERENCES_EVENT = "slovesto:analytics-preferences";

const PUBLIC_ANALYTICS_PATHS = new Set([
  "/",
  "/gruppovaya-otkrytka/uchitelyu",
  "/gruppovaya-otkrytka/vospitatelyu",
  "/gruppovaya-otkrytka/kollege",
  "/gruppovaya-otkrytka/den-rozhdeniya"
]);

type MetrikaFunction = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
type MetrikaWindow = Window & {
  ym?: MetrikaFunction;
  __slovestoMetrikaInitialized?: boolean;
  disableYaCounter111957811?: boolean;
};

const safePageUrl = () => `${window.location.origin}${window.location.pathname}`;

const safeReferrer = () => {
  if (!document.referrer) return undefined;
  try {
    const referrer = new URL(document.referrer);
    return referrer.origin === window.location.origin
      ? `${referrer.origin}${referrer.pathname}`
      : referrer.origin;
  } catch {
    return undefined;
  }
};

const queueMetrika = (target: MetrikaWindow) => {
  if (target.ym) return target.ym;
  const ym: MetrikaFunction = (...args: unknown[]) => {
    (ym.a ??= []).push(args);
  };
  ym.l = Date.now();
  target.ym = ym;
  return ym;
};

const loadMetrika = () => {
  const target = window as MetrikaWindow;
  target.disableYaCounter111957811 = false;
  const ym = queueMetrika(target);

  if (!document.querySelector(`script[data-yandex-metrika="${YANDEX_METRIKA_ID}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_ID}`;
    script.dataset.yandexMetrika = String(YANDEX_METRIKA_ID);
    document.head.appendChild(script);
  }

  if (!target.__slovestoMetrikaInitialized) {
    ym(YANDEX_METRIKA_ID, "init", {
      defer: true,
      webvisor: false,
      clickmap: false,
      ecommerce: false,
      trackLinks: false,
      sendTitle: false,
      accurateTrackBounce: true
    });
    target.__slovestoMetrikaInitialized = true;
  }

  ym(YANDEX_METRIKA_ID, "hit", safePageUrl(), { referer: safeReferrer() });
};

const suspendMetrika = () => {
  (window as MetrikaWindow).disableYaCounter111957811 = true;
};

const clearMetrikaCookies = () => {
  const names = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=", 1)[0])
    .filter((name) => name.startsWith("_ym_"));
  const hostname = window.location.hostname;
  const domains = new Set<string | undefined>([undefined, hostname, `.${hostname}`]);
  const parentDomain = hostname.split(".").slice(-2).join(".");
  if (parentDomain.includes(".")) {
    domains.add(parentDomain);
    domains.add(`.${parentDomain}`);
  }

  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
    }
  }
};

const clearMetrikaStorage = (storage: Storage) => {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith("_ym_")) storage.removeItem(key);
  }
};

const revokeMetrika = () => {
  const target = window as MetrikaWindow;
  target.disableYaCounter111957811 = true;
  target.ym?.(YANDEX_METRIKA_ID, "destruct");
  document.querySelectorAll(`script[data-yandex-metrika="${YANDEX_METRIKA_ID}"]`).forEach((script) => script.remove());
  delete target.__slovestoMetrikaInitialized;
  delete target.ym;
  clearMetrikaCookies();
  try { clearMetrikaStorage(window.localStorage); } catch { /* Storage can be blocked. */ }
  try { clearMetrikaStorage(window.sessionStorage); } catch { /* Storage can be blocked. */ }
  removeFirstTouchCookie();
};

export function openAnalyticsPreferences() {
  window.dispatchEvent(new Event(ANALYTICS_PREFERENCES_EVENT));
}

export function AnalyticsPreferencesButton({ className }: { className?: string }) {
  return <button className={className} type="button" onClick={openAnalyticsPreferences}>Настройки аналитики</button>;
}

export function YandexMetrikaConsent() {
  const pathname = usePathname();
  const isPublicAnalyticsPage = PUBLIC_ANALYTICS_PATHS.has(pathname);
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const trackedPath = useRef<string | null>(null);

  useEffect(() => {
    const consentFrame = window.requestAnimationFrame(() => setConsent(readAnalyticsConsent()));
    const openPreferences = () => setPreferencesOpen(true);
    window.addEventListener(ANALYTICS_PREFERENCES_EVENT, openPreferences);
    return () => {
      window.cancelAnimationFrame(consentFrame);
      window.removeEventListener(ANALYTICS_PREFERENCES_EVENT, openPreferences);
    };
  }, []);

  useEffect(() => {
    if (consent !== "accepted") {
      revokeMetrika();
      trackedPath.current = null;
      return;
    }
    if (!isPublicAnalyticsPage) {
      suspendMetrika();
      trackedPath.current = null;
      return;
    }
    if (trackedPath.current === pathname) return;
    loadMetrika();
    trackedPath.current = pathname;
  }, [consent, isPublicAnalyticsPage, pathname]);

  if (!isPublicAnalyticsPage || consent === null || (consent !== "unset" && !preferencesOpen)) return null;

  const choose = (value: AnalyticsConsentDecision) => {
    saveAnalyticsConsent(value);
    setConsent(value);
    setPreferencesOpen(false);
    if (value === "accepted") ensureCurrentLandingFirstTouch();
    else revokeMetrika();
  };

  return (
    <section className={styles.banner} role="dialog" aria-labelledby="analytics-consent-title">
      <div className={styles.copy}>
        <h2 id="analytics-consent-title">Помочь нам улучшать Slovesto?</h2>
        <p>
          С вашего разрешения Slovesto передаст Яндексу данные о посещении открытых страниц: IP-адрес,
          путь без параметров, источник перехода и сведения о браузере и устройстве. Вебвизор и запись форм
          отключены. Подробнее — в <Link href="/privacy">политике обработки данных</Link>.
        </p>
      </div>
      <div className={styles.actions}>
        <button className={styles.secondary} type="button" onClick={() => choose("declined")}>Не использовать</button>
        <button className={styles.primary} type="button" onClick={() => choose("accepted")}>Разрешить</button>
      </div>
    </section>
  );
}
