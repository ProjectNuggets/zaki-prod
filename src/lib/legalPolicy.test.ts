import { getInitialLegalPolicyVersion, LEGAL_POLICY_VERSION_FALLBACK } from "./legalPolicy";

describe("legal policy runtime config", () => {
  afterEach(() => {
    delete (window as Window & { __ZAKI_LEGAL_POLICY_VERSION__?: string })
      .__ZAKI_LEGAL_POLICY_VERSION__;
  });

  it("falls back to the backend default policy version", () => {
    expect(LEGAL_POLICY_VERSION_FALLBACK).toBe("2026-02-17.v2");
    expect(getInitialLegalPolicyVersion()).toBe("2026-02-17.v2");
  });

  it("uses the runtime-injected policy version when present", () => {
    (window as Window & { __ZAKI_LEGAL_POLICY_VERSION__?: string })
      .__ZAKI_LEGAL_POLICY_VERSION__ = "2026-06-17.v2";

    expect(getInitialLegalPolicyVersion()).toBe("2026-06-17.v2");
  });
});
