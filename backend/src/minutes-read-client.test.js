import { describe, expect, jest, test } from "@jest/globals";
import {
  fetchMinutesIndex,
  fetchMinutesItem,
  fetchMinutesSearch,
  getMinutesReadBase,
} from "./minutes-read-client.js";

const BASE_OPTIONS = Object.freeze({
  baseUrl: "http://minutes-api:8056/",
  readToken: "m".repeat(32),
  userId: "42",
  requestId: "req-minutes-01",
  timeoutMs: 5_000,
});

describe("Minutes read client", () => {
  test("normalizes a fixed HTTP service origin and rejects unsafe bases", () => {
    expect(getMinutesReadBase(" http://minutes-api:8056/ ")).toBe("http://minutes-api:8056");
    expect(getMinutesReadBase("https://minutes.example.test")).toBe("https://minutes.example.test");
    expect(() => getMinutesReadBase("http://user:secret@minutes-api:8056")).toThrow("invalid_minutes_read_base_url");
    expect(() => getMinutesReadBase("file:///etc/passwd")).toThrow("invalid_minutes_read_base_url");
    expect(() => getMinutesReadBase("https://minutes.example.test/api/zaki/read/v1")).toThrow("invalid_minutes_read_base_url");
  });

  test("calls the live index route with only server-owned identity headers", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await fetchMinutesIndex({
      ...BASE_OPTIONS,
      since: "2026-07-01T00:00:00.000Z",
      limit: 50,
      cursor: "opaque+/cursor=",
      fetchWithTimeout,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://minutes-api:8056/api/zaki/read/v1/42/index?since=2026-07-01T00%3A00%3A00.000Z&limit=50&cursor=opaque%2B%2Fcursor%3D",
      {
        method: "GET",
        redirect: "error",
        headers: {
          Accept: "application/json",
          "X-Zaki-Read-Token": "m".repeat(32),
          "X-Zaki-User-Id": "42",
          "X-Request-Id": "req-minutes-01",
        },
      },
      5_000,
      "Minutes read index request"
    );
  });

  test("calls only the sealed item route and encodes the opaque item id", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await fetchMinutesItem({
      ...BASE_OPTIONS,
      itemId: "transcript:17",
      variant: "summary",
      fetchWithTimeout,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://minutes-api:8056/api/zaki/read/v1/42/item/transcript%3A17?variant=summary",
      expect.objectContaining({ method: "GET", redirect: "error" }),
      5_000,
      "Minutes read item request"
    );
  });

  test("accepts every contract-valid opaque item identifier", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await fetchMinutesItem({
      ...BASE_OPTIONS,
      itemId: "transcript_example_01",
      variant: "full",
      fetchWithTimeout,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://minutes-api:8056/api/zaki/read/v1/42/item/transcript_example_01?variant=full",
      expect.objectContaining({ method: "GET", redirect: "error" }),
      5_000,
      "Minutes read item request"
    );
  });

  test("translates BFF POST-search input to the sealed upstream GET without accepting a path", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await fetchMinutesSearch({
      ...BASE_OPTIONS,
      query: "project alpha / budget",
      limit: 20,
      cursor: "next-page",
      fetchWithTimeout,
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://minutes-api:8056/api/zaki/read/v1/42/search?q=project+alpha+%2F+budget&limit=20&cursor=next-page",
      expect.objectContaining({ method: "GET", redirect: "error" }),
      5_000,
      "Minutes read search request"
    );
  });

  test("fails before network work for invalid credentials, identity, controls, and item ids", async () => {
    const fetchWithTimeout = jest.fn();
    const cases = [
      fetchMinutesIndex({ ...BASE_OPTIONS, readToken: "short", fetchWithTimeout }),
      fetchMinutesIndex({ ...BASE_OPTIONS, userId: "../../admin", fetchWithTimeout }),
      fetchMinutesIndex({ ...BASE_OPTIONS, limit: 201, fetchWithTimeout }),
      fetchMinutesIndex({ ...BASE_OPTIONS, limit: "1e2", fetchWithTimeout }),
      fetchMinutesIndex({ ...BASE_OPTIONS, limit: ["1"], fetchWithTimeout }),
      fetchMinutesIndex({ ...BASE_OPTIONS, cursor: "x".repeat(2_049), fetchWithTimeout }),
      fetchMinutesIndex({ ...BASE_OPTIONS, cursor: ["page-2"], fetchWithTimeout }),
      fetchMinutesItem({ ...BASE_OPTIONS, itemId: "../../healthz", fetchWithTimeout }),
      fetchMinutesItem({ ...BASE_OPTIONS, itemId: "meeting:1", variant: "raw", fetchWithTimeout }),
      fetchMinutesSearch({ ...BASE_OPTIONS, query: "   ", fetchWithTimeout }),
      fetchMinutesSearch({ ...BASE_OPTIONS, query: "x".repeat(513), fetchWithTimeout }),
    ];

    for (const pending of cases) {
      await expect(pending).rejects.toThrow();
    }
    expect(fetchWithTimeout).not.toHaveBeenCalled();
  });
});
