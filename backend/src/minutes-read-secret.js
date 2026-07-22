import path from "node:path";

export function isValidMinutesReadToken(value) {
  const token = String(value ?? "");
  return (
    token.length >= 32 &&
    token.length <= 512 &&
    token === token.trim() &&
    /^[\x20-\x7e]+$/.test(token)
  );
}

export function resolveMinutesReadToken({ tokenFile, fallbackToken, readFileSync }) {
  const resolvedFile = String(tokenFile || "").trim();
  let token = String(fallbackToken ?? "");
  if (resolvedFile) {
    if (!path.isAbsolute(resolvedFile) || typeof readFileSync !== "function") {
      throw new Error("MINUTES_ENGINE_READ_TOKEN_FILE is invalid.");
    }
    try {
      token = String(readFileSync(resolvedFile, "utf8"));
    } catch (error) {
      throw new Error("MINUTES_ENGINE_READ_TOKEN_FILE could not be read.", { cause: error });
    }
  }
  if (!isValidMinutesReadToken(token)) {
    throw new Error("MINUTES_ENGINE_READ_TOKEN is invalid.");
  }
  return token;
}
