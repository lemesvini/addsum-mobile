#!/usr/bin/env node
/**
 * Generates src/constants/theme.ts hex values from CSS variables in global.css.
 *
 * Source of truth for className colors: src/global.css (+ tailwind.config.js wiring)
 * Source of truth for prop-based colors: src/constants/theme.ts (this script)
 *
 * Usage: pnpm theme:sync
 */

const fs = require("fs");
const path = require("path");
const {
  tag,
  BOLD,
  CYAN,
  GRAY,
  GREEN,
  WHITE,
  YELLOW,
  RESET,
} = require("./utils/logger");

const ROOT = path.resolve(path.dirname(process.argv[1]), "..");
const DEFAULT_INPUT = path.join(ROOT, "src", "global.css");
const OUTPUT = path.join(ROOT, "src", "constants", "theme.ts");

/** CSS custom properties synced into Colors.light / Colors.dark */
const COLOR_VARS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "button-primary",
  "button-text",
];

function cssVarToThemeKey(name) {
  return name.replace(/-([a-z0-9])/gi, (_, char) => char.toUpperCase());
}

function extractBlock(css, selectorPattern) {
  const re = new RegExp(`${selectorPattern}\\s*\\{`, "m");
  const match = re.exec(css);
  if (!match) return null;

  let depth = 1;
  let i = match.index + match[0].length;

  while (i < css.length && depth > 0) {
    const char = css[i];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    i += 1;
  }

  return css.slice(match.index + match[0].length, i - 1);
}

