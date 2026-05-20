import { describe, expect, it, jest } from "@jest/globals";
import {
  HIRE_AUTOMATION_CONSENT_VERSION,
  buildHireAutomationAuditUnavailablePayload,
  buildHireAutomationConsentRequiredPayload,
  recordHireAutomationAuditEvent,
  resolveHireAutomationConsent,
} from "./hire-automation-consent.js";

const REQUIREMENT = Object.freeze({
  action: "auto_apply",
  routeTemplate: "/api/hire/fire/:leadId",
  method: "POST",
  leadId: "job_1",
});

describe("hire automation consent", () => {
  it("accepts explicit action consent from a header", () => {
    expect(
      resolveHireAutomationConsent(
        {
          headers: {
            "x-zaki-hire-consent": "auto_apply",
          },
        },
        REQUIREMENT
      )
    ).toEqual({
      accepted: true,
      source: "header",
      action: "auto_apply",
    });
  });

  it("accepts explicit action consent from the BFF-only body field", () => {
    expect(
      resolveHireAutomationConsent(
        {
          body: {
            zakiHireConsent: {
              accepted: true,
              action: "auto_apply",
            },
          },
        },
        REQUIREMENT
      )
    ).toEqual({
      accepted: true,
      source: "body",
      action: "auto_apply",
    });
  });

  it("rejects missing, unaccepted, or mismatched consent", () => {
    expect(resolveHireAutomationConsent({}, REQUIREMENT)).toEqual({
      accepted: false,
      source: null,
      reason: "missing",
    });
    expect(
      resolveHireAutomationConsent(
        { body: { zakiHireConsent: { accepted: false, action: "auto_apply" } } },
        REQUIREMENT
      )
    ).toEqual({
      accepted: false,
      source: "body",
      reason: "not_accepted",
    });
    expect(
      resolveHireAutomationConsent(
        { body: { zakiHireConsent: { accepted: true, action: "form_read" } } },
        REQUIREMENT
      )
    ).toEqual({
      accepted: false,
      source: "body",
      reason: "action_mismatch",
    });
  });

  it("builds user-safe consent and audit failure payloads", () => {
    expect(
      buildHireAutomationConsentRequiredPayload({
        requestId: "req-1",
        requirement: REQUIREMENT,
      })
    ).toEqual({
      code: "hire_automation_consent_required",
      error: "Hire automation consent is required.",
      message: "Confirm this Hire automation action before continuing.",
      action: "auto_apply",
      route: "/api/hire/fire/:leadId",
      requestId: "req-1",
    });
    expect(buildHireAutomationAuditUnavailablePayload("req-2")).toEqual({
      code: "hire_automation_audit_unavailable",
      error: "Hire automation audit is unavailable.",
      message: "Hire automation is temporarily unavailable because the audit record could not be written.",
      retryable: true,
      requestId: "req-2",
    });
  });

  it("records audit events with parameterized SQL and bounded details", async () => {
    const dbQuery = jest.fn(async () => ({ rowCount: 1 }));

    await recordHireAutomationAuditEvent({
      dbQuery,
      zakiUser: { id: 42 },
      requirement: REQUIREMENT,
      status: "consented",
      requestId: "req-3",
      consentSource: "body",
    });

    expect(dbQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = dbQuery.mock.calls[0];
    expect(sql).toContain("INSERT INTO zaki_hire_audit_events");
    expect(sql).toContain("$7::jsonb");
    expect(params).toEqual([
      "42",
      "auto_apply",
      "consented",
      "req-3",
      "job_1",
      "/api/hire/fire/:leadId",
      JSON.stringify({
        schemaVersion: HIRE_AUTOMATION_CONSENT_VERSION,
        consentSource: "body",
        reason: null,
        method: "POST",
      }),
    ]);
  });

  it("fails closed when user or action identity is missing", async () => {
    await expect(
      recordHireAutomationAuditEvent({
        dbQuery: jest.fn(),
        zakiUser: {},
        requirement: REQUIREMENT,
        status: "consented",
      })
    ).rejects.toThrow("canonical user id");

    await expect(
      recordHireAutomationAuditEvent({
        dbQuery: jest.fn(),
        zakiUser: { id: 42 },
        requirement: { ...REQUIREMENT, action: "unknown" },
        status: "consented",
      })
    ).rejects.toThrow("known action");
  });
});
