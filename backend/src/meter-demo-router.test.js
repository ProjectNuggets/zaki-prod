import { describe, expect, it, jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import { buildMeterDemoRouter } from "./meter-demo-router.js";

function mountRouter(router) {
  const app = express();
  app.use(router);
  return app;
}

describe("meter-demo-router: client-facing error hardening", () => {
  it("returns 404 not_found JSON when disabled", async () => {
    const router = buildMeterDemoRouter({
      resolveUser: jest.fn(),
      enabled: false,
    });
    const res = await request(mountRouter(router)).post("/api/meter/demo").send({});
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  it("returns 401 unauthorized JSON when the user cannot be resolved", async () => {
    const router = buildMeterDemoRouter({
      resolveUser: jest.fn(async () => null),
      enabled: true,
    });
    const res = await request(mountRouter(router)).post("/api/meter/demo").send({});
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthorized" });
  });

  it("returns a generic 500 code and does NOT echo raw err.message to the client", async () => {
    const secret =
      "connect ECONNREFUSED 10.0.3.14:6432 postgres://meter:s3cr3t@internal-db";
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const router = buildMeterDemoRouter({
      // Throwing inside the handler's try block exercises the catch.
      resolveUser: jest.fn(async () => {
        throw new Error(secret);
      }),
      enabled: true,
    });

    const res = await request(mountRouter(router)).post("/api/meter/demo").send({});

    expect(res.status).toBe(500);
    // Stable code only — the previous `message: err?.message` field is gone.
    expect(res.body).toEqual({ error: "meter_demo_error" });
    expect(res.body).not.toHaveProperty("message");
    expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(res.body)).not.toContain("s3cr3t");
    // Detail still reaches the server log for operators.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[MeterDemo] Metered operation error:",
      expect.objectContaining({ message: secret })
    );

    consoleErrorSpy.mockRestore();
  });
});
