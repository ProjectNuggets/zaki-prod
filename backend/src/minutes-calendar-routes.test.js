import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import express from "express";
import { buildMinutesCalendarRouter } from "./minutes-calendar-routes.js";

const KEY = "calendar-encryption-key-0123456789abcdef";
const STATE_SECRET = "calendar-oauth-state-secret-0123456789abcdef";

// A per-test spy store + exchange, rebuildable so assertions are isolated.
function makeDeps(overrides = {}) {
  const calls = { upsert: [], take: [], exchange: [], revoke: [] };
  const deps = {
    enabled: true,
    oauthClientId: "cid",
    oauthClientSecret: "csecret",
    oauthStateSecret: STATE_SECRET,
    encryptionKey: KEY,
    appUrl: "https://app-staging.example",
    buildRedirectUri: () => "https://app-staging.example/api/minutes/calendar/connect/callback",
    isSecure: () => true,
    // authed iff the test sends x-test-user
    resolveUser: async (req, res) => {
      const id = req.headers["x-test-user"];
      if (!id) { res.status(401).json({ error: "auth_required" }); return null; }
      return { zakiUser: { id: Number(id) } };
    },
    exchangeCode: async (args) => {
      calls.exchange.push(args);
      return overrides.exchangeResult ?? { refresh_token: "1//rt-abc", id_token: idToken({ sub: "g-sub-1", email: "u@x.com" }) };
    },
    fetchImpl: async () => { calls.revoke.push(true); return { ok: true }; },
    store: {
      upsertCalendarConnection: async (a) => { calls.upsert.push(a); },
      getCalendarConnectionStatus: async ({ userId }) => ({ connected: userId === "42", status: "active" }),
      takeCalendarRefreshTokenForRevocation: async (a) => { calls.take.push(a); return "1//rt-abc"; },
      saveAutojoinConsent: async (a) => { calls.autojoinSave = a; },
      getAutojoinStatus: async ({ userId }) => ({ enabled: userId === "42", joinScope: "accepted", isCurrent: true }),
    },
    recordFailure: () => {},
    ...overrides.deps,
  };
  return { deps, calls };
}

function idToken({ sub, email }) {
  const payload = Buffer.from(JSON.stringify({ sub, email })).toString("base64url");
  return `h.${payload}.s`;
}

