import {
  classifyDesignMeterActionForIngress,
  estimateDesignMeterUnitsForIngress,
  getBlockedHostedDesignPathReason,
} from "./design-bff-contract.js";
import {
  buildDesignRequestTooLargePayload,
  checkDesignContentLength,
  resolveDesignQuotaPolicy,
} from "./design-quota.js";
import { normalizeMeterAction } from "./meter-contract.js";

export function createDesignSessionProxyAuthorizer({
  absoluteMaxRequestBytes,
  issueMeterGrantForIdentity,
}) {
  if (typeof issueMeterGrantForIdentity !== "function") {
    throw new TypeError("Design session metering requires a grant issuer.");
  }

  return async function authorizeDesignSessionProxy({
    req,
    res,
    auth,
    session,
    targetPath,
    method,
    requestId,
  }) {
    const blockedReason = getBlockedHostedDesignPathReason(targetPath);
    if (blockedReason) {
      return {
        allowed: false,
        status: 404,
        body: buildDesignPathBlockedPayload(blockedReason, requestId),
      };
    }

    const meterRequest = {
      method,
      originalUrl: `/api/design${targetPath.startsWith("/api") ? targetPath.slice(4) : targetPath}`,
      url: targetPath,
      headers: req.headers,
    };
    const action = classifyDesignMeterActionForIngress(meterRequest);
    if (!action) return { allowed: true, action: null, grant: null };

    if (
      !auth?.zakiUser?.id ||
      !session?.userId ||
      !session?.tenantId ||
      String(auth.zakiUser.id) !== String(session.userId)
    ) {
      return {
        allowed: false,
        status: 503,
        body: {
          code: "design_billing_identity_unavailable",
          message: "Design billing identity is temporarily unavailable.",
          retryable: true,
          requestId,
        },
      };
    }

    const hasContentLength = req.headers?.["content-length"] !== undefined;
    const declaredBytes = Number(req.headers?.["content-length"] || 0);
    if (
      (["POST", "PUT", "PATCH"].includes(method) && !hasContentLength) ||
      (hasContentLength && (!Number.isFinite(declaredBytes) || declaredBytes < 0))
    ) {
      return {
        allowed: false,
        status: 411,
        body: {
          code: "design_content_length_required",
          message: "Design mutations with a body require a valid Content-Length header.",
          requestId,
        },
      };
    }

    const policy = resolveDesignQuotaPolicy(auth.zakiUser, { absoluteMaxRequestBytes });
    const sizeDecision = checkDesignContentLength({ incomingBytes: declaredBytes, policy });
    if (!sizeDecision.allowed) {
      return {
        allowed: false,
        status: 413,
        body: buildDesignRequestTooLargePayload(sizeDecision, requestId, policy),
      };
    }

    const identity = {
      type: "user",
      tenantId: session.tenantId,
      userId: session.userId,
      zakiUser: auth.zakiUser,
      anonymousSessionId: null,
      anonymousKeyHash: null,
    };
    const result = await issueMeterGrantForIdentity({
      identity,
      tenantId: session.tenantId,
      product: "design",
      action,
      estimatedUnits: estimateDesignMeterUnitsForIngress(meterRequest, action),
      requestId,
      idempotencyKey: readDesignIdempotencyKey(req, action, requestId),
      metadata: {
        surface: "design_session_proxy",
        route: targetPath.split("?")[0],
        method,
      },
    });
    if (!result.allowed) {
      return {
        allowed: false,
        status: result.status || 403,
        body: buildDesignMeterDenialPayload(result, requestId),
      };
    }
    setDesignMeterHeaders(res, result.grant, result.meter);
    return { allowed: true, action, grant: result.grant };
  };
}

export function buildDesignPathBlockedPayload(reason, requestId) {
  return {
    code: "design_path_not_available",
    error: "Design endpoint is not available.",
    message: reason,
    requestId,
  };
}

export function readDesignIdempotencyKey(req, action, requestId) {
  const headerValue = req.headers?.["idempotency-key"] || req.headers?.["x-idempotency-key"];
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const normalizedHeader = String(raw || "").trim();
  if (normalizedHeader) return normalizedHeader.slice(0, 180);
  return `${requestId}:${normalizeMeterAction(action)}`.slice(0, 180);
}

export function setDesignMeterHeaders(res, grant, meter) {
  if (!grant || res.headersSent) return;
  res.setHeader("X-Zaki-Meter-Grant-Id", grant.grantId);
  res.setHeader("X-Zaki-Meter-Product", "design");
  res.setHeader("X-Zaki-Meter-Action", grant.action);
  if (meter?.plan?.tier) res.setHeader("X-Zaki-Meter-Plan", meter.plan.tier);
  if (meter?.rolling?.remaining !== null && meter?.rolling?.remaining !== undefined) {
    res.setHeader("X-Zaki-Meter-Rolling-Remaining", String(meter.rolling.remaining));
  }
  if (meter?.weekly?.remaining !== null && meter?.weekly?.remaining !== undefined) {
    res.setHeader("X-Zaki-Meter-Weekly-Remaining", String(meter.weekly.remaining));
  }
}

export function buildDesignMeterDenialPayload(result, requestId) {
  return {
    code: result?.error || "design_meter_denied",
    error: "Design usage is not available.",
    message: result?.message || "Design usage is not currently available.",
    product: result?.product || "design",
    productState: result?.productState || null,
    meter: result?.meter || null,
    requestId,
  };
}
