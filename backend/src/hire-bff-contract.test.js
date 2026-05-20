import { describe, expect, test } from "@jest/globals";
import {
  buildHireConfigErrorPayload,
  buildHireDisabledPayload,
  buildHireForwardHeaders,
  buildHireProxyHeaders,
  buildHireRouteUnavailablePayload,
  classifyHireAutomationConsentRequirement,
  classifyHireIngressUsageEvent,
  getHireBase,
  isHireUserFacingPath,
  isHireEnabled,
  mapHireUpstreamFailure,
  resolveCanonicalHireUserId,
  sanitizeHireClientPayload,
  sanitizeHirePath,
  sanitizeHireProviderText,
  sanitizeHireUpstreamPayload,
  shouldConsumeHireIngressQuota,
} from "./hire-bff-contract.js";

describe("hire BFF contract", () => {
  test("normalizes feature flag values", () => {
    expect(isHireEnabled("true")).toBe(true);
    expect(isHireEnabled("1")).toBe(true);
    expect(isHireEnabled("yes")).toBe(true);
    expect(isHireEnabled("false")).toBe(false);
    expect(isHireEnabled("")).toBe(false);
  });

  test("normalizes base URL", () => {
    expect(getHireBase(" http://hire:8002/// ")).toBe("http://hire:8002");
    expect(getHireBase("")).toBeNull();
  });

  test("resolves canonical user id from ZAKI auth result", () => {
    expect(resolveCanonicalHireUserId({ zakiUser: { id: 42 } })).toBe("42");
    expect(resolveCanonicalHireUserId({ zakiUser: { id: "7" } })).toBe("7");
    expect(resolveCanonicalHireUserId({ zakiUser: { id: "abc" } })).toBeNull();
    expect(resolveCanonicalHireUserId({ zakiUser: { id: 0 } })).toBeNull();
  });

  test("builds downstream auth headers without browser auth", () => {
    const headers = buildHireForwardHeaders({
      internalToken: "secret",
      userId: "7",
      requestId: "req-1",
    });
    expect(headers).toMatchObject({
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
      "X-Internal-Token": "secret",
      "X-Zaki-User-Id": "7",
      "X-Request-Id": "req-1",
    });
  });

  test("throws for invalid user id", () => {
    expect(() =>
      buildHireForwardHeaders({
        internalToken: "secret",
        userId: "",
        requestId: "req-1",
      })
    ).toThrow("invalid_user_id");
  });

  test("strips browser and internal headers when proxying", () => {
    const headers = buildHireProxyHeaders(
      {
        headers: {
          authorization: "Bearer browser-token",
          "accept-encoding": "gzip",
          cookie: "refresh=secret",
          "x-internal-token": "evil",
          "x-zaki-user-id": "999",
          "x-client-version": "1.2.3",
          connection: "upgrade",
        },
      },
      {
        internalToken: "service-token",
        userId: "7",
        requestId: "req-2",
      }
    );
    expect(headers.authorization).toBeUndefined();
    expect(headers["accept-encoding"]).toBeUndefined();
    expect(headers.cookie).toBeUndefined();
    expect(headers["x-internal-token"]).toBeUndefined();
    expect(headers["x-zaki-user-id"]).toBeUndefined();
    expect(headers.Authorization).toBe("Bearer service-token");
    expect(headers["X-Internal-Token"]).toBe("service-token");
    expect(headers["X-Zaki-User-Id"]).toBe("7");
    expect(headers["x-client-version"]).toBe("1.2.3");
  });

  test("sanitizes hire upstream paths", () => {
    expect(sanitizeHirePath("api/v1/leads?limit=10")).toBe("/api/v1/leads?limit=10");
    expect(sanitizeHirePath("/api/v1/leads/job_1")).toBe("/api/v1/leads/job_1");
    expect(() => sanitizeHirePath("/api/v1/leads\nx")).toThrow("invalid_hire_path");
    expect(() => sanitizeHirePath("https://evil.test/api")).toThrow("invalid_hire_path");
  });

  test("builds stable disabled and config errors", () => {
    expect(buildHireDisabledPayload("req-3")).toMatchObject({
      code: "hire_disabled",
      requestId: "req-3",
    });
    expect(buildHireConfigErrorPayload("missing", "req-4")).toMatchObject({
      code: "hire_config_missing",
      error: "missing",
      requestId: "req-4",
    });
    expect(buildHireRouteUnavailablePayload("req-5")).toMatchObject({
      code: "hire_route_unavailable",
      requestId: "req-5",
    });
  });

  test("maps upstream failures without leaking internals", () => {
    expect(mapHireUpstreamFailure(401, "req-5")).toEqual({
      status: 502,
      body: expect.objectContaining({
        code: "hire_upstream_auth_failed",
        requestId: "req-5",
      }),
    });
    expect(mapHireUpstreamFailure(404, "req-6")).toEqual({
      status: 404,
      body: expect.objectContaining({ code: "hire_resource_not_found" }),
    });
    expect(mapHireUpstreamFailure(503, "req-7")).toEqual({
      status: 503,
      body: expect.objectContaining({ code: "hire_unavailable", retryable: true }),
    });
    expect(mapHireUpstreamFailure(400, "req-8")).toBeNull();
  });

  test("strips operator-owned fields from client payloads", () => {
    expect(
      sanitizeHireClientPayload({
        title: "Backend role",
        zakiHireConsent: { accepted: true, action: "auto_apply" },
        provider: "evil",
        settings: {
          api_key: "secret",
          target_roles: ["engineer"],
        },
      })
    ).toEqual({
      title: "Backend role",
      settings: {
        target_roles: ["engineer"],
      },
    });
  });

  test("sanitizes upstream payloads before browser display", () => {
    expect(sanitizeHireProviderText("<think>hidden</think>JustHireMe report")).toBe("ZAKI Hire report");
    expect(
      sanitizeHireUpstreamPayload({
        title: "JustHireMe lead",
        provider: "openai",
        api_key: "secret",
        resume_asset: "resume.pdf",
        cover_letter_asset: "/srv/tenants/other/cover.pdf",
        nested: {
          model: "gpt-4o",
          message: "Ready",
        },
      })
    ).toEqual({
      title: "ZAKI Hire lead",
      resume_asset: "resume.pdf",
      cover_letter_asset: "",
      nested: {
        message: "Ready",
      },
    });
  });

  test("allows only user-facing hire proxy routes", () => {
    expect(isHireUserFacingPath({ method: "GET", originalUrl: "/api/hire/leads" })).toBe(true);
    expect(isHireUserFacingPath({ method: "POST", originalUrl: "/api/hire/scan" })).toBe(true);
    expect(
      isHireUserFacingPath({
        method: "POST",
        originalUrl: "/api/hire/leads/job_1/generate/start",
      })
    ).toBe(true);
    expect(isHireUserFacingPath({ method: "GET", originalUrl: "/api/hire/settings" })).toBe(false);
    expect(
      isHireUserFacingPath({
        method: "POST",
        originalUrl: "/api/hire/settings/models/openai",
      })
    ).toBe(false);
    expect(
      isHireUserFacingPath({
        method: "POST",
        originalUrl: "/api/hire/runtime/vector/install",
      })
    ).toBe(false);
    expect(isHireUserFacingPath({ method: "GET", originalUrl: "/api/hire/runtime/vector" })).toBe(false);
    expect(isHireUserFacingPath({ method: "POST", originalUrl: "/api/hire/shutdown" })).toBe(false);
    expect(isHireUserFacingPath({ method: "GET", originalUrl: "/api/hire/diagnostics" })).toBe(false);
  });

  test("identifies hire routes that consume central prompt quota", () => {
    expect(shouldConsumeHireIngressQuota({ method: "GET", originalUrl: "/api/hire/leads" })).toBe(false);
    expect(shouldConsumeHireIngressQuota({ method: "POST", originalUrl: "/api/hire/leads/manual" })).toBe(true);
    expect(
      shouldConsumeHireIngressQuota({
        method: "POST",
        originalUrl: "/api/hire/leads/job_1/generate",
      })
    ).toBe(true);
    expect(shouldConsumeHireIngressQuota({ method: "POST", originalUrl: "/api/hire/scan" })).toBe(true);
    expect(
      shouldConsumeHireIngressQuota({
        method: "POST",
        originalUrl: "/api/hire/scan/stop",
      })
    ).toBe(false);
    expect(
      shouldConsumeHireIngressQuota({
        method: "POST",
        originalUrl: "/api/hire/ingest/profile",
      })
    ).toBe(false);
    expect(
      shouldConsumeHireIngressQuota({
        method: "POST",
        originalUrl: "/api/hire/ingest/portfolio",
      })
    ).toBe(true);
  });

  test("classifies metered hire routes into normalized usage events", () => {
    expect(
      classifyHireIngressUsageEvent({
        method: "POST",
        originalUrl: "/api/hire/leads/job_1/generate?debug=true",
      })
    ).toEqual({
      action: "generated_package",
      routeTemplate: "/api/hire/leads/:leadId/generate",
      method: "POST",
    });
    expect(
      classifyHireIngressUsageEvent({
        method: "POST",
        originalUrl: "/api/hire/fire/job_1",
      })
    ).toEqual({
      action: "auto_apply",
      routeTemplate: "/api/hire/fire/:leadId",
      method: "POST",
    });
    expect(
      classifyHireIngressUsageEvent({
        method: "POST",
        originalUrl: "/api/hire/scan/stop",
      })
    ).toBeNull();
  });

  test("classifies hire automation routes that require explicit consent", () => {
    expect(
      classifyHireAutomationConsentRequirement({
        method: "POST",
        originalUrl: "/api/hire/leads/job_1/form/read?x=1",
      })
    ).toEqual({
      action: "form_read",
      routeTemplate: "/api/hire/leads/:leadId/form/read",
      method: "POST",
      leadId: "job_1",
    });
    expect(
      classifyHireAutomationConsentRequirement({
        method: "POST",
        originalUrl: "/api/hire/leads/job_2/apply/preview",
      })
    ).toEqual({
      action: "apply_preview",
      routeTemplate: "/api/hire/leads/:leadId/apply/preview",
      method: "POST",
      leadId: "job_2",
    });
    expect(
      classifyHireAutomationConsentRequirement({
        method: "POST",
        originalUrl: "/api/hire/fire/job_3",
      })
    ).toEqual({
      action: "auto_apply",
      routeTemplate: "/api/hire/fire/:leadId",
      method: "POST",
      leadId: "job_3",
    });
    expect(
      classifyHireAutomationConsentRequirement({
        method: "POST",
        originalUrl: "/api/hire/selectors/refresh",
      })
    ).toBeNull();
  });
});
