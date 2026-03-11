#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

export function resolveBaseUrl() {
  return String(process.env.ZAKI_BASE_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
}

function parseTokens(raw) {
  return String(raw || "")
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isPlaceholderToken(token) {
  const value = String(token || "").trim().toLowerCase();
  return (
    value.includes("<") ||
    value.includes(">") ||
    value.startsWith("real_token_") ||
    value.startsWith("paste_real_token") ||
    value.startsWith("<token_") ||
    value.startsWith("token_user_") ||
    value.includes("your_token_here")
  );
}

export function resolveMultiuserTokens() {
  const inline = parseTokens(process.env.ZAKI_MULTIUSER_TOKENS || "");
  if (inline.length > 0) return inline;

  const tokensFile = String(process.env.ZAKI_MULTIUSER_TOKENS_FILE || "").trim();
  if (!tokensFile) return [];
  const resolved = path.resolve(tokensFile);
  if (!fs.existsSync(resolved)) return [];
  const content = fs.readFileSync(resolved, "utf8");
  return parseTokens(content);
}

export function requireAtLeastTwoTokens(tokens) {
  if (Array.isArray(tokens) && tokens.length >= 2) return;
  console.error(
    "Set ZAKI_MULTIUSER_TOKENS (comma-separated) or ZAKI_MULTIUSER_TOKENS_FILE with at least 2 bearer tokens."
  );
  process.exit(1);
}

export function requireNonPlaceholderTokens(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return;
  const hasPlaceholder = tokens.some((token) => isPlaceholderToken(token));
  if (!hasPlaceholder) return;
  console.error(
    "Detected placeholder values in multi-user tokens. Replace entries like <token_user_1> with real bearer tokens from localStorage key zaki.auth.token."
  );
  process.exit(1);
}
