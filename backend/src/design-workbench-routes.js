import express from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export function buildDesignWorkbenchRouter({ enabled, resolveAccess, controller, getRequestId }) {
  const router = express.Router();
  router.use(async (req, res) => {
    const requestId = getRequestId(req);
    if (!enabled) {
      return res.status(404).json({ code: "design_disabled", message: "Design is not enabled for this environment.", requestId });
    }
    if (!["GET", "HEAD"].includes(req.method.toUpperCase())) {
      return res.status(405).set("allow", "GET, HEAD").json({
        code: "design_workbench_method_not_allowed", message: "Design workbench is read-only.", requestId,
      });
    }
    const access = await resolveAccess(req);
    if (!access?.userId) {
      return res.status(401).json({ code: "design_workbench_auth_required", message: "Design workbench access is required.", requestId });
    }
    try {
      const upstream = await controller.workbench({
        targetPath: req.url || "/",
        method: req.method,
        headers: requestHeaders(req),
        requestId,
      });
      res.status(upstream.status);
      copyHeaders(upstream, res);
      if (!upstream.body || req.method === "HEAD" || [204, 304].includes(upstream.status)) {
        res.end();
        return undefined;
      }
      await pipeline(Readable.fromWeb(upstream.body), res);
      return undefined;
    } catch (error) {
      if (res.headersSent) {
        if (!res.destroyed) res.destroy();
        return undefined;
      }
      const status = Number(error?.status);
      return res.status(Number.isInteger(status) && status >= 400 && status < 500 ? status : 503).json({
        code: error?.code || "design_workbench_unavailable",
        message: "Design workbench is temporarily unavailable.",
        retryable: !(Number.isInteger(status) && status >= 400 && status < 500),
        requestId,
      });
    }
  });
  return router;
}

function requestHeaders(req) {
  const result = {};
  for (const name of ["accept", "accept-language", "if-none-match", "if-modified-since"]) {
    const value = req.headers?.[name];
    if (value !== undefined) result[name] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return result;
}

function copyHeaders(upstream, res) {
  const allowed = new Set([
    "cache-control", "content-language", "content-type",
    "etag", "last-modified", "vary",
  ]);
  for (const [name, value] of upstream.headers.entries()) {
    if (allowed.has(name.toLowerCase())) res.setHeader(name, value);
  }
}
