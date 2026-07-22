import express from "express";
import request from "supertest";
import { describe, expect, jest, test } from "@jest/globals";
import { buildDesignControllerCallbackRouter } from "./design-controller-callback-routes.js";

function createApp(overrides = {}) {
  const readSessionBinding = overrides.readSessionBinding || jest.fn().mockResolvedValue({
    sessionId: "sess_01",
    projectId: "project_01",
    userId: "42",
    tenantId: "default",
    state: overrides.sessionState || "DRAINING",
    generation: 7,
    checkpointSha256: "a".repeat(64),
    checkpointBytes: 1024,
    checkpointObjectKey: "projects/project_01/checkpoints/0000000007.tgz",
  });
  const app = express();
  const commitCheckpoint = overrides.commitCheckpoint || jest.fn().mockResolvedValue({
    committed: true,
    idempotent: false,
    generation: 8,
  });
  app.use("/internal/design/controller/v1", buildDesignControllerCallbackRouter({
    callbackToken: "controller-hub-callback-secret",
    dbQuery: jest.fn(),
    runInTransaction: jest.fn(),
    readSessionBinding,
    commitCheckpoint,
  }));
  return { app, readSessionBinding, commitCheckpoint };
}

describe("Design controller callback routes", () => {
  test("fails closed before reading session state when callback auth is invalid", async () => {
    const { app, readSessionBinding } = createApp();
    const response = await request(app)
      .post("/internal/design/controller/v1/sessions/sess_01/restore-grant")
      .set("authorization", "Bearer wrong-token")
      .send({
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        desiredGeneration: 7,
      });
    expect(response.status).toBe(401);
    expect(readSessionBinding).not.toHaveBeenCalled();
  });

  test("returns an exact restore grant only for the complete authoritative tuple", async () => {
    const { app, readSessionBinding } = createApp();
    const response = await request(app)
      .post("/internal/design/controller/v1/sessions/sess_01/restore-grant")
      .set("authorization", "Bearer controller-hub-callback-secret")
      .set("x-request-id", "req_restore_01")
      .send({
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        desiredGeneration: 7,
      });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      generation: 7,
      objectKey: "projects/project_01/checkpoints/0000000007.tgz",
      sha256: "a".repeat(64),
    });
    expect(readSessionBinding).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
    }));
  });

  test("grants only the next generation and commits it through hub CAS", async () => {
    const { app, commitCheckpoint } = createApp();
    const upload = await request(app)
      .post("/internal/design/controller/v1/sessions/sess_01/upload-grant")
      .set("authorization", "Bearer controller-hub-callback-secret")
      .send({
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        expectedGeneration: 7,
      });
    expect(upload.status).toBe(200);
    expect(upload.body).toEqual({
      generation: 8,
      objectKey: "projects/project_01/checkpoints/0000000008.tgz",
    });

    const commit = await request(app)
      .post("/internal/design/controller/v1/sessions/sess_01/checkpoint")
      .set("authorization", "Bearer controller-hub-callback-secret")
      .set("x-request-id", "req_commit_01")
      .send({
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        expectedGeneration: 7,
        generation: 8,
        bytes: 4096,
        sha256: "b".repeat(64),
      });
    expect(commit.status).toBe(204);
    expect(commitCheckpoint).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      expectedGeneration: 7,
      generation: 8,
      bytes: 4096,
      sha256: "b".repeat(64),
      objectKey: "projects/project_01/checkpoints/0000000008.tgz",
      requestId: "req_commit_01",
    }));
  });

  test("does not grant checkpoint upload before the hub has fenced proxy traffic", async () => {
    const { app } = createApp({ sessionState: "READY" });

    const response = await request(app)
      .post("/internal/design/controller/v1/sessions/sess_01/upload-grant")
      .set("authorization", "Bearer controller-hub-callback-secret")
      .send({
        projectId: "project_01",
        userId: "42",
        tenantId: "default",
        expectedGeneration: 7,
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: "DESIGN_SESSION_NOT_DRAINING",
        message: "Design session has not entered the drain phase.",
      },
    });
  });
});
