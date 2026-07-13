import express from "express";
import request from "supertest";
import { describe, expect, jest, test } from "@jest/globals";
import { buildDesignInternalReadRouter } from "./design-internal-read-routes.js";

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
});
