import { describe, expect, it } from "@jest/globals";
import {
  DEFAULT_AGE_GATE_ENABLED,
  assertSignupAgePolicy,
  evaluateSignupAgePolicy,
  resolveAgeGateEnabled,
  resolveSignupAgePolicy,
} from "./signup-policy.js";

const NOW = new Date("2026-07-14T00:00:00.000Z");

describe("resolveSignupAgePolicy", () => {
  // WP-M: ZAKI collects no date of birth on any path. A DOB gate is therefore
  // unsatisfiable, and MUST NOT be the default — a default of "enabled" would mean
  // a fresh environment refuses every signup, email and Google alike.
  it("defaults to NO DOB WALL — the only supported behaviour after WP-M", () => {
    expect(resolveSignupAgePolicy({})).toEqual({ enabled: false, minimumAge: 16 });
    expect(DEFAULT_AGE_GATE_ENABLED).toBe(false);
  });

  it("keeps the config surface so a gate can be reintroduced without surgery", () => {
    expect(resolveSignupAgePolicy({ ZAKI_AGE_GATE_ENABLED: "true" })).toMatchObject({
      enabled: true,
    });
    expect(resolveSignupAgePolicy({ ZAKI_AGE_GATE_ENABLED: "false" })).toMatchObject({
      enabled: false,
    });
  });

  it.each(["false", "FALSE", "0", "no", "off", " Off "])(
    "treats %p as gate-disabled",
    (raw) => {
      expect(resolveAgeGateEnabled(raw)).toBe(false);
    }
  );

  it.each(["true", "1", "yes", "on"])("treats %p as gate-enabled", (raw) => {
    expect(resolveAgeGateEnabled(raw)).toBe(true);
  });

  it("treats an unset value as gate-DISABLED (the WP-M default)", () => {
    expect(resolveAgeGateEnabled("")).toBe(false);
    expect(resolveAgeGateEnabled(undefined)).toBe(false);
    expect(resolveAgeGateEnabled(null)).toBe(false);
  });

  it("reads the threshold from ZAKI_MINIMUM_SIGNUP_AGE", () => {
    // The threshold is still configurable, but setting it alone does NOT turn the
    // gate on — that needs ZAKI_AGE_GATE_ENABLED, and (post-WP-M) DOB collection.
    expect(resolveSignupAgePolicy({ ZAKI_MINIMUM_SIGNUP_AGE: "18" })).toEqual({
      enabled: false,
      minimumAge: 18,
    });
    expect(
      resolveSignupAgePolicy({
        ZAKI_MINIMUM_SIGNUP_AGE: "18",
        ZAKI_AGE_GATE_ENABLED: "true",
      })
    ).toEqual({ enabled: true, minimumAge: 18 });
  });

  it("falls back to 16 for out-of-range thresholds", () => {
    expect(resolveSignupAgePolicy({ ZAKI_MINIMUM_SIGNUP_AGE: "99" }).minimumAge).toBe(16);
    expect(resolveSignupAgePolicy({ ZAKI_MINIMUM_SIGNUP_AGE: "nonsense" }).minimumAge).toBe(16);
  });
});

