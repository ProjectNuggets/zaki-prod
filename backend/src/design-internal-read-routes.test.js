import express from "express";
import request from "supertest";
import { describe, expect, jest, test } from "@jest/globals";
import {
  BadCursorError,
  buildDesignInternalReadRouter,
  createDesignInternalReadSource,
} from "./design-internal-read-routes.js";

const CURSOR_SECRET = "design-hub-callback-secret-value";

function projectRow(id, updatedAt) {
  return {
    project_id: id,
    name: `Workspace ${id}`,
    status: "active",
    metadata_json: {},
    updated_at: updatedAt,
  };
}

describe("Design internal read routes", () => {
  test("serves a bounded project index to the callback-authenticated controller", async () => {
    const index = jest.fn().mockResolvedValue({
      items: [{
        id: "project_01",
        kind: "project",
        title: "Launch concepts",
        updated_at: "2026-07-13T12:00:00.000Z",
      }],
      truncated: false,
    });
    const app = express();
    app.use("/internal/design/read/v1", buildDesignInternalReadRouter({
      callbackToken: "controller-hub-callback-secret",
      source: { index, item: jest.fn(), search: jest.fn() },
    }));

    const response = await request(app)
      .get("/internal/design/read/v1/users/42/index?limit=999")
      .set("authorization", "Bearer controller-hub-callback-secret")
      .set("x-request-id", "req_read_01");
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(index).toHaveBeenCalledWith({
      userId: "42",
      since: undefined,
      limit: 200,
      requestId: "req_read_01",
    });
  });

  test("does not call the source with a different or invalid callback bearer", async () => {
    const index = jest.fn();
    const app = express();
    app.use("/internal/design/read/v1", buildDesignInternalReadRouter({
      callbackToken: "controller-hub-callback-secret",
      source: { index, item: jest.fn(), search: jest.fn() },
    }));
    const response = await request(app)
      .get("/internal/design/read/v1/users/42/index")
      .set("authorization", "Bearer wrong-secret");
    expect(response.status).toBe(401);
    expect(index).not.toHaveBeenCalled();
  });

  test("forwards a well-formed cursor to the source", async () => {
    const index = jest.fn().mockResolvedValue({ items: [], truncated: false });
    const app = express();
    app.use("/internal/design/read/v1", buildDesignInternalReadRouter({
      callbackToken: "controller-hub-callback-secret",
      source: { index, item: jest.fn(), search: jest.fn() },
    }));
    const response = await request(app)
      .get("/internal/design/read/v1/users/42/index?cursor=abc_DEF-123")
      .set("authorization", "Bearer controller-hub-callback-secret")
      .set("x-request-id", "req_cursor_01");
    expect(response.status).toBe(200);
    expect(index).toHaveBeenCalledWith({
      userId: "42",
      since: undefined,
      limit: 50,
      requestId: "req_cursor_01",
      cursor: "abc_DEF-123",
    });
  });

  test("rejects a malformed cursor with 400 without touching the source", async () => {
    const index = jest.fn();
    const app = express();
    app.use("/internal/design/read/v1", buildDesignInternalReadRouter({
      callbackToken: "controller-hub-callback-secret",
      source: { index, item: jest.fn(), search: jest.fn() },
    }));
    const response = await request(app)
      .get("/internal/design/read/v1/users/42/index?cursor=not%20base64url%21")
      .set("authorization", "Bearer controller-hub-callback-secret");
    expect(response.status).toBe(400);
    expect(index).not.toHaveBeenCalled();
  });

  test("maps a source BadCursorError to 400, not 503", async () => {
    const index = jest.fn().mockRejectedValue(new BadCursorError());
    const app = express();
    app.use("/internal/design/read/v1", buildDesignInternalReadRouter({
      callbackToken: "controller-hub-callback-secret",
      source: { index, item: jest.fn(), search: jest.fn() },
    }));
    const response = await request(app)
      .get("/internal/design/read/v1/users/42/index?cursor=signedbutstale")
      .set("authorization", "Bearer controller-hub-callback-secret");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BAD_CURSOR");
  });

  test("a malformed-shape cursor is INVALID_REQUEST, distinct from a bad-signature BAD_CURSOR", async () => {
    const app = express();
    app.use("/internal/design/read/v1", buildDesignInternalReadRouter({
      callbackToken: "controller-hub-callback-secret",
      source: { index: jest.fn(), item: jest.fn(), search: jest.fn() },
    }));
    const response = await request(app)
      .get("/internal/design/read/v1/users/42/index?cursor=bad%20shape")
      .set("authorization", "Bearer controller-hub-callback-secret");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REQUEST");
  });
});

