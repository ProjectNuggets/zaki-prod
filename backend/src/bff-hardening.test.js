import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import express from "express";
import request from "supertest";

// =============================================================================
// Behavioral: the /api/* JSON-404 catch-all ordering, reproduced faithfully.
// index.js is the non-exporting server entrypoint (it boots http.createServer +
// server.listen at import time and reads env/DB), so we cannot import its `app`.
// Instead we rebuild the EXACT tail-of-router ordering here — a real /api route,
// then the new `/api` regex 404, then the generic app.all("*") proxy — and prove
// the guard's semantics. The source-assertion block below pins that index.js
// uses this same wiring in the same order.
// =============================================================================
function buildAppLikeIndexTail() {
  const app = express();

  // A representative "real" /api route registered BEFORE the guard, plus one
  // with a path param, to prove the guard does not shadow real routes.
  app.get("/api/share/list", (req, res) => res.status(200).json({ ok: "real-route" }));
  app.get("/api/share/:token", (req, res) =>
    res.status(200).json({ ok: "real-param-route", token: req.params.token })
  );

  // ---- The fix under test: unknown /api/* -> stable JSON 404. ----
  app.all(/^\/api(\/|$)/, (req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  // ---- Generic catch-all proxy stand-in (serves the SPA / proxies upstream
  // for every non-/api path). We assert /api never reaches here. ----
  app.all("*", (req, res) => {
    res.status(200).type("html").send("<!doctype html><html>SPA-SHELL</html>");
  });

  return app;
}

describe("bff-hardening: unknown /api/* returns JSON 404 (no vendor HTML)", () => {
  const app = buildAppLikeIndexTail();

  it("returns 404 + {error:'not_found'} JSON for an unknown /api path", async () => {
    const res = await request(app).get("/api/this-route-does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: "not_found" });
    // It must NOT have fallen through to the proxy / SPA shell.
    expect(res.text).not.toContain("SPA-SHELL");
  });

  it("returns JSON 404 for unknown /api paths regardless of HTTP method", async () => {
    for (const verb of ["post", "put", "delete", "patch"]) {
      const res = await request(app)[verb]("/api/nope");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "not_found" });
    }
  });

  it("treats a bare /api as an unknown API path (JSON 404, not SPA)", async () => {
    const res = await request(app).get("/api");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("does NOT shadow a real /api route registered before it", async () => {
    const res = await request(app).get("/api/share/list");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: "real-route" });
  });

  it("does NOT shadow a real /api route with a path param", async () => {
    const res = await request(app).get("/api/share/abc123");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: "real-param-route", token: "abc123" });
  });

  it("does NOT catch non-/api paths — SPA fallback is preserved", async () => {
    for (const p of ["/", "/dashboard", "/login", "/some/deep/spa/route"]) {
      const res = await request(app).get(p);
      expect(res.status).toBe(200);
      expect(res.text).toContain("SPA-SHELL");
    }
  });

  it("does NOT catch lookalike paths that merely start with 'api'", async () => {
    // /apidocs is not an API path; it must reach the SPA fallthrough, not 404.
    const res = await request(app).get("/apidocs");
    expect(res.status).toBe(200);
    expect(res.text).toContain("SPA-SHELL");
  });
});

// =============================================================================
// Source-assertion: pin the real placement + the error-detail scrub in index.js.
// =============================================================================
describe("bff-hardening: index.js wiring is placed and scrubbed correctly", () => {
  const source = readFileSync(new URL("./index.js", import.meta.url), "utf8");

  it("registers the /api JSON-404 catch-all with the established shape", () => {
    expect(source).toMatch(
      /app\.all\(\/\^\\\/api\(\\\/\|\$\)\/,\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?res\.status\(404\)\.json\(\{\s*error:\s*"not_found"\s*\}\);/
    );
  });

  it("places the /api 404 AFTER the last real /api route and BEFORE app.all('*')", () => {
    const lastRealApiRoute = source.lastIndexOf('app.get("/api/debug/sentry-test"');
    // Anchor on a newline so we match the actual route REGISTRATIONS, not the
    // inline comments that also mention `app.all("*")`.
    const apiCatchAll = source.indexOf("\napp.all(/^\\/api(\\/|$)/");
    const proxyCatchAll = source.indexOf('\napp.all("*"');
    expect(lastRealApiRoute).toBeGreaterThan(-1);
    expect(apiCatchAll).toBeGreaterThan(-1);
    expect(proxyCatchAll).toBeGreaterThan(-1);
    // ordering: ...last real /api route < /api 404 guard < generic proxy
    expect(apiCatchAll).toBeGreaterThan(lastRealApiRoute);
    expect(proxyCatchAll).toBeGreaterThan(apiCatchAll);
  });

  it("no real route is registered after the generic proxy catch-all", () => {
    const proxyCatchAll = source.indexOf('\napp.all("*"');
    const tail = source.slice(proxyCatchAll + '\napp.all("*"'.length);
    // No further app.<verb>("/<path>") route registrations after the proxy.
    // (Anchored on newline + a quote + leading slash so the generic "*" proxy
    // itself and prose comments don't count as a real route.)
    expect(tail).not.toMatch(/\napp\.(get|post|put|delete|patch|all|use)\(\s*["'`]\//);
  });

  it("NOVA catch-all proxy error no longer echoes raw error.message to clients", () => {
    const novaCatchStart = source.indexOf('finishErroredStreamResponse(res, "NOVA proxy response", error);');
    expect(novaCatchStart).toBeGreaterThan(-1);
    const novaCatchBlock = source.slice(novaCatchStart, novaCatchStart + 600);
    // generic, stable code for the client
    expect(novaCatchBlock).toContain('res.status(500).json({ error: "upstream_error" });');
    // raw detail must NOT be sent to the client anymore
    expect(novaCatchBlock).not.toContain('error: error?.message || "Proxy error."');
    // detail is retained server-side
    expect(novaCatchBlock).toContain('console.error("[NOVA] Catch-all proxy error:", error);');
  });
});
