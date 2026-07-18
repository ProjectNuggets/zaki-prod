import express from "express";
import {
  fetchMinutesIndex,
  fetchMinutesItem,
  fetchMinutesSearch,
} from "./minutes-read-client.js";
import {
  MinutesReadContractError,
  parseMinutesIndexResponse,
  parseMinutesItemResponse,
  readMinutesResponseJson,
} from "./minutes-read-contract.js";

const DEFAULT_CLIENT = Object.freeze({
  fetchIndex: fetchMinutesIndex,
  fetchItem: fetchMinutesItem,
  fetchSearch: fetchMinutesSearch,
});

const CLIENT_INPUT_ERRORS = new Set([
  "invalid_minutes_read_cursor",
  "invalid_minutes_read_since",
  "invalid_minutes_read_limit",
  "invalid_minutes_read_item_id",
  "invalid_minutes_read_variant",
  "invalid_minutes_read_query",
]);

export function isMinutesEnabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

export function bypassMinutesReadBodyParser(parser) {
  if (typeof parser !== "function") {
    throw new TypeError("Body parser middleware is required.");
  }
  return (req, res, next) => {
    const path = String(req.path || "").toLowerCase();
    if (path === "/api/minutes" || path.startsWith("/api/minutes/")) return next();
    return parser(req, res, next);
  };
}

function errorPayload(code, message, requestId, retryable) {
  return { code, message, requestId, retryable };
}

function sendError(res, status, code, message, requestId, retryable = false) {
  return res.status(status).json(errorPayload(code, message, requestId, retryable));
}

function discardBody(response) {
  try {
    const pending = response?.body?.cancel?.();
    pending?.catch?.(() => {});
  } catch {
    // Upstream status is already authoritative; never inspect an error body.
  }
}

function mapUpstreamFailure(res, response, requestId) {
  discardBody(response);
  switch (response?.status) {
    case 400:
      return sendError(res, 400, "minutes_invalid_request", "The Minutes request is invalid.", requestId);
    case 403:
      return sendError(res, 403, "minutes_read_disabled", "Minutes read access is disabled.", requestId);
    case 404:
      return sendError(res, 404, "minutes_not_found", "Minutes data was not found.", requestId);
    case 413:
      return sendError(
        res,
        413,
        "minutes_item_too_large",
        "This Minutes item is too large. Try the summary view.",
        requestId
      );
    case 401:
    case 429:
    case 500:
    case 502:
    case 503:
    case 504:
      return sendError(res, 503, "minutes_unavailable", "Minutes is temporarily unavailable.", requestId, true);
    default:
      return sendError(res, 502, "minutes_upstream_failed", "Minutes returned an invalid response.", requestId, true);
  }
}

function isClientInputError(error) {
  return CLIENT_INPUT_ERRORS.has(String(error?.message || ""));
}

function isConfigError(error) {
  return [
    "MINUTES_ENGINE_BASE_URL is not configured.",
    "MINUTES_ENGINE_READ_TOKEN is invalid.",
    "invalid_minutes_read_base_url",
    "invalid_minutes_read_request_id",
    "invalid_minutes_read_transport",
    "invalid_minutes_read_timeout",
  ].includes(String(error?.message || ""));
}

function emitFailure(dependencies, event) {
  try {
    const pending = dependencies.recordFailure?.(event);
    pending?.catch?.(() => {});
  } catch {
    // Telemetry must never alter the read response.
  }
}

async function authenticate(req, res, next, dependencies) {
  const requestId = dependencies.getRequestId(req);
  res.set("Cache-Control", "no-store");
  res.set("X-Request-Id", requestId);
  const authResult = await dependencies.resolveUser(req, res);
  if (!authResult) return;
  const userId = String(authResult.zakiUser?.id || "");
  if (!/^[1-9][0-9]*$/.test(userId) || !Number.isSafeInteger(Number(userId))) {
    sendError(res, 403, "minutes_identity_invalid", "Minutes access could not be authorized.", requestId);
    return;
  }
  req.minutesReadContext = {
    userId,
    requestId,
  };
  next();
}

function clientOptions(dependencies, context) {
  return {
    baseUrl: dependencies.baseUrl,
    readToken: dependencies.readToken,
    userId: context.userId,
    requestId: context.requestId,
    fetchWithTimeout: dependencies.fetchWithTimeout,
    timeoutMs: dependencies.timeoutMs,
  };
}

