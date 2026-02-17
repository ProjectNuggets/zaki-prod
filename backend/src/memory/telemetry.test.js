import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  configureMemoryTelemetryAlerts,
  getMemoryTelemetrySnapshot,
  recordMemoryTelemetry,
  resetMemoryTelemetryForTests,
  setMemoryTelemetrySseClients,
} from "./telemetry.js";

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe("memory telemetry alerts", () => {
  beforeEach(() => {
    resetMemoryTelemetryForTests();
  });

  it("emits high error-rate alerts and forwards to webhook sink", async () => {
    const sink = jest.fn();
    configureMemoryTelemetryAlerts({ onAlert: sink });

    for (let i = 0; i < 20; i += 1) {
      recordMemoryTelemetry("request.preview");
    }
    for (let i = 0; i < 4; i += 1) {
      recordMemoryTelemetry("pipeline.error");
    }
    await flush();

    const snapshot = getMemoryTelemetrySnapshot();
    const highError = snapshot.alerts.find((item) => item.id === "high_error_rate");

    expect(highError).toBeTruthy();
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]?.id).toBe("high_error_rate");
    expect(snapshot.ratios.errorRate).toBeGreaterThanOrEqual(0.15);
  });

  it("rate-limits duplicate alerts inside cooldown window", async () => {
    const sink = jest.fn();
    configureMemoryTelemetryAlerts({ onAlert: sink });

    for (let i = 0; i < 40; i += 1) {
      recordMemoryTelemetry("request.preview");
    }
    for (let i = 0; i < 8; i += 1) {
      recordMemoryTelemetry("pipeline.error");
    }
    await flush();

    expect(sink).toHaveBeenCalledTimes(1);
  });

  it("alerts when SSE connection count is high", async () => {
    const sink = jest.fn();
    configureMemoryTelemetryAlerts({ onAlert: sink });

    setMemoryTelemetrySseClients(500);
    await flush();

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]?.id).toBe("high_sse_connections");
  });
});
