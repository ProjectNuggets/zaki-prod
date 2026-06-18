import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

let createTurnstileMiddleware;

beforeAll(async () => {
  ({ createTurnstileMiddleware } = await import("./turnstile.js"));
});

function makeApp(options = {}) {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  app.post(
    "/signup",
    createTurnstileMiddleware({
      secretKey: "turnstile-secret",
      fetchImpl: options.fetchImpl,
    }),
    (_req, res) => res.status(200).json({ ok: true })
  );
  return app;
}

describe("Cloudflare Turnstile signup gate", () => {
  it("rejects signup when the CAPTCHA token is missing", async () => {
    const fetchImpl = jest.fn();
    const res = await request(makeApp({ fetchImpl }))
      .post("/signup")
      .send({ email: "a@example.com" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: "captcha_required",
      message: "Complete the verification challenge before signing up.",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("verifies the token with Turnstile using the Cloudflare client IP", async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ success: true }),
    }));

    await request(makeApp({ fetchImpl }))
      .post("/signup")
      .set("CF-Connecting-IP", "203.0.113.42")
      .send({ email: "a@example.com", turnstileToken: "token-1" })
      .expect(200);

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
    );
    const body = fetchImpl.mock.calls[0][1].body;
    expect(body.get("secret")).toBe("turnstile-secret");
    expect(body.get("response")).toBe("token-1");
    expect(body.get("remoteip")).toBe("203.0.113.42");
  });
});
