/* eslint-disable @next/next/no-img-element */
import styles from "./brand-logo.module.css";

type BrandLogoProps = {
  variant?: "marketing" | "product" | "mark";
  className?: string;
};

export function BrandLogo({ variant = "product", className }: BrandLogoProps) {
  if (variant === "mark") {
    return (
      <picture className={`${styles.markOnly} ${className ?? ""}`}>
        <img src="/brand/logo-mark-small.svg" alt="Slovesto" />
      </picture>
    );
  }

  return (
    <span className={`${styles.logo} ${styles[variant]} ${className ?? ""}`}>
      <picture className={styles.mark}>
        <source media="(max-width: 640px)" srcSet="/brand/logo-mark-small.svg" />
        <img src={variant === "product" ? "/brand/logo-mark-small.svg" : "/brand/logo-mark.svg"} alt="" aria-hidden="true" />
      </picture>
      <span className={styles.body}>
        <img className={styles.wordmark} src="/brand/wordmark.svg" alt="Slovesto" />
        {variant === "marketing" ? <span className={styles.tagline}>Место, где слова становятся подарком</span> : null}
      </span>
    </span>
  );
}
