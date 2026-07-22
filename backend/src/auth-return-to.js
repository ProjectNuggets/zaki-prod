const LOCAL_RETURN_TO_ORIGIN = "https://zaki.local";
const ABSOLUTE_URL_SCHEME = /^[a-z][a-z\d+.-]*:/i;

function hasSafeLocalPathname(pathname) {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("\\")) {
    return false;
  }

  try {
    const decoded = decodeURIComponent(pathname);
    return (
      decoded.startsWith("/") &&
      !decoded.startsWith("//") &&
      !decoded.includes("\\")
    );
  } catch {
    return false;
  }
}

/**
 * Produces a route safe to hand to a browser navigation API.
 *
 * Validation happens after URL normalization: inputs such as `/./\\host` can
 * become `//host`, which browsers interpret as a protocol-relative origin.
 * Encoded separators are checked once as well so a later consumer cannot turn
 * a local-looking pathname into an external target.
 */
export function sanitizeLocalReturnTo(
  value,
  {
    fallback = "",
    stripSearchParams = [],
    requireLeadingSlash = false,
    allowRoot = true,
    maxLength = 240,
  } = {}
) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > maxLength) return fallback;

  const rawPath = raw.split(/[?#]/, 1)[0] || "";
  if (
    rawPath.includes("\\") ||
    rawPath.startsWith("//") ||
    ABSOLUTE_URL_SCHEME.test(rawPath) ||
    (requireLeadingSlash && !raw.startsWith("/"))
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(
      raw.startsWith("/") ? raw : `/${raw}`,
      LOCAL_RETURN_TO_ORIGIN
    );
    if (parsed.origin !== LOCAL_RETURN_TO_ORIGIN || !hasSafeLocalPathname(parsed.pathname)) {
      return fallback;
    }

    for (const name of stripSearchParams) {
      parsed.searchParams.delete(name);
    }

    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return normalized === "/" && !allowRoot ? fallback : normalized;
  } catch {
    return fallback;
  }
}
