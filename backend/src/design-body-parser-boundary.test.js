import express from "express";
import request from "supertest";
import { describe, expect, test } from "@jest/globals";
import { bypassDesignOwnedBodyParser } from "./design-body-parser-boundary.js";

describe("Design body parser boundary", () => {
  test("leaves Design lifecycle bodies for their local limit while preserving global parsing elsewhere", async () => {
    const app = express();
    app.use(bypassDesignOwnedBodyParser(express.json({ limit: "10mb" })));
    app.use(bypassDesignOwnedBodyParser(express.urlencoded({ extended: true, limit: "10mb" })));
    app.post(
      "/api/design/sessions/ensure",
      express.json({ limit: "32kb", strict: true }),
      (req, res) => res.json({ projectId: req.body?.projectId }),
    );
    app.post("/api/other", (req, res) => res.json(req.body));

    const oversizedLifecycle = await request(app)
      .post("/api/design/sessions/ensure")
      .send({ projectId: "project_01", padding: "x".repeat(40 * 1024) });
    const ordinaryGlobalRoute = await request(app)
      .post("/api/other")
      .send({ ok: true });

    expect(oversizedLifecycle.status).toBe(413);
    expect(ordinaryGlobalRoute.status).toBe(200);
    expect(ordinaryGlobalRoute.body).toEqual({ ok: true });
  });

  test("keeps global parsing for the legacy direct Design topology", async () => {
    const app = express();
    app.use(bypassDesignOwnedBodyParser(
      express.json({ limit: "10mb" }),
      { controllerEnabled: false },
    ));
    app.post("/api/design/projects", (req, res) => res.json(req.body));

    const response = await request(app)
      .post("/api/design/projects")
      .send({ name: "Legacy direct project" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ name: "Legacy direct project" });
  });
});
