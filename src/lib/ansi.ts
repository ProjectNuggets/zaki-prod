const ANSI_REGEX = /\x1b\[([0-9;]*)m/g;

type AnsiSegment = {
  text: string;
  fg?: string;
  bg?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
};

const FG_COLORS: Record<number, string> = {
  30: "#1a1714",
  31: "#ff6060",
  32: "#3fbf79",
  33: "#e0b341",
  34: "#5aa8ff",
  35: "#c87ee0",
  36: "#4fc3d1",
  37: "#d4d0c8",
  90: "#706a63",
  91: "#ff8080",
  92: "#6fe09a",
  93: "#f0c463",
  94: "#7bb8ff",
  95: "#d89be0",
  96: "#7fd6e0",
  97: "#f0ece6",
};

const BG_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(FG_COLORS).map(([code, value]) => [String(Number(code) + 10), value])
);

type AnsiState = {
  fg?: string;
  bg?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
};

function applyCodes(state: AnsiState, codes: number[]): AnsiState {
  const next: AnsiState = { ...state };
  for (const code of codes) {
    if (code === 0) {
      next.fg = undefined;
      next.bg = undefined;
      next.bold = undefined;
      next.italic = undefined;
      next.underline = undefined;
      next.dim = undefined;
    } else if (code === 1) next.bold = true;
    else if (code === 2) next.dim = true;
    else if (code === 3) next.italic = true;
    else if (code === 4) next.underline = true;
    else if (code === 22) {
      next.bold = undefined;
      next.dim = undefined;
    } else if (code === 23) next.italic = undefined;
    else if (code === 24) next.underline = undefined;
    else if (code === 39) next.fg = undefined;
    else if (code === 49) next.bg = undefined;
    else if (FG_COLORS[code]) next.fg = FG_COLORS[code];
    else {
      const bgKey = String(code);
      if (Object.prototype.hasOwnProperty.call(BG_COLORS, bgKey)) {
        next.bg = BG_COLORS[bgKey];
      }
    }
  }
  return next;
}

export function parseAnsi(input: string): AnsiSegment[] {
  if (!input) return [];
  const segments: AnsiSegment[] = [];
  let state: AnsiState = {};
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  ANSI_REGEX.lastIndex = 0;
  while ((match = ANSI_REGEX.exec(input)) !== null) {
    if (match.index > lastIndex) {
      const text = input.slice(lastIndex, match.index);
      segments.push({ text, ...state });
    }
    const codes = (match[1] ?? "")
      .split(";")
      .map((part: string) => parseInt(part, 10))
      .filter((code: number) => !Number.isNaN(code));
    state = applyCodes(state, codes.length === 0 ? [0] : codes);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), ...state });
  }
  return segments;
}

export function stripAnsi(input: string): string {
  if (!input) return "";
  return input.replace(ANSI_REGEX, "");
}

export function hasAnsi(input: string): boolean {
  if (!input) return false;
  ANSI_REGEX.lastIndex = 0;
  return ANSI_REGEX.test(input);
}
