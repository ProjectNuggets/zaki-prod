import { EventEmitter } from "node:events";
import { describe, expect, it, jest } from "@jest/globals";
import { startPostgresNotificationListener } from "./db-notifications.js";

describe("Postgres notification listener", () => {
  it("delivers matching cross-replica notifications and releases its client", async () => {
    const client = new EventEmitter();
    client.query = jest.fn(async () => ({ rows: [] }));
    client.release = jest.fn();
    const payloads = [];

    const stop = await startPostgresNotificationListener({
      connect: async () => client,
      channel: "zaki_imported_context",
      onPayload: (payload) => payloads.push(payload),
    });

    client.emit("notification", {
      channel: "another_channel",
      payload: "ignored",
    });
    client.emit("notification", {
      channel: "zaki_imported_context",
      payload: '{"threadSlug":"thread-7"}',
    });
    await stop();

    expect(payloads).toEqual(['{"threadSlug":"thread-7"}']);
    expect(client.query).toHaveBeenNthCalledWith(1, 'LISTEN "zaki_imported_context"');
    expect(client.query).toHaveBeenNthCalledWith(2, 'UNLISTEN "zaki_imported_context"');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("reconnects after the dedicated listener connection drops", async () => {
    const first = new EventEmitter();
    first.query = jest.fn(async () => ({ rows: [] }));
    first.release = jest.fn();
    const second = new EventEmitter();
    second.query = jest.fn(async () => ({ rows: [] }));
    second.release = jest.fn();
    const clients = [first, second];
    let retry = null;
    const payloads = [];
    const lifecycle = [];

    const stop = await startPostgresNotificationListener({
      connect: async () => clients.shift(),
      channel: "zaki_imported_context",
      onPayload: (payload) => payloads.push(payload),
      onConnected: () => lifecycle.push("connected"),
      onDisconnected: () => lifecycle.push("disconnected"),
      scheduleRetry(callback) {
        retry = callback;
        return { unref() {} };
      },
      clearRetry() {},
    });

    first.emit("error", new Error("connection lost"));
    await retry();
    second.emit("notification", {
      channel: "zaki_imported_context",
      payload: "fresh",
    });
    await stop();

    expect(first.release).toHaveBeenCalledTimes(1);
    expect(second.query).toHaveBeenCalledWith('LISTEN "zaki_imported_context"');
    expect(payloads).toEqual(["fresh"]);
    expect(lifecycle).toEqual(["connected", "disconnected", "connected"]);
  });

  it("keeps retrying when the initial listener connection fails", async () => {
    const client = new EventEmitter();
    client.query = jest.fn(async () => ({ rows: [] }));
    client.release = jest.fn();
    let attempts = 0;
    let retry = null;
    const errors = [];
    const lifecycle = [];

    const stop = await startPostgresNotificationListener({
      connect: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("database starting");
        return client;
      },
      channel: "zaki_imported_context",
      onPayload() {},
      onError: (error) => errors.push(error.message),
      onConnected: () => lifecycle.push("connected"),
      onDisconnected: () => lifecycle.push("disconnected"),
      scheduleRetry(callback) {
        retry = callback;
        return { unref() {} };
      },
      clearRetry() {},
    });

    expect(attempts).toBe(1);
    expect(errors).toEqual(["database starting"]);
    expect(lifecycle).toEqual(["disconnected"]);

    await retry();
    await stop();

    expect(attempts).toBe(2);
    expect(client.query).toHaveBeenCalledWith('LISTEN "zaki_imported_context"');
    expect(lifecycle).toEqual(["disconnected", "connected"]);
  });
});