describe("createDesignInternalReadSource", () => {
  test("returns an empty page for zero rows and never queries zaki_users (no existence oracle)", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    const source = createDesignInternalReadSource({ dbQuery, cursorSecret: CURSOR_SECRET });

    const page = await source.index({ userId: "42", since: undefined, limit: 50 });

    expect(page).toEqual({ items: [], truncated: false });
    expect(page.next_cursor).toBeUndefined();
    // The oracle is closed at the SQL layer: no join to the users table.
    expect(dbQuery.mock.calls[0][0]).not.toMatch(/zaki_users/);
    expect(dbQuery.mock.calls[0][1]).toEqual([42, null, 51, 0]);
  });

  test("emits a signed next_cursor on a full page and resumes at the right offset", async () => {
    const dbQuery = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          projectRow("p3", "2026-07-03T00:00:00.000Z"),
          projectRow("p2", "2026-07-02T00:00:00.000Z"),
          projectRow("p1", "2026-07-01T00:00:00.000Z"),
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const source = createDesignInternalReadSource({ dbQuery, cursorSecret: CURSOR_SECRET });

    const page1 = await source.index({ userId: "42", since: undefined, limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.truncated).toBe(true);
    expect(typeof page1.next_cursor).toBe("string");
    expect(dbQuery.mock.calls[0][1]).toEqual([42, null, 3, 0]);

    await source.index({ userId: "42", since: undefined, limit: 2, cursor: page1.next_cursor });
    // second page seeks past the two already-returned rows
    expect(dbQuery.mock.calls[1][1]).toEqual([42, null, 3, 2]);
  });

  async function mintCursor(secret) {
    const dbQuery = jest.fn().mockResolvedValue({
      rows: [projectRow("p2", "2026-07-02T00:00:00.000Z"), projectRow("p1", "2026-07-01T00:00:00.000Z")],
    });
    const source = createDesignInternalReadSource({ dbQuery, cursorSecret: secret });
    const page = await source.index({ userId: "42", since: undefined, limit: 1 });
    return page.next_cursor;
  }

  test("rejects a tampered cursor", async () => {
    const cursor = await mintCursor(CURSOR_SECRET);
    const tampered = `${cursor.slice(0, -1)}${cursor.endsWith("A") ? "B" : "A"}`;
    const source = createDesignInternalReadSource({ dbQuery: jest.fn(), cursorSecret: CURSOR_SECRET });
    await expect(source.index({ userId: "42", limit: 1, cursor: tampered })).rejects.toBeInstanceOf(BadCursorError);
  });

  test("rejects a cursor minted for a different user", async () => {
    const cursor = await mintCursor(CURSOR_SECRET);
    const source = createDesignInternalReadSource({ dbQuery: jest.fn(), cursorSecret: CURSOR_SECRET });
    await expect(source.index({ userId: "99", limit: 1, cursor })).rejects.toBeInstanceOf(BadCursorError);
  });

  test("rejects an index cursor replayed on the search route", async () => {
    const cursor = await mintCursor(CURSOR_SECRET);
    const source = createDesignInternalReadSource({ dbQuery: jest.fn(), cursorSecret: CURSOR_SECRET });
    await expect(source.search({ userId: "42", query: "x", limit: 1, cursor })).rejects.toBeInstanceOf(BadCursorError);
  });

  test("rejects an index cursor replayed with a different since filter", async () => {
    const dbQuery = jest.fn().mockResolvedValue({
      rows: [projectRow("p2", "2026-07-02T00:00:00.000Z"), projectRow("p1", "2026-07-01T00:00:00.000Z")],
    });
    const source = createDesignInternalReadSource({ dbQuery, cursorSecret: CURSOR_SECRET });
    const page = await source.index({ userId: "42", since: "2026-07-01T00:00:00.000Z", limit: 1 });

    // Same filter resumes cleanly...
    await source.index({ userId: "42", since: "2026-07-01T00:00:00.000Z", limit: 1, cursor: page.next_cursor });
    // ...a different since is rejected rather than paging the wrong result set.
    await expect(
      source.index({ userId: "42", since: "2026-06-01T00:00:00.000Z", limit: 1, cursor: page.next_cursor })
    ).rejects.toBeInstanceOf(BadCursorError);
  });
});
