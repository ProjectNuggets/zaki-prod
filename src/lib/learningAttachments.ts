import type { LucideIcon } from "lucide-react";
import {
  Braces,
  FileCode2,
  FileImage,
  FileJson,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FileType2,
  Palette,
  Presentation,
  Settings2,
  SquareTerminal,
} from "lucide-react";

const officeExts = [".pdf", ".docx", ".xlsx", ".pptx"] as const;

const textLikeExts = [
  ".txt",
  ".text",
  ".log",
  ".md",
  ".markdown",
  ".rst",
  ".asciidoc",
  ".html",
  ".htm",
  ".xml",
  ".svg",
  ".json",
  ".jsonc",
  ".json5",
  ".yaml",
  ".yml",
  ".toml",
  ".csv",
  ".tsv",
  ".ini",
  ".cfg",
  ".conf",
  ".env",
  ".properties",
  ".tex",
  ".latex",
  ".bib",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".mts",
  ".cts",
  ".jsx",
  ".tsx",
  ".vue",
  ".svelte",
  ".py",
  ".java",
  ".kt",
  ".kts",
  ".scala",
  ".groovy",
  ".gradle",
  ".c",
  ".h",
  ".cpp",
  ".cc",
  ".cxx",
  ".hpp",
  ".hh",
  ".hxx",
  ".cs",
  ".go",
  ".rs",
  ".zig",
  ".nim",
  ".swift",
  ".m",
  ".mm",
  ".rb",
  ".php",
  ".pl",
  ".pm",
  ".lua",
  ".r",
  ".jl",
  ".dart",
  ".hs",
  ".clj",
  ".cljs",
  ".cljc",
  ".ex",
  ".exs",
  ".erl",
  ".ml",
  ".mli",
  ".fs",
  ".fsx",
  ".lisp",
  ".lsp",
  ".scm",
  ".rkt",
  ".sol",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".vim",
  ".sql",
  ".graphql",
  ".gql",
  ".proto",
  ".cmake",
  ".mk",
  ".tf",
  ".hcl",
  ".nginxconf",
  ".dockerfile",
] as const;

const supportedDocExts = [...officeExts, ...textLikeExts] as const;

const supportedDocMimes = new Set<string>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "text/html",
  "text/xml",
  "application/xml",
  "application/json",
  "text/csv",
  "text/tab-separated-values",
  "text/yaml",
  "application/yaml",
  "application/x-yaml",
  "text/x-python",
  "application/x-python-code",
  "text/javascript",
  "application/javascript",
  "application/typescript",
  "text/css",
  "text/x-c",
  "text/x-c++",
  "text/x-java",
  "text/x-go",
  "text/x-rust",
  "text/x-ruby",
  "text/x-php",
  "text/x-shellscript",
  "application/sql",
  "application/toml",
]);

export const LEARNING_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const LEARNING_MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export const LEARNING_ATTACHMENT_ACCEPT = [
  "image/*",
  ...supportedDocExts,
  ...Array.from(supportedDocMimes),
].join(",");

export type LearningFileKind = "image" | "file";

export type LearningAttachment = {
  id: string;
  type: LearningFileKind;
  filename: string;
  base64: string;
  mime_type?: string;
  size: number;
  previewUrl?: string;
};

export type LearningDocIconSpec = {
  Icon: LucideIcon;
  tint: string;
  label: string;
};

export function learningFileExtension(filename: string) {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

export function classifyLearningFile(file: File): LearningFileKind | null {
  const ext = learningFileExtension(file.name);
  if (ext === ".svg" || file.type === "image/svg+xml") return "file";
  if (file.type && file.type.startsWith("image/")) return "image";
  if (file.type && supportedDocMimes.has(file.type)) return "file";
  if (ext && (supportedDocExts as readonly string[]).includes(ext)) return "file";
  return null;
}

export function formatLearningBytes(n: number) {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function learningDocIconFor(filename: string): LearningDocIconSpec {
  const ext = learningFileExtension(filename);
  switch (ext) {
    case ".pdf":
      return { Icon: FileType2, tint: "text-red-500/80", label: "PDF" };
    case ".docx":
      return { Icon: FileText, tint: "text-blue-500/80", label: "DOCX" };
    case ".xlsx":
      return { Icon: FileSpreadsheet, tint: "text-emerald-500/80", label: "XLSX" };
    case ".pptx":
      return { Icon: Presentation, tint: "text-orange-500/80", label: "PPTX" };
    case ".svg":
      return { Icon: FileImage, tint: "text-teal-500/80", label: "SVG" };
  }

  const label = ext ? ext.slice(1).toUpperCase() : "FILE";
  if (
    new Set([
      ".js",
      ".mjs",
      ".cjs",
      ".ts",
      ".mts",
      ".cts",
      ".jsx",
      ".tsx",
      ".vue",
      ".svelte",
      ".py",
      ".java",
      ".kt",
      ".kts",
      ".scala",
      ".groovy",
      ".gradle",
      ".c",
      ".h",
      ".cpp",
      ".cc",
      ".cxx",
      ".hpp",
      ".hh",
      ".hxx",
      ".cs",
      ".go",
      ".rs",
      ".zig",
      ".nim",
      ".swift",
      ".m",
      ".mm",
      ".rb",
      ".php",
      ".pl",
      ".pm",
      ".lua",
      ".r",
      ".jl",
      ".dart",
      ".hs",
      ".clj",
      ".cljs",
      ".cljc",
      ".ex",
      ".exs",
      ".erl",
      ".ml",
      ".mli",
      ".fs",
      ".fsx",
      ".lisp",
      ".lsp",
      ".scm",
      ".rkt",
      ".sol",
    ]).has(ext)
  ) {
    return { Icon: FileCode2, tint: "text-violet-500/80", label };
  }
  if (new Set([".sh", ".bash", ".zsh", ".fish", ".ps1", ".vim", ".sql"]).has(ext)) {
    return { Icon: SquareTerminal, tint: "text-slate-500/80", label };
  }
  if (new Set([".json", ".jsonc", ".json5"]).has(ext)) {
    return { Icon: FileJson, tint: "text-amber-500/80", label };
  }
  if (
    new Set([
      ".yaml",
      ".yml",
      ".toml",
      ".ini",
      ".cfg",
      ".conf",
      ".env",
      ".properties",
      ".tf",
      ".hcl",
      ".nginxconf",
      ".cmake",
      ".mk",
      ".dockerfile",
    ]).has(ext)
  ) {
    return { Icon: Settings2, tint: "text-slate-500/80", label };
  }
  if (new Set([".css", ".scss", ".sass", ".less"]).has(ext)) {
    return { Icon: Palette, tint: "text-pink-500/80", label };
  }
  if (new Set([".csv", ".tsv"]).has(ext)) {
    return { Icon: FileSpreadsheet, tint: "text-emerald-400/80", label };
  }
  if (
    new Set([
      ".md",
      ".markdown",
      ".rst",
      ".asciidoc",
      ".html",
      ".htm",
      ".xml",
      ".tex",
      ".latex",
      ".bib",
      ".graphql",
      ".gql",
      ".proto",
    ]).has(ext)
  ) {
    return { Icon: Braces, tint: "text-sky-500/80", label };
  }
  if (new Set([".txt", ".text", ".log"]).has(ext)) {
    return { Icon: FileText, tint: "text-zaki-muted", label };
  }
  return { Icon: FilePlus2, tint: "text-zaki-muted", label };
}
