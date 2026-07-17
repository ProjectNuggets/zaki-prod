export function normalizeDesignProxyPath(rawValue, methodValue) {
  const raw = String(rawValue || "");
  const method = String(methodValue || "GET").toUpperCase();
  if (!isAllowedProxyPath(raw, method) || raw.startsWith("//") || /[\r\n]/.test(raw)) return null;
  try {
    rejectUnsafeRawPathSegments(raw);
    const url = new URL(raw, "http://worker.invalid");
    if (!isAllowedProxyPath(url.pathname, method)) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function isAllowedProxyPath(pathname, method) {
  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  const isReadOnlyAsset = ["GET", "HEAD"].includes(method)
    && ["/artifacts", "/frames"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return isApi || isReadOnlyAsset;
}

function rejectUnsafeRawPathSegments(raw) {
  const pathname = raw.split(/[?#]/, 1)[0];
  for (const segment of pathname.split("/")) {
    const decoded = decodeURIComponent(segment);
    if (
      decoded === "." || decoded === ".." ||
      decoded.includes("/") || decoded.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(decoded)
    ) throw new Error("unsafe path segment");
  }
}