let server, base, current;
beforeAll(async () => {
  const app = express();
  // Deliberately NO app-level body parser — this mirrors the real index.js mount
  // (which has none), so POST /calendar/autojoin proves the ROUTER parses its own
  // JSON body. An app.use(express.json()) here would mask that regression.
  // A single mount whose deps we swap per test via `current`.
  app.use("/api/minutes", (req, res, next) => current.router(req, res, next));
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

function mount(overrides) {
  const { deps, calls } = makeDeps(overrides);
  current = { router: buildMinutesCalendarRouter(deps), calls };
  return calls;
}

// Drive /start (authed) → return { authorizeUrl, state, nonceCookie }.
async function startFlow(user = "42") {
  const res = await fetch(`${base}/api/minutes/calendar/connect/start?returnTo=/settings%23calendar`, {
    headers: { "x-test-user": user },
  });
  const body = await res.json();
  const setCookie = res.headers.get("set-cookie") || "";
  const nonceCookie = setCookie.split(";")[0]; // name=value
  const state = new URL(body.authorizeUrl).searchParams.get("state");
  return { res, authorizeUrl: body.authorizeUrl, state, nonceCookie };
}

describe("minutes calendar routes", () => {
  test("a disabled deployment 404s every route (invisible)", async () => {
    mount({ deps: { enabled: false } });
    const r = await fetch(`${base}/api/minutes/calendar/connect/status`, { headers: { "x-test-user": "42" } });
    expect(r.status).toBe(404);
  });

  test("/start requires auth and, when authed, returns the authorize url + sets the nonce cookie", async () => {
    mount();
    const un = await fetch(`${base}/api/minutes/calendar/connect/start`);
    expect(un.status).toBe(401);
    const { res, authorizeUrl, nonceCookie } = await startFlow("42");
    expect(res.status).toBe(200);
    const u = new URL(authorizeUrl);
    expect(u.searchParams.get("scope")).toContain("calendar.events.readonly");
    expect(u.searchParams.get("prompt")).toBe("consent");
    expect(nonceCookie.startsWith("zaki_calendar_oauth_nonce=")).toBe(true);
    expect((res.headers.get("set-cookie") || "")).toContain("Path=/api/minutes/calendar/connect/callback");
  });

  test("callback happy path exchanges the code, stores the refresh token for the STATE's user, and redirects connected", async () => {
    const calls = mount();
    const { state, nonceCookie } = await startFlow("42");
    const r = await fetch(`${base}/api/minutes/calendar/connect/callback?code=abc&state=${encodeURIComponent(state)}`, {
      headers: { cookie: nonceCookie },
      redirect: "manual",
    });
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toContain("calendar=connected");
    expect(calls.upsert).toHaveLength(1);
    expect(calls.upsert[0]).toEqual(expect.objectContaining({ userId: "42", refreshToken: "1//rt-abc", googleSub: "g-sub-1" }));
  });

  test("callback with no nonce cookie (different browser) is rejected and stores nothing", async () => {
    const calls = mount();
    const { state } = await startFlow("42");
    const r = await fetch(`${base}/api/minutes/calendar/connect/callback?code=abc&state=${encodeURIComponent(state)}`, {
      redirect: "manual",
    });
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toContain("reason=nonce_mismatch");
    expect(calls.upsert).toHaveLength(0);
  });

  test("callback with a tampered state is rejected before anything else", async () => {
    const calls = mount();
    const { nonceCookie } = await startFlow("42");
    const r = await fetch(`${base}/api/minutes/calendar/connect/callback?code=abc&state=forged.sig`, {
      headers: { cookie: nonceCookie }, redirect: "manual",
    });
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toContain("reason=bad_state");
    expect(calls.exchange).toHaveLength(0);
  });

  test("callback with Google access_denied surfaces cancelled without exchanging", async () => {
    const calls = mount();
    const { state, nonceCookie } = await startFlow("42");
    const r = await fetch(`${base}/api/minutes/calendar/connect/callback?error=access_denied&state=${encodeURIComponent(state)}`, {
      headers: { cookie: nonceCookie }, redirect: "manual",
    });
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toContain("reason=cancelled");
    expect(calls.exchange).toHaveLength(0);
  });

  test("a refresh-token-less exchange does NOT clobber the store — surfaces reconnect", async () => {
    const calls = mount({ exchangeResult: { id_token: idToken({ sub: "g", email: "u@x.com" }) } });
    const { state, nonceCookie } = await startFlow("42");
    const r = await fetch(`${base}/api/minutes/calendar/connect/callback?code=abc&state=${encodeURIComponent(state)}`, {
      headers: { cookie: nonceCookie }, redirect: "manual",
    });
    expect(r.headers.get("location")).toContain("reason=no_refresh_token");
    expect(calls.upsert).toHaveLength(0);
  });

  test("GET/POST /calendar/autojoin reads and saves the standing consent + scope (auth required)", async () => {
    const calls = mount();
    const un = await fetch(`${base}/api/minutes/calendar/autojoin`);
    expect(un.status).toBe(401);
    const got = await (await fetch(`${base}/api/minutes/calendar/autojoin`, { headers: { "x-test-user": "42" } })).json();
    expect(got).toEqual(expect.objectContaining({ enabled: true, joinScope: "accepted" }));
    const saved = await fetch(`${base}/api/minutes/calendar/autojoin`, {
      method: "POST",
      headers: { "x-test-user": "42", "content-type": "application/json" },
      body: JSON.stringify({ enabled: true, joinScope: "organizer" }),
    });
    expect(saved.status).toBe(200);
    expect(calls.autojoinSave).toEqual(expect.objectContaining({ userId: "42", enabled: true, joinScope: "organizer" }));
  });

  test("disconnect revokes the specific token and deletes the row (auth required)", async () => {
    const calls = mount();
    const un = await fetch(`${base}/api/minutes/calendar/disconnect`, { method: "POST" });
    expect(un.status).toBe(401);
    const r = await fetch(`${base}/api/minutes/calendar/disconnect`, { method: "POST", headers: { "x-test-user": "42" } });
    expect(r.status).toBe(200);
    expect((await r.json())).toEqual(expect.objectContaining({ disconnected: true, revoked: true }));
    expect(calls.take).toHaveLength(1);
    expect(calls.revoke).toHaveLength(1);
  });
});
