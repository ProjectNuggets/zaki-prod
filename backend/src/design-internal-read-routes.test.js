import express from "express";
import request from "supertest";
import { describe, expect, jest, test } from "@jest/globals";
import {
  BadCursorError,
  buildDesignInternalReadRouter,
  createDesignInternalReadSource,
  resolveDesignReadCursorSecrets,
} from "./design-internal-read-routes.js";

// A dedicated cursor secret — deliberately NOT a callback token (key separation).
const CURSOR_SECRET = "design-read-cursor-secret-0001";
const PREVIOUS_CURSOR_SECRET = "design-read-cursor-secret-0000";

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
    // Tamper a ciphertext BYTE, not the base64url text. Flipping the last char is
    // non-deterministic: the final char of a 203-char (152-byte) cursor holds 2
    // padding bits the decoder discards, so "A"->"B" is a no-op ~1/16 of mints and
    // leaves a VALID cursor (the old intermittent flake). A byte between the 12-byte
    // IV and the 16-byte GCM tag always fails authentication.
    const raw = Buffer.from(cursor, "base64url");
    raw[12] ^= 0xff;
    const source = createDesignInternalReadSource({ dbQuery: jest.fn(), cursorSecret: CURSOR_SECRET });
    await expect(
      source.index({ userId: "42", limit: 1, cursor: raw.toString("base64url") })
    ).rejects.toBeInstanceOf(BadCursorError);
  });

  test("decodeCursor rejects known-malformed cursors as BadCursorError", async () => {
    // Fixed inputs, no minting/RNG: the decode contract must fail closed on every
    // shape of bad cursor (tampered, truncated, foreign text) with BadCursorError,
    // never a raw TypeError.
    const source = createDesignInternalReadSource({ dbQuery: jest.fn(), cursorSecret: CURSOR_SECRET });
    const malformed = [
      Buffer.alloc(60).toString("base64url"), // valid length, zeroed iv/ct/tag -> GCM auth fails
      Buffer.alloc(20).toString("base64url"), // <= IV(12)+TAG(16) -> length guard
      "@".repeat(64), // non-base64url text -> decodes to garbage that fails GCM
    ];
    for (const cursor of malformed) {
      await expect(source.index({ userId: "42", limit: 1, cursor })).rejects.toBeInstanceOf(BadCursorError);
    }
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

  test("the cursor is opaque ciphertext: no payload field or user id is readable without the key", async () => {
    const dbQuery = jest.fn().mockResolvedValue({
      rows: [projectRow("p2", "2026-07-02T00:00:00.000Z"), projectRow("p1", "2026-07-01T00:00:00.000Z")],
    });
    const source = createDesignInternalReadSource({ dbQuery, cursorSecret: CURSOR_SECRET });
    const page = await source.index({ userId: "31337", since: undefined, limit: 1 });
    const raw = Buffer.from(page.next_cursor, "base64url");

    // base64url(iv || ciphertext || tag): decoding it yields no JSON and none of
    // the payload's field names or values (the old HMAC form exposed
    // {"user":"31337",...} to anyone, keyless).
    expect(() => JSON.parse(raw.toString("utf8"))).toThrow();
    const visible = raw.toString("utf8");
    expect(visible).not.toContain('"user"');
    expect(visible).not.toContain('"route"');
    expect(visible).not.toContain("31337");

    // Semantic security: the same page minted twice yields different wire bytes
    // (random IV), so cursors cannot be correlated across responses either.
    const again = await source.index({ userId: "31337", since: undefined, limit: 1 });
    expect(again.next_cursor).not.toBe(page.next_cursor);

    // ...and it still round-trips through the real decode path.
    await source.index({ userId: "31337", since: undefined, limit: 1, cursor: page.next_cursor });
    expect(dbQuery.mock.calls[2][1]).toEqual([31337, null, 2, 1]);
  });

  test("accepts a cursor minted under the previous secret (decrypt-only rotation)", async () => {
    const outstanding = await mintCursor(PREVIOUS_CURSOR_SECRET);

    // After rotation the outstanding cursor still resumes...
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    const rotated = createDesignInternalReadSource({
      dbQuery,
      cursorSecret: CURSOR_SECRET,
      previousCursorSecret: PREVIOUS_CURSOR_SECRET,
    });
    await rotated.index({ userId: "42", since: undefined, limit: 1, cursor: outstanding });
    expect(dbQuery.mock.calls[0][1]).toEqual([42, null, 2, 1]);

    // ...but once the previous secret is dropped, the old cursor is dead.
    const dropped = createDesignInternalReadSource({ dbQuery: jest.fn(), cursorSecret: CURSOR_SECRET });
    await expect(
      dropped.index({ userId: "42", limit: 1, cursor: outstanding })
    ).rejects.toBeInstanceOf(BadCursorError);
  });

  test("new cursors are minted under the current secret, not the previous one", async () => {
    const dbQuery = jest.fn().mockResolvedValue({
      rows: [projectRow("p2", "2026-07-02T00:00:00.000Z"), projectRow("p1", "2026-07-01T00:00:00.000Z")],
    });
    const rotated = createDesignInternalReadSource({
      dbQuery,
      cursorSecret: CURSOR_SECRET,
      previousCursorSecret: PREVIOUS_CURSOR_SECRET,
    });
    const page = await rotated.index({ userId: "42", since: undefined, limit: 1 });

    // A source knowing only the CURRENT secret must accept it: proof it was not
    // minted under the previous (decrypt-only) key.
    const currentOnly = createDesignInternalReadSource({ dbQuery, cursorSecret: CURSOR_SECRET });
    await currentOnly.index({ userId: "42", since: undefined, limit: 1, cursor: page.next_cursor });
    expect(dbQuery.mock.calls[1][1]).toEqual([42, null, 2, 1]);
  });

  test("clamps titles to 512 UTF-8 bytes on a code-point boundary, not 512 UTF-16 units", async () => {
    const cjk = "題".repeat(600); // 600 chars x 3 bytes = 1,800 UTF-8 bytes
    const emoji = "\u{1f4a0}".repeat(200); // 200 chars x 4 bytes = 800 UTF-8 bytes
    const dbQuery = jest.fn().mockResolvedValue({
      rows: [projectRow("p1", "2026-07-01T00:00:00.000Z"), projectRow("p2", "2026-07-02T00:00:00.000Z")],
    });
    dbQuery.mockResolvedValueOnce({
      rows: [
        { ...projectRow("p1", "2026-07-01T00:00:00.000Z"), name: cjk },
        { ...projectRow("p2", "2026-07-02T00:00:00.000Z"), name: emoji },
        { ...projectRow("p3", "2026-07-03T00:00:00.000Z"), name: "control\u0000\u0001chars" },
      ],
    });
    const source = createDesignInternalReadSource({ dbQuery, cursorSecret: CURSOR_SECRET });

    const page = await source.index({ userId: "42", since: undefined, limit: 3 });

    const [cjkTitle, emojiTitle, scrubbedTitle] = page.items.map((item) => item.title);
    // 170 x 3 = 510 bytes; a 171st character would cross 512.
    expect(cjkTitle).toBe("題".repeat(170));
    expect(Buffer.byteLength(cjkTitle, "utf8")).toBeLessThanOrEqual(512);
    // 128 x 4 = exactly 512 bytes; no split surrogate pair at the boundary.
    expect(emojiTitle).toBe("\u{1f4a0}".repeat(128));
    expect(Buffer.byteLength(emojiTitle, "utf8")).toBe(512);
    expect(() => new TextEncoder().encode(emojiTitle)).not.toThrow();
    // Control characters cannot reach the wire (bounds JSON escape inflation to 2x).
    expect(scrubbedTitle).toBe("control  chars");
  });
});

