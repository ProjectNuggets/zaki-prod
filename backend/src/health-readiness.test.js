import { describe, expect, test } from "@jest/globals";
import { buildBackendHealthStatus, buildBackendReadyStatus } from "./health-readiness.js";

describe("health readiness helpers", () => {
  test("builds healthy payloads", () => {
    const health = buildBackendHealthStatus();

    expect(health.ok).toBe(true);
    expect(health.statusCode).toBe(200);
    expect(health.body).toEqual(
      expect.objectContaining({
        ok: true,
        status: "healthy",
        database: "connected",
      })
    );
  });

  test("builds unhealthy payloads from db errors", () => {
    const health = buildBackendHealthStatus(new Error("db offline"));

    expect(health.ok).toBe(false);
    expect(health.statusCode).toBe(503);
    expect(health.body).toEqual({
      ok: false,
      status: "unhealthy",
      database: "disconnected",
      error: "db offline",
    });
  });

  test("builds ready payload when healthy and not draining", () => {
    const health = buildBackendHealthStatus();
    const ready = buildBackendReadyStatus({ health });

    expect(ready.statusCode).toBe(200);
    expect(ready.body).toEqual(
      expect.objectContaining({
        ok: true,
        status: "ready",
        database: "connected",
        dependencies: {},
      })
    );
  });

  test("builds not_ready payload when health is unhealthy", () => {
    const health = buildBackendHealthStatus(new Error("db offline"));
    const ready = buildBackendReadyStatus({ health });

    expect(ready.statusCode).toBe(503);
    expect(ready.body).toEqual({
      ok: false,
      status: "not_ready",
      database: "disconnected",
      error: "db offline",
      retryable: true,
      dependencies: {},
    });
  });

  test("builds not_ready when a dependency is blocking", () => {
    const health = buildBackendHealthStatus();
    const ready = buildBackendReadyStatus({
      health,
      dependencies: {
        learning: {
          ok: false,
          status: "unavailable",
          enabled: true,
        },
      },
    });

    expect(ready.statusCode).toBe(503);
    expect(ready.body).toEqual(
      expect.objectContaining({
        ok: false,
        status: "not_ready",
        retryable: true,
        dependencies: {
          learning: expect.objectContaining({
            ok: false,
            status: "unavailable",
            enabled: true,
          }),
        },
      })
    );
  });

  test("builds draining payload while shutting down", () => {
    const health = buildBackendHealthStatus();
    const ready = buildBackendReadyStatus({
      health,
      isDraining: true,
      shutdownSignal: "SIGTERM",
    });

    expect(ready.statusCode).toBe(503);
    expect(ready.body).toEqual({
      ok: false,
      status: "draining",
      signal: "SIGTERM",
      retryable: true,
      dependencies: {},
    });
  });
});
