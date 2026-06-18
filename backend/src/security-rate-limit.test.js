import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

let createPersistentRateLimit;
let cleanupExpiredRateLimitHits;

beforeAll(async () => {
  ({ createPersistentRateLimit, cleanupExpiredRateLimitHits } = await import("./security-rate-limit.js"));
});

function createDbBackedCounter() {
  const hits = new Map();
  const dbQuery = jest.fn(async (_sql, params) => {
    const key = params[0];
    const windowMs = Number(params[1]);
    const now = Date.now();
    const existing = hits.get(key);
    const resetAtMs = existing && existing.resetAtMs > now
      ? existing.resetAtMs
      : now + windowMs;
    const totalHits = existing && existing.resetAtMs > now
      ? existing.totalHits + 1
      : 1;
    hits.set(key, { totalHits, resetAtMs });
    return {
      rows: [
        {
          total_hits: totalHits,
          reset_at: new Date(resetAtMs).toISOString(),
        },
      ],
    };
  });
  return { dbQuery, hits };
}

function makeApp({ dbQuery }) {
  const app = express();
  app.set("trust proxy", true);
  app.use(
    "/limited",
    createPersistentRateLimit({
      dbQuery,
      prefix: "test",
      windowMs: 60_000,
      limit: 1,
    })
  );
  app.post("/limited", (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe("persistent Cloudflare-aware rate limiting", () => {
  it("keys requests by CF-Connecting-IP and stores counters through the DB", async () => {
    const { dbQuery } = createDbBackedCounter();
    const app = makeApp({ dbQuery });

    await request(app)
      .post("/limited")
      .set("CF-Connecting-IP", "198.51.100.10")
      .expect(200);

    await request(app)
      .post("/limited")
      .set("CF-Connecting-IP", "198.51.100.11")
      .expect(200);

    const limited = await request(app)
      .post("/limited")
      .set("CF-Connecting-IP", "198.51.100.10");

    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({
      success: false,
      error: "rate_limited",
      message: "Too many requests. Please retry shortly.",
    });
    expect(dbQuery).toHaveBeenCalledTimes(3);
    expect(dbQuery.mock.calls.map(([, params]) => params[0])).toEqual([
      "test:198.51.100.10",
      "test:198.51.100.11",
      "test:198.51.100.10",
    ]);
  });

  it("cleans expired hit rows after the retention window", async () => {
    const dbQuery = jest.fn(async () => ({ rows: [] }));

    await cleanupExpiredRateLimitHits({ dbQuery, retentionHours: 6 });

    expect(dbQuery).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM zaki_rate_limit_hits"),
      [6]
    );
  });
});