async function serveRead(req, res, dependencies, operation, read, parse) {
  const context = req.minutesReadContext;
  if (!context) return;
  const startedAt = Date.now();
  let upstreamStatus = null;
  try {
    const upstream = await read(context);
    upstreamStatus = Number(upstream?.status) || null;
    if (!upstream?.ok) {
      emitFailure(dependencies, {
        requestId: context.requestId,
        operation,
        failure: "upstream_status",
        upstreamStatus,
        durationMs: Date.now() - startedAt,
      });
      mapUpstreamFailure(res, upstream, context.requestId);
      return;
    }
    const payload = await readMinutesResponseJson(upstream);
    res.status(200).json(parse(payload));
  } catch (error) {
    if (isClientInputError(error)) {
      sendError(res, 400, "minutes_invalid_request", "The Minutes request is invalid.", context.requestId);
      return;
    }
    if (isConfigError(error)) {
      emitFailure(dependencies, {
        requestId: context.requestId,
        operation,
        failure: "minutes_config_invalid",
        upstreamStatus,
        durationMs: Date.now() - startedAt,
      });
      sendError(res, 503, "minutes_unavailable", "Minutes is not configured.", context.requestId, true);
      return;
    }
    if (error instanceof MinutesReadContractError) {
      emitFailure(dependencies, {
        requestId: context.requestId,
        operation,
        failure: error.code || "minutes_upstream_contract_invalid",
        upstreamStatus,
        durationMs: Date.now() - startedAt,
      });
      sendError(res, 502, "minutes_invalid_response", "Minutes returned an invalid response.", context.requestId, true);
      return;
    }
    emitFailure(dependencies, {
      requestId: context.requestId,
      operation,
      failure: "minutes_unavailable",
      upstreamStatus,
      durationMs: Date.now() - startedAt,
    });
    sendError(res, 503, "minutes_unavailable", "Minutes is temporarily unavailable.", context.requestId, true);
  }
}

export function buildMinutesReadRouter({
  enabled,
  baseUrl,
  readToken,
  timeoutMs,
  resolveUser,
  getRequestId,
  fetchWithTimeout,
  recordFailure,
  client = DEFAULT_CLIENT,
}) {
  if (typeof resolveUser !== "function") throw new Error("Minutes auth resolver is required.");
  if (typeof getRequestId !== "function") throw new Error("Minutes request-id resolver is required.");
  const router = express.Router();
  const dependencies = {
    baseUrl,
    readToken,
    timeoutMs,
    resolveUser,
    getRequestId,
    fetchWithTimeout,
    recordFailure,
    client,
  };
  const requireMinutesUser = (req, res, next) => authenticate(req, res, next, dependencies);

  router.use((req, res, next) => {
    if (!enabled) {
      const requestId = getRequestId(req);
      res.set("Cache-Control", "no-store");
      res.set("X-Request-Id", requestId);
      sendError(res, 404, "minutes_disabled", "Minutes is not available.", requestId);
      return;
    }
    next();
  });

  router.get("/index", requireMinutesUser, async (req, res) => {
    await serveRead(
      req,
      res,
      dependencies,
      "index",
      (context) => client.fetchIndex({
        ...clientOptions(dependencies, context),
        since: req.query.since,
        limit: req.query.limit,
        cursor: req.query.cursor,
      }),
      parseMinutesIndexResponse
    );
  });

  router.get("/items/:itemId", requireMinutesUser, async (req, res) => {
    await serveRead(
      req,
      res,
      dependencies,
      "item",
      (context) => client.fetchItem({
        ...clientOptions(dependencies, context),
        itemId: req.params.itemId,
        variant: req.query.variant,
      }),
      parseMinutesItemResponse
    );
  });

  router.post("/search", requireMinutesUser, express.json({ limit: "4kb" }), async (req, res) => {
    await serveRead(
      req,
      res,
      dependencies,
      "search",
      (context) => client.fetchSearch({
        ...clientOptions(dependencies, context),
        query: req.body?.query,
        limit: req.body?.limit,
        cursor: req.body?.cursor,
      }),
      parseMinutesIndexResponse
    );
  });

  router.use((error, req, res, next) => {
    if (!req.minutesReadContext || res.headersSent) {
      next(error);
      return;
    }
    if (error?.type === "entity.too.large" || error?.status === 413) {
      sendError(
        res,
        413,
        "minutes_request_too_large",
        "The Minutes request is too large.",
        req.minutesReadContext.requestId
      );
      return;
    }
    sendError(
      res,
      400,
      "minutes_invalid_request",
      "The Minutes request is invalid.",
      req.minutesReadContext.requestId
    );
  });

  return router;
}
