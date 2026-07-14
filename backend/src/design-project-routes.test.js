import express from "express";
import request from "supertest";
import { describe, expect, jest, test } from "@jest/globals";
import { buildDesignProjectRouter } from "./design-project-routes.js";

describe("Design controller-mode project routes", () => {
  test("lists central projects for the authenticated user without contacting a worker", async () => {
    const listProjects = jest.fn().mockResolvedValue([{
      id: "design-1",
      name: "Brand system",
      status: { value: "active" },
      metadata: {},
    }]);
    const app = express();
    app.use("/api/design/projects", buildDesignProjectRouter({
      enabled: true,
      controllerMode: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      listProjects,
      createProject: jest.fn(),
      createProjectId: jest.fn(),
      getRequestId: () => "req-list",
    }));

    const response = await request(app).get("/api/design/projects");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ projects: [{
      id: "design-1",
      name: "Brand system",
      status: { value: "active" },
      metadata: {},
    }] });
    expect(listProjects).toHaveBeenCalledWith({ userId: 42 });
  });

  test("creates only the Hub project record with a server-owned id", async () => {
    const createProject = jest.fn().mockResolvedValue({
      id: "design-generated",
      name: "Launch concepts",
      status: { value: "active" },
      metadata: { kind: "responsive-web" },
    });
    const app = express();
    app.use("/api/design/projects", buildDesignProjectRouter({
      enabled: true,
      controllerMode: true,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      listProjects: jest.fn(),
      createProject,
      createProjectId: () => "design-generated",
      getRequestId: () => "req-create",
    }));

    const response = await request(app)
      .post("/api/design/projects")
      .send({
        id: "browser-controlled",
        name: "Launch concepts",
        metadata: { kind: "responsive-web" },
      });

    expect(response.status).toBe(201);
    expect(response.body.project.id).toBe("design-generated");
    expect(createProject).toHaveBeenCalledWith({
      userId: 42,
      projectId: "design-generated",
      name: "Launch concepts",
      metadata: { kind: "responsive-web" },
      requestId: "req-create",
    });
  });

  test("falls through to the legacy proxy when controller mode is off", async () => {
    const resolveUser = jest.fn();
    const app = express();
    app.use("/api/design/projects", buildDesignProjectRouter({
      enabled: true,
      controllerMode: false,
      resolveUser,
      listProjects: jest.fn(),
      createProject: jest.fn(),
      createProjectId: jest.fn(),
      getRequestId: () => "req-legacy",
    }));
    app.get("/api/design/projects", (_req, res) => res.json({ legacy: true }));

    const response = await request(app).get("/api/design/projects");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ legacy: true });
    expect(resolveUser).not.toHaveBeenCalled();
  });

  test("keeps controller-mode project records dark while Design is disabled", async () => {
    const resolveUser = jest.fn();
    const app = express();
    app.use("/api/design/projects", buildDesignProjectRouter({
      enabled: false,
      controllerMode: true,
      resolveUser,
      listProjects: jest.fn(),
      createProject: jest.fn(),
      createProjectId: jest.fn(),
      getRequestId: () => "req-dark",
    }));

    const response = await request(app).get("/api/design/projects");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: "design_disabled" });
    expect(resolveUser).not.toHaveBeenCalled();
  });
});
