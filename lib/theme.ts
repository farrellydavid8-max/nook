// App colors: from just a background and an accent, work out every other color
// (text, cards, borders, muted text) so the whole app stays readable, light or dark.

export const DEFAULT_BG = "#0F0F10";
export const DEFAULT_ACCENT = "#E8A33D";
const STORAGE_KEY = "nook_theme";

export const PRESETS = [
  { name: "Midnight", bg: "#0F0F10", accent: "#E8A33D" },
  { name: "Paper", bg: "#F5F0E6", accent: "#B4441C" },
  { name: "Forest", bg: "#101A14", accent: "#9CC58A" },
  { name: "Ocean", bg: "#0C1621", accent: "#6FB3E0" },
  { name: "Plum", bg: "#1B1220", accent: "#E08DAE" },
  { name: "Snow", bg: "#FFFFFF", accent: "#2F5BD3" },
  { name: "Arcade", bg: "#120E2A", accent: "#38E8C6" },
  { name: "Ember", bg: "#1E1210", accent: "#FF7A45" },
];

type RGB = [number, number, number];

export const isHex = (s: string) => /^#[0-9a-f]{6}$/i.test(s);
const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number) => {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB);
};

export function luminance(hex: string) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// Mix from the background toward the text color until the result is readable enough
function readable(bg: string, fg: string, start: number, min: number) {
  for (let t = start; t <= 1; t += 0.02) {
    const c = mix(bg, fg, t);
    if (contrast(c, bg) >= min) return c;
  }
  return fg;
}

export function buildTheme(bgIn: string, accentIn: string) {
  const bg = isHex(bgIn) ? bgIn : DEFAULT_BG;
  const accent = isHex(accentIn) ? accentIn : DEFAULT_ACCENT;
  // "Dark" means light text reads better than dark text on this background
  const dark = contrast(bg, "#FFFFFF") > contrast(bg, "#000000");
  // Text leans slightly toward the background's hue so it feels part of the same palette
  const fg = mix(dark ? "#FFFFFF" : "#000000", bg, dark ? 0.08 : 0.12);
  const onAccent = contrast(accent, "#141210") >= contrast(accent, "#FFFFFF") ? "#141210" : "#FFFFFF";
  return {
    dark,
    vars: {
      "--bg": bg,
      "--surface": mix(bg, fg, dark ? 0.06 : 0.045),
      "--surface-2": mix(bg, fg, dark ? 0.1 : 0.08),
      "--bar": mix(bg, fg, dark ? 0.035 : 0.03),
      "--line": mix(bg, fg, dark ? 0.15 : 0.13),
      "--line-strong": mix(bg, fg, dark ? 0.22 : 0.2),
      "--fg": fg,
      "--soft": readable(bg, fg, 0.75, 7),
      "--muted": readable(bg, fg, 0.55, 4.6),
      "--accent": accent,
      "--on-accent": onAccent,
      "--danger": dark ? "#F4A497" : "#B3261E",
      "--error": dark ? "#F4A497" : "#B3261E",
      "--danger-bg": dark ? "#3A1F1C" : "#FBE4E1",
    } as Record<string, string>,
  };
}

// Is the accent easy to see against the background? (Used to warn, not to block.)
export const accentReadable = (bg: string, accent: string) => contrast(bg, accent) >= 2.6;

export function applyTheme(bg: string, accent: string) {
  const { dark, vars } = buildTheme(bg, accent);
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.colorScheme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", vars["--bg"]);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ vars, dark }));
  } catch {}
}

// Runs before the page draws, so returning visitors don't see a flash of the default colors
export const EARLY_THEME_SCRIPT = `try{var t=JSON.parse(localStorage.getItem("${STORAGE_KEY}"));if(t&&t.vars){var r=document.documentElement;for(var k in t.vars)r.style.setProperty(k,t.vars[k]);r.style.colorScheme=t.dark?"dark":"light";}}catch(e){}`;
