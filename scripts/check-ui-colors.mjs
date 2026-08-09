import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const workspaceRoot = process.cwd();
const uiRoots = [join(workspaceRoot, "src", "app")];
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
  return hue >= 10 && hue <= 50 && saturation >= 0.12 && saturation <= 0.76 && lightness >= 0.12 && lightness <= 0.82;
};

const replacementFor = (hex) => {
  const { saturation, lightness } = rgbToHsl(hex);
  if (saturation >= 0.5) return "#e9652f";
  if (lightness < 0.38) return "#202124";
  if (lightness < 0.68) return "#5f6368";
  return "#8a9099";
};

const files = (await Promise.all(uiRoots.map(listCssFiles))).flat();
const violations = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    const declaration = /(?<![-\w])color\s*:\s*(#[0-9a-f]{6})/gi;
    for (const match of line.matchAll(declaration)) {
      const color = match[1].toLowerCase();
      if (isBrownForeground(color)) {
        violations.push(`${relative(workspaceRoot, file)}:${index + 1} ${color}`);
      }
    }
  });
  if (shouldFix) {
    const declaration = /(?<![-\w])color\s*:\s*(#[0-9a-f]{6})/gi;
    const updated = source.replace(declaration, (match, color) => {
      const normalized = color.toLowerCase();
      return isBrownForeground(normalized)
        ? match.replace(color, replacementFor(normalized))
        : match;
    });
    if (updated !== source) await writeFile(file, updated, "utf8");
  }
}

if (shouldFix && violations.length > 0) {
  console.log(`Replaced ${violations.length} brown foreground declarations with neutral or approved orange colors.`);
} else if (violations.length > 0) {
  console.error("Brown foreground colors are forbidden in application UI. Use neutral text or the approved orange action palette.");
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("UI color check passed: no brown foreground colors found.");
}
