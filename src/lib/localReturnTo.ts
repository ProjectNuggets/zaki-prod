const LOCAL_RETURN_TO_ORIGIN = "https://zaki.local";
const ABSOLUTE_URL_SCHEME = /^[a-z][a-z\d+.-]*:/i;

type LocalReturnToOptions = {
  fallback?: string;
  stripSearchParams?: readonly string[];
  requireLeadingSlash?: boolean;
  allowRoot?: boolean;
  maxLength?: number;
};

function hasSafeLocalPathname(pathname: string) {
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
 * Produces a route safe to hand to React Router or a browser redirect.
 *
 * A raw input can normalize from `/./\\host` into `//host`; validate the
 * normalized pathname rather than only the original string. Encoded path
 * separators are also checked once to keep later route consumers local.
 */
export function sanitizeLocalReturnTo(
  value: unknown,
  {
    fallback = "",
    stripSearchParams = [],
    requireLeadingSlash = false,
    allowRoot = true,
    maxLength = 240,
  }: LocalReturnToOptions = {}
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
