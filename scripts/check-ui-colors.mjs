import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const workspaceRoot = process.cwd();
const uiRoots = [join(workspaceRoot, "src", "app"), join(workspaceRoot, "src", "components")];
const artisticRoots = [
  join(workspaceRoot, "src", "components", "final-card"),
  join(workspaceRoot, "src", "components", "gift-intro"),
  join(workspaceRoot, "src", "components", "templates")
];
const shouldFix = process.argv.includes("--fix");
const approvedOrange = new Set([
  "#c7532a",
  "#c94a1d",
  "#cf4718",
  "#d95424",
  "#d95728",
  "#d95a2a",
  "#df4f24",
  "#df5725",
  "#df5f2e",
  "#e45b27",
  "#e65720",
  "#e76531",
  "#e95f2a",
  "#e9652f",
  "#ec662f",
  "#ec6b37",
  "#ef7240",
  "#f36d37",
  "#f47443"
]);

const listCssFiles = async (directory) => {
  if (artisticRoots.some((root) => directory === root || directory.startsWith(`${root}\\`) || directory.startsWith(`${root}/`))) {
    return [];
  }
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listCssFiles(path);
    return extname(entry.name) === ".css" ? [path] : [];
  }));
  return nested.flat();
};

const rgbToHsl = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  const channels = [value >> 16, (value >> 8) & 255, value & 255].map((channel) => channel / 255);
  const max = Math.max(...channels);
  const min = Math.min(...channels);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { hue: 0, saturation: 0, lightness };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === channels[0]) hue = 60 * (((channels[1] - channels[2]) / delta) % 6);
  else if (max === channels[1]) hue = 60 * ((channels[2] - channels[0]) / delta + 2);
  else hue = 60 * ((channels[0] - channels[1]) / delta + 4);
  return { hue: hue < 0 ? hue + 360 : hue, saturation, lightness };
};

const isBrownForeground = (hex) => {
  if (approvedOrange.has(hex)) return false;
  const { hue, saturation, lightness } = rgbToHsl(hex);
  return hue >= 10 && hue <= 50 && saturation >= 0.08 && lightness >= 0.08 && lightness < 0.999;
};

const replacementFor = (hex, property) => {
  const { saturation, lightness } = rgbToHsl(hex);
  if (property.includes("shadow")) return "#000000";
  if (property.includes("on-accent")) return "#ffffff";
  if (property.startsWith("background") || /(?:background|bg|surface|page|cream|peach)/.test(property)) {
    if (saturation >= 0.45 && lightness < 0.78) return "#e9652f";
    if (lightness < 0.38) return "#202124";
    if (lightness < 0.68) return "#8a9099";
    return "#f1f3f4";
  }
  if (property.startsWith("border") || property.includes("border")) {
    if (lightness >= 0.68) return "#dfe1e5";
    return saturation >= 0.5 ? "#e9652f" : "#5f6368";
  }
  if (property.startsWith("outline")) return "#e9652f";
  if (/(?:accent|action|primary)/.test(property) && /(?:soft|light|subtle|pale)/.test(property)) return "#f1f3f4";
  if (/(?:accent|action|primary)/.test(property)) return "#e9652f";
  if (lightness >= 0.88) return "#ffffff";
  if (saturation >= 0.5) return "#e9652f";
  if (lightness < 0.38) return "#202124";
  if (lightness < 0.68) return "#5f6368";
  return "#8a9099";
};

const files = (await Promise.all(uiRoots.map(listCssFiles))).flat();
const violations = [];

const colorDeclaration = /(?<![-\w])(--[-\w]+|color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|box-shadow|text-shadow|fill|stroke|caret-color|accent-color)\s*:\s*([^;}]+)/gi;
const colorToken = /#[0-9a-f]{6}(?:[0-9a-f]{2})?|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:\d*\.)?\d+%?)?\s*\)/gi;

const tokenDetails = (token) => {
  if (token.startsWith("#")) {
    return { hex: token.slice(0, 7).toLowerCase(), alpha: token.length === 9 ? token.slice(7) : null, format: "hex" };
  }
  const channels = token.match(/\d{1,3}/g)?.slice(0, 3).map((value) => Math.min(255, Number.parseInt(value, 10))) ?? [];
  if (channels.length !== 3) return null;
  const hex = `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  const alpha = token.match(/,\s*((?:\d*\.)?\d+%?)\s*\)$/)?.[1] ?? null;
  return { hex, alpha, format: token.toLowerCase().startsWith("rgba") ? "rgba" : "rgb" };
};

const formatReplacement = (replacement, details) => {
  if (details.format === "hex") return details.alpha ? `${replacement}${details.alpha}` : replacement;
  if (!details.alpha) return replacement;
  const value = Number.parseInt(replacement.slice(1), 16);
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${details.alpha})`;
};

const replaceForbiddenColors = (source, onViolation) => source.replace(colorDeclaration, (declaration, property, value) => {
  const updatedValue = value.replace(colorToken, (rawColor) => {
    const details = tokenDetails(rawColor.toLowerCase());
    if (!details || !isBrownForeground(details.hex)) return rawColor;
    onViolation?.(rawColor.toLowerCase());
    return shouldFix ? formatReplacement(replacementFor(details.hex, property.toLowerCase()), details) : rawColor;
  });
  return updatedValue === value ? declaration : declaration.replace(value, updatedValue);
});

for (const file of files) {
  const source = await readFile(file, "utf8");
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    replaceForbiddenColors(line, (color) => violations.push(`${relative(workspaceRoot, file)}:${index + 1} ${color}`));
  });
  if (shouldFix) {
    const replaced = replaceForbiddenColors(source);
    const originalLines = source.split(/(?<=\n)/);
    const updated = replaced
      .split(/(?<=\n)/)
      .map((line, index) => line === originalLines[index] ? line : line.replace(/\r\n$/, "\n"))
      .join("");
    if (updated !== source) await writeFile(file, updated, "utf8");
  }
}

if (shouldFix && violations.length > 0) {
  console.log(`Replaced ${violations.length} brown foreground declarations with neutral or approved orange colors.`);
} else if (violations.length > 0) {
  console.error("Brown, coffee, sepia and terracotta colors are forbidden in application UI. Use neutral surfaces/text or the approved orange action palette.");
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("UI color check passed: no brown foreground colors found.");
}