describe("resolveDesignReadCursorSecrets", () => {
  test("read plane enabled without a dedicated secret fails loudly at startup", () => {
    expect(() =>
      resolveDesignReadCursorSecrets({
        readEnabled: true,
        secret: "",
        previousSecret: "",
        callbackToken: "hub-callback-token-value",
      })
    ).toThrow(/DESIGN_READ_CURSOR_SECRET/);
  });

  test("never accepts the callback token as the cursor secret", () => {
    expect(() =>
      resolveDesignReadCursorSecrets({
        readEnabled: true,
        secret: "hub-callback-token-value",
        callbackToken: "hub-callback-token-value",
      })
    ).toThrow(/distinct/);
    expect(() =>
      resolveDesignReadCursorSecrets({
        readEnabled: false,
        secret: CURSOR_SECRET,
        previousSecret: "hub-callback-token-value",
        callbackToken: "hub-callback-token-value",
      })
    ).toThrow(/distinct/);
  });

  test("resolves null (routes unmounted) when the plane is off and no secret exists", () => {
    expect(
      resolveDesignReadCursorSecrets({
        readEnabled: false,
        secret: "",
        previousSecret: "",
        callbackToken: "hub-callback-token-value",
      })
    ).toBeNull();
  });

  test("passes a configured secret pair through", () => {
    expect(
      resolveDesignReadCursorSecrets({
        readEnabled: true,
        secret: CURSOR_SECRET,
        previousSecret: PREVIOUS_CURSOR_SECRET,
        callbackToken: "hub-callback-token-value",
      })
    ).toEqual({ cursorSecret: CURSOR_SECRET, previousCursorSecret: PREVIOUS_CURSOR_SECRET });
  });
});
