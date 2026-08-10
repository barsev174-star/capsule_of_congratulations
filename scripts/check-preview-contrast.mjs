import { readFile } from "node:fs/promises";
import { join } from "node:path";

const cssPath = join(process.cwd(), "src", "components", "final-card", "final-card.module.css");
const css = await readFile(cssPath, "utf8");
const block = css.match(/\.previewBlockPlaceholder\s*\{([\s\S]*?)\}/)?.[1] ?? "";

const color = (name) => {
  const value = block.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  if (!value) throw new Error(`Missing ${name} in preview placeholder styles`);
  return value;
};

const channel = (value) => {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const [red, green, blue] = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
};

const ratio = (foreground, background) => {
  const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

const background = color("--preview-placeholder-background");
const checks = [
  ["primary", color("--preview-placeholder-text"), 4.5],
  ["secondary", color("--preview-placeholder-muted"), 4.5]
];
const failures = checks
  .map(([label, foreground, minimum]) => ({ label, foreground, minimum, actual: ratio(foreground, background) }))
  .filter((check) => check.actual < check.minimum);

for (const check of checks) {
  const actual = ratio(check[1], background);
  console.log(`Preview ${check[0]} contrast: ${actual.toFixed(2)}:1`);
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`${failure.label} contrast ${failure.actual.toFixed(2)} is below ${failure.minimum}:1`));
  process.exit(1);
}