function parseVars(block) {
  const vars = {};
  const re = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let match;

  while ((match = re.exec(block)) !== null) {
    const name = match[1];
    const raw = match[2].replace(/\/\*[\s\S]*?\*\//g, "").trim();
    vars[name] = raw;
  }

  return vars;
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function srgbToHex(r, g, b) {
  const toByte = (v) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toByte(r)}${toByte(g)}${toByte(b)}`.toUpperCase();
}

function hslChannelsToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return srgbToHex(r + m, g + m, b + m);
}

function oklchToHex(l, c, h) {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const lc = l_ ** 3;
  const mc = m_ ** 3;
  const sc = s_ ** 3;

  let r = 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  let g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  let bOut = -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc;

  const convert = (v) =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;

  return srgbToHex(convert(r), convert(g), convert(bOut));
}

function parseHslChannels(value) {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 3) {
    throw new Error(`Invalid HSL channels: ${value}`);
  }

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1].replace("%", ""));
  const l = parseFloat(parts[2].replace("%", ""));

  return hslChannelsToHex(h, s, l);
}

function cssColorToHex(raw) {
  const value = raw.trim();

  if (value === "none" || value === "transparent") {
    return "transparent";
  }

  const named = {
    black: "#000000",
    white: "#FFFFFF",
  };
  if (named[value.toLowerCase()]) {
    return named[value.toLowerCase()];
  }

  if (/^#[0-9a-f]{3,8}$/i.test(value)) {
    if (value.length === 4) {
      return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toUpperCase();
    }
    return value.toUpperCase();
  }

  const oklchMatch = value.match(
    /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+%?)?\s*\)$/i,
  );
  if (oklchMatch) {
    return oklchToHex(
      parseFloat(oklchMatch[1]),
      parseFloat(oklchMatch[2]),
      parseFloat(oklchMatch[3]),
    );
  }

  const hslFullMatch = value.match(/^hsl\(\s*([^)]+)\)$/i);
  if (hslFullMatch) {
    return parseHslChannels(hslFullMatch[1].replace(/,/g, " "));
  }

  if (/^[\d.]+\s+[\d.]+%?\s+[\d.]+%?$/.test(value)) {
    return parseHslChannels(value);
  }

  throw new Error(`Unsupported color value: "${value}"`);
}

function buildThemeObject(vars, label) {
  const theme = {};
  let warns = 0;

  for (const cssVar of COLOR_VARS) {
    if (!(cssVar in vars)) {
      warns += 1;
      continue;
    }

    try {
      theme[cssVarToThemeKey(cssVar)] = cssColorToHex(vars[cssVar]);
    } catch (error) {
      throw new Error(
        `falha ao converter --${cssVar} em ${label}: ${error.message}`,
      );
    }
  }

  return { theme, warns };
}

function formatThemeEntries(theme) {
  return Object.entries(theme)
    .map(([key, value]) => `    ${key}: '${value}',`)
    .join("\n");
}

function generateThemeFile(light, dark) {
  return `import { Platform } from 'react-native';

/**
 * GERADO AUTOMATICAMENTE a partir de src/global.css — não edite manualmente.
 * Execute: pnpm theme:sync
 *
 * Valores em hex para estilos via props (ícones, gráficos, headers de navegação).
 * Para estilos via className, edite src/global.css e tailwind.config.js.
 */
export const Colors = {
  light: {
${formatThemeEntries(light)}
  },
  dark: {
${formatThemeEntries(dark)}
  },
} as const;

export type ColorToken = keyof typeof Colors.light & keyof typeof Colors.dark;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
`;
}

function syncTheme(inputPath = DEFAULT_INPUT) {
  const t0 = Date.now();
  const tokenCount = COLOR_VARS.length;

  console.log(`\n◆ ${BOLD}sync-theme${RESET}  ${GRAY}v1.0.0${RESET}`);
  console.log(
    `  ${GRAY}sincronizando a partir de ${CYAN}${path.relative(ROOT, inputPath)}${RESET}\n`,
  );

  if (!fs.existsSync(inputPath)) {
    throw new Error(`arquivo não encontrado: ${inputPath}`);
  }
  const css = fs.readFileSync(inputPath, "utf8");

  console.log(
    tag.step(
      `${CYAN}analisando :root${RESET}  ${GRAY}extraindo variáveis CSS${RESET}`,
    ),
  );
  const lightBlock = extractBlock(css, ":root");

  console.log(
    tag.step(
      `${CYAN}analisando .dark${RESET}  ${GRAY}extraindo variáveis CSS${RESET}`,
    ),
  );
  const darkBlock =
    extractBlock(css, "\\.dark:root") ?? extractBlock(css, "\\.dark");

  if (!lightBlock) {
    throw new Error("não encontrou :root { ... } no global.css");
  }
  if (!darkBlock) {
    throw new Error("não encontrou .dark { ... } no global.css");
  }

  console.log(
    tag.step(
      `${YELLOW}convertendo oklch → hex${RESET}  ${GRAY}${tokenCount} tokens · light${RESET}`,
    ),
  );
  const { theme: light, warns: warnsLight } = buildThemeObject(
    parseVars(lightBlock),
    ":root",
  );

  console.log(
    tag.step(
      `${YELLOW}convertendo oklch → hex${RESET}  ${GRAY}${tokenCount} tokens · dark${RESET}`,
    ),
  );
  const { theme: dark, warns: warnsDark } = buildThemeObject(
    parseVars(darkBlock),
    ".dark",
  );

  console.log(
    tag.step(
      `${CYAN}validando tokens${RESET}  ${GRAY}light & dark completos${RESET}`,
    ),
  );
  const missingLight = COLOR_VARS.filter(
    (v) => !Object.prototype.hasOwnProperty.call(light, cssVarToThemeKey(v)),
  );
  const missingDark = COLOR_VARS.filter(
    (v) => !Object.prototype.hasOwnProperty.call(dark, cssVarToThemeKey(v)),
  );

  if (missingLight.length || missingDark.length) {
    throw new Error(
      `tema incompleto — faltando light: [${missingLight.join(", ")}], dark: [${missingDark.join(", ")}]`,
    );
  }

  console.log(
    tag.step(
      `${GREEN}escrevendo theme.ts${RESET}  ${GRAY}src/constants/theme.ts${RESET}`,
    ),
  );
  fs.writeFileSync(OUTPUT, generateThemeFile(light, dark), "utf8");

  const elapsed = Date.now() - t0;
  const warns = warnsLight + warnsDark;
  const lightOk = tokenCount - missingLight.length;
  const darkOk = tokenCount - missingDark.length;

  console.log(`\n${tag.ok("tema sincronizado com sucesso")}`);
  console.log(
    `  ${GRAY}escrito em ${CYAN}${path.relative(ROOT, OUTPUT)}${RESET}\n`,
  );
  console.log(`  │  tokens light  ${GREEN}${lightOk} ok${RESET}`);
  console.log(`  │  tokens dark   ${GREEN}${darkOk} ok${RESET}`);
  console.log(
    `  │  avisos        ${warns > 0 ? YELLOW : GRAY}${warns}${RESET}`,
  );
  console.log(`  └  concluído em  ${WHITE}${elapsed}ms${RESET}\n`);
}

const inputArg = process.argv.find((arg) => arg.startsWith("--input="));
const inputPath = inputArg ? inputArg.slice("--input=".length) : DEFAULT_INPUT;

try {
  syncTheme(path.resolve(inputPath));
} catch (error) {
  console.error(`\n${tag.err(error.message)}\n`);
  process.exit(1);
}
