import { createHash, timingSafeEqual } from "node:crypto";
import express from "express";
import {
  commitDesignCheckpoint as defaultCommitCheckpoint,
  designCheckpointObjectKey,
  readDesignSessionBinding as defaultReadSessionBinding,
} from "./design-session-store.js";

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function buildDesignControllerCallbackRouter({
  callbackToken,
  dbQuery,
  runInTransaction,
  readSessionBinding = defaultReadSessionBinding,
  commitCheckpoint = defaultCommitCheckpoint,
}) {
  const expectedToken = requiredToken(callbackToken);
  const router = express.Router();
  router.use((req, res, next) => {
    const authorization = String(req.get("authorization") || "");
    const actual = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";
    if (!tokensEqual(actual, expectedToken)) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Invalid Design controller credential." },
      });
    }
    next();
  });
  router.use(express.json({ limit: "32kb", strict: true }));

  router.post("/sessions/:sessionId/restore-grant", async (req, res) => {
    const input = parseRestoreRequest(req.params.sessionId, req.body);
    if (!input) return invalidRequest(res);
    try {
      const session = await readSessionBinding({ dbQuery, ...input });
      if (!session) return res.status(404).json({
        error: { code: "DESIGN_SESSION_NOT_FOUND", message: "Design session was not found." },
      });
      if (session.generation !== input.desiredGeneration) {
        return res.status(409).json({
          error: { code: "DESIGN_CHECKPOINT_CAS_CONFLICT", message: "Checkpoint generation changed." },
        });
      }
      if (session.generation === 0) return res.status(204).end();
      if (!session.checkpointObjectKey || !session.checkpointSha256) {
        return res.status(409).json({
          error: { code: "DESIGN_CHECKPOINT_MISSING", message: "Committed checkpoint metadata is incomplete." },
        });
      }
      return res.json({
        generation: session.generation,
        objectKey: session.checkpointObjectKey,
        sha256: session.checkpointSha256,
      });
    } catch (error) {
      console.warn("[Design] Controller restore grant failed:", {
        requestId: safeRequestId(req),
        code: error?.code || "DESIGN_RESTORE_GRANT_FAILED",
      });
      return res.status(Number(error?.status) || 503).json({
        error: { code: "DESIGN_RESTORE_GRANT_FAILED", message: "Design restore grant is unavailable." },
      });
    }
  });

  router.post("/sessions/:sessionId/upload-grant", async (req, res) => {
    const input = parseUploadRequest(req.params.sessionId, req.body);
    if (!input) return invalidRequest(res);
    try {
      const session = await readSessionBinding({ dbQuery, ...input });
      if (!session) return res.status(404).json({
        error: { code: "DESIGN_SESSION_NOT_FOUND", message: "Design session was not found." },
      });
      if (session.generation !== input.expectedGeneration) {
        return res.status(409).json({
          error: { code: "DESIGN_CHECKPOINT_CAS_CONFLICT", message: "Checkpoint generation changed." },
        });
      }
      if (!["DRAINING", "CHECKPOINTING"].includes(session.state)) {
        return res.status(409).json({
          error: {
            code: "DESIGN_SESSION_NOT_DRAINING",
            message: "Design session has not entered the drain phase.",
          },
        });
      }
      const generation = input.expectedGeneration + 1;
      const objectKey = designCheckpointObjectKey(input.sessionId, generation);
      return res.json({ generation, objectKey });
    } catch (error) {
      return callbackFailure(req, res, error, "DESIGN_UPLOAD_GRANT_FAILED", "Design upload grant is unavailable.");
    }
  });

  router.post("/sessions/:sessionId/checkpoint", async (req, res) => {
    const input = parseCheckpointRequest(req.params.sessionId, req.body);
    if (!input) return invalidRequest(res);
    try {
      const objectKey = designCheckpointObjectKey(input.sessionId, input.generation);
      await commitCheckpoint({
        runInTransaction,
        ...input,
        objectKey,
        requestId: safeRequestId(req),
      });
      return res.status(204).end();
    } catch (error) {
      if (error?.code === "DESIGN_CHECKPOINT_CAS_CONFLICT") {
        return res.status(409).json({
          error: { code: error.code, message: "Checkpoint generation changed." },
        });
      }
      return callbackFailure(req, res, error, "DESIGN_CHECKPOINT_COMMIT_FAILED", "Design checkpoint commit is unavailable.");
    }
  });

  return router;
}

function parseRestoreRequest(sessionId, value) {
  if (!isRecord(value)) return null;
  const desiredGeneration = Number(value.desiredGeneration);
  if (
    !validOpaqueId(sessionId) ||
    !validOpaqueId(value.projectId) ||
    !validUserId(value.userId) ||
    !validOpaqueId(value.tenantId) ||
    !Number.isSafeInteger(desiredGeneration) ||
    desiredGeneration < 0
  ) return null;
  return {
    sessionId,
    projectId: value.projectId,
    userId: String(value.userId),
    tenantId: value.tenantId,
    desiredGeneration,
  };
}

function parseUploadRequest(sessionId, value) {
  if (!isRecord(value)) return null;
  const expectedGeneration = Number(value.expectedGeneration);
  if (
    !validOpaqueId(sessionId) ||
    !validOpaqueId(value.projectId) ||
    !validUserId(value.userId) ||
    !validOpaqueId(value.tenantId) ||
    !Number.isSafeInteger(expectedGeneration) ||
    expectedGeneration < 0
  ) return null;
  return {
    sessionId,
    projectId: value.projectId,
    userId: String(value.userId),
    tenantId: value.tenantId,
    expectedGeneration,
  };
}

function parseCheckpointRequest(sessionId, value) {
  if (!isRecord(value)) return null;
  const expectedGeneration = Number(value.expectedGeneration);
  const generation = Number(value.generation);
  const bytes = Number(value.bytes);
  if (
    !validOpaqueId(sessionId) ||
    !validOpaqueId(value.projectId) ||
    !validUserId(value.userId) ||
    !validOpaqueId(value.tenantId) ||
    !Number.isSafeInteger(expectedGeneration) || expectedGeneration < 0 ||
    !Number.isSafeInteger(generation) || generation !== expectedGeneration + 1 ||
    !Number.isSafeInteger(bytes) || bytes < 0 || bytes > 256 * 1024 * 1024 ||
    typeof value.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(value.sha256)
  ) return null;
  return {
    sessionId,
    projectId: value.projectId,
    userId: String(value.userId),
    tenantId: value.tenantId,
    expectedGeneration,
    generation,
    bytes,
    sha256: value.sha256,
  };
}

function invalidRequest(res) {
  return res.status(400).json({
    error: { code: "INVALID_REQUEST", message: "Invalid Design controller request." },
  });
}

function callbackFailure(req, res, error, code, message) {
  console.warn("[Design] Controller callback failed:", {
    requestId: safeRequestId(req),
    code: error?.code || code,
  });
  const status = Number(error?.status);
  return res.status(Number.isInteger(status) && status >= 400 && status <= 599 ? status : 503).json({
    error: { code, message },
  });
}

function requiredToken(value) {
  const token = String(value || "").trim();
  if (token.length < 16 || token.length > 4096) {
    throw new Error("Design controller callback token is invalid.");
  }
  return token;
}

function tokensEqual(left, right) {
  if (!left || !right) return false;
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function validOpaqueId(value) {
  return typeof value === "string" && OPAQUE_ID.test(value);
}

function validUserId(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0;
}

function isRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function safeRequestId(req) {
  const value = String(req.get("x-request-id") || "");
  return OPAQUE_ID.test(value) ? value : null;
}
