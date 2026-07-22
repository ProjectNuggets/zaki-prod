import express from "express";
import request from "supertest";
import { describe, expect, jest, test } from "@jest/globals";
import { buildDesignWorkbenchRouter } from "./design-workbench-routes.js";

describe("Design workbench routes", () => {
  test("authenticates and streams the controller-hosted bundle", async () => {
    const workbench = jest.fn().mockResolvedValue(new Response("<html>design</html>", {
      headers: { "content-type": "text/html", etag: "bundle-v1" },
    }));
    const resolveAccess = jest.fn().mockReturnValue({
      userId: "42", sessionId: "sess_01", projectId: "project_01", generation: 7,
    });
    const app = express();
    app.use("/api/design/workbench", buildDesignWorkbenchRouter({
      enabled: true,
      resolveAccess,
      controller: { workbench },
      getRequestId: () => "req_ui",
    }));

    const response = await request(app).get(
      "/api/design/workbench/projects/project_01?sessionId=sess_01&projectId=project_01",
    );
    expect(response.status).toBe(200);
    expect(response.text).toBe("<html>design</html>");
    expect(response.headers.etag).toBe("bundle-v1");
    expect(workbench).toHaveBeenCalledWith(expect.objectContaining({
      targetPath: "/projects/project_01?sessionId=sess_01&projectId=project_01", method: "GET", requestId: "req_ui",
    }));
    expect(resolveAccess).toHaveBeenCalledWith(expect.anything(), "sess_01");
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

  test("rejects a project navigation that does not match its session credential", async () => {
    const controller = { workbench: jest.fn().mockResolvedValue(new Response("unexpected")) };
    const app = express();
    app.use("/api/design/workbench", buildDesignWorkbenchRouter({
      enabled: true,
      resolveAccess: jest.fn().mockReturnValue({
        userId: "42", sessionId: "sess_01", projectId: "project_01", generation: 7,
      }),
      controller,
      getRequestId: () => "req_mismatch",
    }));

    const response = await request(app)
      .get("/api/design/workbench/projects/project_02?sessionId=sess_01&projectId=project_02&projectName=Other");

    expect(response.status).toBe(401);
    expect(controller.workbench).not.toHaveBeenCalled();
  });

  test("rejects a root bootstrap whose query does not match its session credential", async () => {
    const controller = { workbench: jest.fn().mockResolvedValue(new Response("unexpected")) };
    const app = express();
    app.use("/api/design/workbench", buildDesignWorkbenchRouter({
      enabled: true,
      resolveAccess: jest.fn().mockReturnValue({
        userId: "42", sessionId: "sess_01", projectId: "project_01", generation: 7,
      }),
      controller,
      getRequestId: () => "req_root_mismatch",
    }));

    const response = await request(app)
      .get("/api/design/workbench/?sessionId=sess_02&projectId=project_02&projectName=Other");

    expect(response.status).toBe(401);
    expect(controller.workbench).not.toHaveBeenCalled();
  });
});