describe("evaluateSignupAgePolicy — the ONE rule both auth paths run", () => {
  const enabled = { enabled: true, minimumAge: 16 };
  const disabled = { enabled: false, minimumAge: 16 };

  // WP-M — the live configuration. Neither auth path supplies a birthdate any
  // more, so this is what actually runs in production on every signup.
  describe("gate disabled + no DOB anywhere (the WP-M reality)", () => {
    it("lets an email signup through with NO date of birth at all", () => {
      expect(
        evaluateSignupAgePolicy({ policy: disabled, now: NOW })
      ).toMatchObject({ ok: true, enforced: false });
    });

    it("lets a Google signup through with NO date of birth at all", () => {
      expect(
        evaluateSignupAgePolicy({ dateOfBirth: null, policy: disabled, now: NOW })
      ).toMatchObject({ ok: true, enforced: false });
    });

    it("is the DEFAULT — an unconfigured environment imposes no wall", () => {
      expect(evaluateSignupAgePolicy({ now: NOW })).toMatchObject({ ok: true });
      expect(
        evaluateSignupAgePolicy({ policy: resolveSignupAgePolicy({}), now: NOW })
      ).toMatchObject({ ok: true, enforced: false });
    });
  });

  // A re-enabled gate is now UNSATISFIABLE: no path collects a DOB, so the policy
  // refuses everyone. That is deliberate — a legal control must fail closed rather
  // than silently no-op — and index.js logs a loud config error at boot.
  describe("gate re-enabled without reintroducing DOB collection -> fails closed", () => {
    it("refuses BOTH paths, because neither can supply a birthdate", () => {
      expect(evaluateSignupAgePolicy({ policy: enabled, now: NOW })).toMatchObject({
        ok: false,
        code: "age_verification_required",
      });
      expect(
        evaluateSignupAgePolicy({ dateOfBirth: null, policy: enabled, now: NOW })
      ).toMatchObject({ ok: false, code: "age_verification_required" });
    });

    it("no longer tells the user to go and use the email form", () => {
      // The old copy promised "sign up with your email address so we can collect
      // your date of birth" — that route does not exist any more, so promising it
      // would strand the user in a loop.
      const verdict = evaluateSignupAgePolicy({ policy: enabled, now: NOW });
      expect(verdict.error).not.toMatch(/date of birth/i);
      expect(verdict.error).not.toMatch(/email address/i);
    });
  });

  describe("gate enabled (dormant — only reachable if DOB collection returns)", () => {
    it("accepts a user who is old enough", () => {
      expect(
        evaluateSignupAgePolicy({ dateOfBirth: "2000-01-01", policy: enabled, now: NOW })
      ).toMatchObject({ ok: true, enforced: true });
    });

    it("rejects a user below the threshold", () => {
      expect(
        evaluateSignupAgePolicy({ dateOfBirth: "2015-01-01", policy: enabled, now: NOW })
      ).toMatchObject({ ok: false, code: "minimum_age" });
    });

    it("rejects the exact day before the 16th birthday and accepts the birthday itself", () => {
      expect(
        evaluateSignupAgePolicy({ dateOfBirth: "2010-07-15", policy: enabled, now: NOW })
      ).toMatchObject({ ok: false, code: "minimum_age" });
      expect(
        evaluateSignupAgePolicy({ dateOfBirth: "2010-07-14", policy: enabled, now: NOW })
      ).toMatchObject({ ok: true, age: 16 });
    });

    it("rejects a missing DOB — this is the Google OAuth case", () => {
      // Google's `openid email profile` scope carries no birthdate, so a new
      // Google account has no age signal and cannot pass a hard DOB gate.
      expect(
        evaluateSignupAgePolicy({ dateOfBirth: null, policy: enabled, now: NOW })
      ).toMatchObject({ ok: false, code: "age_verification_required" });
    });

    it("rejects an unparseable DOB", () => {
      expect(
        evaluateSignupAgePolicy({ dateOfBirth: "not-a-date", policy: enabled, now: NOW })
      ).toMatchObject({ ok: false, code: "minimum_age" });
    });
  });

  describe("gate disabled (ToS attestation only)", () => {
    it("imposes no DOB wall on the email path", () => {
      expect(
        evaluateSignupAgePolicy({ dateOfBirth: "2015-01-01", policy: disabled, now: NOW })
      ).toMatchObject({ ok: true, enforced: false });
    });

    it("imposes no DOB wall on the Google path (no DOB available)", () => {
      expect(
        evaluateSignupAgePolicy({ dateOfBirth: null, policy: disabled, now: NOW })
      ).toMatchObject({ ok: true, enforced: false });
    });
  });

  describe("email and Google agree for the same config", () => {
    // The parity guarantee: for identical config + identical DOB, the two auth
    // paths cannot disagree, because they call this one function.
    const cases = [
      { dob: "2000-01-01", policy: enabled },
      { dob: "2015-01-01", policy: enabled },
      { dob: null, policy: enabled },
      { dob: "2000-01-01", policy: disabled },
      { dob: "2015-01-01", policy: disabled },
      { dob: null, policy: disabled },
    ];

    it.each(cases)(
      "dob=$dob enabled=$policy.enabled resolves identically for both callers",
      ({ dob, policy }) => {
        const emailPath = evaluateSignupAgePolicy({
          dateOfBirth: dob,
          policy,
          now: NOW,
        });
        const googlePath = evaluateSignupAgePolicy({
          dateOfBirth: dob,
          policy,
          now: NOW,
        });
        expect(googlePath).toEqual(emailPath);
      }
    );

    it("a 15-year-old is refused on BOTH paths when the gate is on", () => {
      const dob = "2011-01-01";
      expect(evaluateSignupAgePolicy({ dateOfBirth: dob, policy: enabled, now: NOW }).ok).toBe(
        false
      );
      // Google cannot supply a DOB at all, so it is refused too — no free pass.
      expect(evaluateSignupAgePolicy({ dateOfBirth: null, policy: enabled, now: NOW }).ok).toBe(
        false
      );
    });

    it("nobody is refused on either path when the gate is off", () => {
      expect(
        evaluateSignupAgePolicy({ dateOfBirth: "2011-01-01", policy: disabled, now: NOW }).ok
      ).toBe(true);
      expect(
        evaluateSignupAgePolicy({ dateOfBirth: null, policy: disabled, now: NOW }).ok
      ).toBe(true);
    });
  });
});

describe("assertSignupAgePolicy", () => {
  it("throws a 403 carrying the machine-readable code", () => {
    expect(() =>
      assertSignupAgePolicy({
        dateOfBirth: null,
        policy: { enabled: true, minimumAge: 16 },
        now: NOW,
      })
    ).toThrow(
      expect.objectContaining({ status: 403, code: "age_verification_required" })
    );
  });

  it("is a no-op when the gate is disabled — the default, and the live config", () => {
    expect(() =>
      assertSignupAgePolicy({
        dateOfBirth: null,
        policy: { enabled: false, minimumAge: 16 },
        now: NOW,
      })
    ).not.toThrow();
  });
});
