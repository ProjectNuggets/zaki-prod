import { describe, expect, test } from "@jest/globals";
import {
  buildLearningQuotaStatus,
  buildLearningRequestTooLargePayload,
  buildLearningActionLimitPayload,
  checkLearningQuotaContentLength,
  checkLearningStorageQuota,
  buildLearningStorageLimitPayload,
  resolveLearningActionQuota,
  resolveLearningQuotaPolicy,
  resolveLearningQuotaTier,
} from "./learning-quota.js";

const NOW = new Date("2026-05-07T12:00:00.000Z");

describe("learning quota policy", () => {
  test("resolves learning tier from trusted entitlement state", () => {
    expect(resolveLearningQuotaTier({ plan_tier: "free", plan_status: "inactive" }, { nowDate: NOW }))
      .toBe("free");
    expect(resolveLearningQuotaTier({ plan_tier: "student", plan_status: "active" }, { nowDate: NOW }))
      .toBe("student");
    expect(resolveLearningQuotaTier({ plan_tier: "pro", plan_status: "trialing" }, { nowDate: NOW }))
      .toBe("personal");
    expect(
      resolveLearningQuotaTier(
        {
          plan_tier: "free",
          plan_status: "inactive",
          access_expires_at: "2026-06-01T00:00:00.000Z",
        },
        { nowDate: NOW }
      )
    ).toBe("personal");
  });

  test("keeps every hosted upload capability available while scaling limits by plan", () => {
    const free = resolveLearningQuotaPolicy(
      { plan_tier: "free", plan_status: "inactive" },
      { nowDate: NOW }
    );
    const personal = resolveLearningQuotaPolicy(
      { plan_tier: "personal", plan_status: "active" },
      { nowDate: NOW }
    );

    expect(free.uploads).toMatchObject({
      imageUpload: true,
      folderUpload: true,
      archiveUpload: true,
      cloudFolderConnectors: false,
    });
    expect(personal.uploads.maxRequestBytes).toBeGreaterThan(free.uploads.maxRequestBytes);
    expect(personal.storage.tenantMaxBytes).toBeGreaterThan(free.storage.tenantMaxBytes);
    expect(personal.generation.booksPerDay).toBeGreaterThan(free.generation.booksPerDay);
  });

  test("clamps plan request size overrides to the operator absolute cap", () => {
    const policy = resolveLearningQuotaPolicy(
      { plan_tier: "personal", plan_status: "active" },
      {
        nowDate: NOW,
        absoluteMaxRequestBytes: 64,
        env: {
          ZAKI_LEARNING_PERSONAL_MAX_REQUEST_BYTES: "4096",
        },
      }
    );
    expect(policy.uploads.maxRequestBytes).toBe(64);
  });

  test("enforces plan-specific content length decisions", () => {
    const policy = resolveLearningQuotaPolicy(
      { plan_tier: "free", plan_status: "inactive" },
      {
        nowDate: NOW,
        absoluteMaxRequestBytes: 1024,
        env: {
          ZAKI_LEARNING_FREE_MAX_REQUEST_BYTES: "512",
        },
      }
    );

    expect(checkLearningQuotaContentLength({ "content-length": "256" }, policy)).toEqual({
      allowed: true,
      contentLength: 256,
      maxBytes: 512,
    });
    expect(checkLearningQuotaContentLength({ "content-length": "800" }, policy)).toEqual({
      allowed: false,
      contentLength: 800,
      maxBytes: 512,
      reason: "request_too_large",
    });
  });

  test("builds quota status with prompt usage and enforcement truth", () => {
    const status = buildLearningQuotaStatus({
      zakiUser: { plan_tier: "student", plan_status: "active" },
      nowDate: NOW,
      promptQuota: {
        surface: "learning",
        bucket: "learning",
        limit: 10,
        used: 3,
        remaining: 7,
        resetAt: "2026-05-08T00:00:00.000Z",
        unlimited: false,
      },
    });

    expect(status.policy).toMatchObject({
      tier: "student",
      enforcement: {
        promptRequests: "enforced",
        requestBytes: "enforced",
        storageBytes: "enforced",
        booksPerDay: "enforced",
        externalSearchesPerDay: "enforced",
        concurrentSessions: "enforced",
      },
    });
    expect(status.dailyPrompts).toMatchObject({
      surface: "learning",
      used: 3,
      remaining: 7,
    });
  });

  test("returns stable hosted request size payloads", () => {
    expect(
      buildLearningRequestTooLargePayload(
        { reason: "request_too_large", maxBytes: 512, contentLength: 800 },
        "req-1",
        { tier: "free" }
      )
    ).toEqual({
      code: "request_too_large",
      error: "Learning request is too large.",
      maxBytes: 512,
      contentLength: 800,
      policyTier: "free",
      requestId: "req-1",
    });
  });

  test("resolves action quota buckets from the effective learning plan", () => {
    const policy = resolveLearningQuotaPolicy(
      { plan_tier: "student", plan_status: "active" },
      {
        nowDate: NOW,
        env: {
          ZAKI_LEARNING_STUDENT_BOOKS_PER_DAY: "7",
          ZAKI_LEARNING_STUDENT_EXTERNAL_SEARCHES_PER_DAY: "13",
        },
      }
    );

    expect(resolveLearningActionQuota("book_generation", policy)).toMatchObject({
      action: "book_generation",
      bucket: "learning:books",
      limit: 7,
      policyTier: "student",
    });
    expect(resolveLearningActionQuota("external_search", policy)).toMatchObject({
      action: "external_search",
      bucket: "learning:external_searches",
      limit: 13,
      policyTier: "student",
    });
    expect(resolveLearningActionQuota("unknown", policy)).toBeNull();
  });

  test("returns stable action limit payloads", () => {
    expect(
      buildLearningActionLimitPayload(
        { limit: 1, resetAt: "2026-05-08T00:00:00.000Z" },
        {
          action: "book_generation",
          label: "book generation",
          bucket: "learning:books",
          policyTier: "free",
          limit: 1,
        },
        "req-2"
      )
    ).toEqual({
      code: "learning_action_limit_reached",
      error: "You reached today's book generation limit.",
      message: "You reached today's book generation limit.",
      action: "book_generation",
      bucket: "learning:books",
      policyTier: "free",
      limit: 1,
      remaining: 0,
      resetAt: "2026-05-08T00:00:00.000Z",
      requestId: "req-2",
    });
  });

  test("enforces tenant storage quota with projected request bytes", () => {
    const policy = resolveLearningQuotaPolicy(
      { plan_tier: "free", plan_status: "inactive" },
      {
        nowDate: NOW,
        env: { ZAKI_LEARNING_FREE_TENANT_STORAGE_BYTES: "1000" },
      }
    );

    expect(checkLearningStorageQuota({ currentBytes: 100, incomingBytes: 200, policy })).toEqual({
      allowed: true,
      currentBytes: 100,
      incomingBytes: 200,
      projectedBytes: 300,
      maxBytes: 1000,
    });
    expect(checkLearningStorageQuota({ currentBytes: 950, incomingBytes: 100, policy })).toEqual({
      allowed: false,
      currentBytes: 950,
      incomingBytes: 100,
      projectedBytes: 1050,
      maxBytes: 1000,
      reason: "tenant_storage_limit_reached",
    });
  });

  test("returns stable tenant storage limit payloads", () => {
    expect(
      buildLearningStorageLimitPayload(
        {
          reason: "tenant_storage_limit_reached",
          currentBytes: 950,
          incomingBytes: 100,
          projectedBytes: 1050,
          maxBytes: 1000,
        },
        "req-3",
        { tier: "free" }
      )
    ).toEqual({
      code: "tenant_storage_limit_reached",
      error: "Learning storage limit reached.",
      message: "Learning storage limit reached.",
      currentBytes: 950,
      incomingBytes: 100,
      projectedBytes: 1050,
      maxBytes: 1000,
      policyTier: "free",
      requestId: "req-3",
    });
  });
});
