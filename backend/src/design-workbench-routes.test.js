import express from "express";
import request from "supertest";
import { describe, expect, jest, test } from "@jest/globals";
import { buildDesignWorkbenchRouter } from "./design-workbench-routes.js";

describe("Design workbench routes", () => {
  test("authenticates and streams the controller-hosted bundle", async () => {
    const workbench = jest.fn().mockResolvedValue(new Response("<html>design</html>", {
      headers: { "content-type": "text/html", etag: "bundle-v1" },
    }));
    const app = express();
    app.use("/api/design/workbench", buildDesignWorkbenchRouter({
      enabled: true,
      resolveAccess: jest.fn().mockReturnValue({ userId: "42" }),
      controller: { workbench },
      getRequestId: () => "req_ui",
    }));

    const response = await request(app).get("/api/design/workbench/projects/project_01?sessionId=sess_01");
    expect(response.status).toBe(200);
    expect(response.text).toBe("<html>design</html>");
    expect(response.headers.etag).toBe("bundle-v1");
    expect(workbench).toHaveBeenCalledWith(expect.objectContaining({
      targetPath: "/projects/project_01?sessionId=sess_01", method: "GET", requestId: "req_ui",
    }));
  });

  test("stays dark when disabled and rejects mutations before authentication", async () => {
    const resolveAccess = jest.fn();
    const controller = { workbench: jest.fn() };
    const disabled = express();
    disabled.use("/api/design/workbench", buildDesignWorkbenchRouter({
      enabled: false, resolveAccess, controller, getRequestId: () => "req_off",
    }));
    expect((await request(disabled).get("/api/design/workbench/")).status).toBe(404);

    const enabled = express();
    enabled.use("/api/design/workbench", buildDesignWorkbenchRouter({
      enabled: true, resolveAccess, controller, getRequestId: () => "req_method",
    }));
    expect((await request(enabled).post("/api/design/workbench/")).status).toBe(405);
    expect(resolveAccess).not.toHaveBeenCalled();
    expect(controller.workbench).not.toHaveBeenCalled();
  });

  test("rejects bundle delivery without scoped workbench access", async () => {
    const app = express();
    app.use("/api/design/workbench", buildDesignWorkbenchRouter({
      enabled: true, resolveAccess: jest.fn().mockReturnValue(null), controller: { workbench: jest.fn() },
      getRequestId: () => "req_auth",
    }));
    expect((await request(app).get("/api/design/workbench/")).status).toBe(401);
  });
});
