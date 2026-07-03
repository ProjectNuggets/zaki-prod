// Headers we must NOT copy from an upstream (engine) response onto the client response.
// Beyond hop-by-hop headers, this strips the upstream's CORS headers (AnythingLLM responds
// with Access-Control-Allow-Origin: *, which would overwrite the BFF's own cors() value and
// break credentialed browser requests) AND set-cookie (an upstream session/CSRF cookie must
// never be planted on the BFF domain — e.g. via the unauthenticated public share proxy).
export const UPSTREAM_HEADER_BLOCKLIST = new Set([
  "connection",
  "transfer-encoding",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "set-cookie",
  "te",
  "trailers",
  "upgrade",
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-methods",
  "access-control-allow-headers",
  "access-control-expose-headers",
  "access-control-max-age",
]);

export function copyResponseHeaders(upstream, res) {
  upstream.headers.forEach((value, key) => {
    if (UPSTREAM_HEADER_BLOCKLIST.has(key.toLowerCase())) {
      return;
    }
    res.setHeader(key, value);
  });
}
