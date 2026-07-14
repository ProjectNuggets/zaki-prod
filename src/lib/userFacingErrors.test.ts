import {
  GENERIC_ERROR_CODE,
  USER_FACING_ERRORS,
  canonicalizeErrorCode,
  codeFromHttpStatus,
  looksLikeMachineCode,
  resolveErrorMessage,
  resolveUserFacingError,
} from "./userFacingErrors";

// The taxonomy resolves i18n keys; in tests we return the defaultValue, which is the
// real English copy that ships. That means these assertions are checking the copy the
// user actually sees.
const t = (_key: string, opts?: Record<string, unknown>) =>
  String(opts?.defaultValue ?? _key);

// Every machine code the BFF is known to emit for a chat/agent failure. NONE of these
// may ever reach the DOM — that is the whole point of WP-C.
const MACHINE_CODES = [
  "invalid_session_key",
  "missing_session_key",
  "invalid_session_lane",
  "session_key_user_mismatch",
  "session_not_owned",
  "invalid_user_id",
  "rate_limited",
  "content_filter",
  "network_drop",
  "context_window_exceeded",
  "timeout",
  "model_overload",
  "provision_failed",
  "unauthorized",
  "forbidden",
  "gateway_draining",
  "agent_unavailable",
  "temporary_contention",
  "overloaded",
  "too_many_requests",
  "context_length_exceeded",
  "request_timeout",
];

describe("looksLikeMachineCode", () => {
  it("recognises snake_case machine codes", () => {
    expect(looksLikeMachineCode("invalid_session_key")).toBe(true);
    expect(looksLikeMachineCode("daily_limit_reached")).toBe(true);
    expect(looksLikeMachineCode("rate_limited")).toBe(true);
  });

  it("does NOT flag human sentences as codes", () => {
    expect(looksLikeMachineCode("Agent setup is unavailable.")).toBe(false);
    expect(looksLikeMachineCode("Invalid user.")).toBe(false);
    expect(looksLikeMachineCode("Something went wrong")).toBe(false);
    expect(looksLikeMachineCode("")).toBe(false);
    expect(looksLikeMachineCode(null)).toBe(false);
  });
});

describe("resolveUserFacingError — spec §G taxonomy", () => {
  // The six conditions the spec names explicitly, each with tailored copy + ONE action.
  it.each([
    ["rate_limited", "retry"],
    ["content_filter", "rephrase"],
    ["network_drop", "retry"],
    ["context_window_exceeded", "shorten"],
    ["timeout", "retry"],
    ["model_overload", "switch_model"],
  ])("%s resolves to tailored copy with exactly one action (%s)", (code, action) => {
    const resolved = resolveUserFacingError(code, t);
    expect(resolved.code).toBe(code);
    expect(resolved.action).toBe(action);
    // Tailored, not generic.
    expect(resolved.body).not.toBe(resolveUserFacingError("__nope__", t).body);
    // Exactly one recovery action: a single non-empty label.
    expect(resolved.actionLabel).toBeTruthy();
    expect(typeof resolved.actionLabel).toBe("string");
  });

  it("context_window_exceeded suggests SHORTENING", () => {
    const resolved = resolveUserFacingError("context_window_exceeded", t);
    expect(resolved.body).toMatch(/shorten/i);
    expect(resolved.action).toBe("shorten");
  });

  it("model_overload suggests SWITCHING models", () => {
    const resolved = resolveUserFacingError("model_overload", t);
    expect(resolved.body).toMatch(/switch/i);
    expect(resolved.action).toBe("switch_model");
  });

  it("every taxonomy entry has exactly ONE action", () => {
    for (const entry of Object.values(USER_FACING_ERRORS)) {
      expect(typeof entry.action).toBe("string");
      expect(entry.action.length).toBeGreaterThan(0);
      expect(entry.actionLabelKey).toBeTruthy();
    }
  });

  // (d) — the core WP-C guarantee, asserted against every known code.
  it("NEVER returns a machine code in any user-facing field", () => {
    for (const code of MACHINE_CODES) {
      const resolved = resolveUserFacingError(code, t);
      // No field is ITSELF a bare snake_case identifier.
      expect(looksLikeMachineCode(resolved.title)).toBe(false);
      expect(looksLikeMachineCode(resolved.body)).toBe(false);
      expect(looksLikeMachineCode(resolved.actionLabel)).toBe(false);
      expect(resolved.title).not.toBe(code);
      expect(resolved.body).not.toBe(code);
      // And no snake_case identifier is EMBEDDED in the copy. (Single-word codes like
      // `overloaded` are ordinary English words — "the model is overloaded" is correct
      // copy, not a leak. Only underscore-bearing identifiers can leak.)
      if (code.includes("_")) {
        expect(resolved.title).not.toContain(code);
        expect(resolved.body).not.toContain(code);
        expect(resolved.actionLabel).not.toContain(code);
      }
    }
  });

  it("folds backend dialects onto canonical codes", () => {
    expect(canonicalizeErrorCode("too_many_requests")).toBe("rate_limited");
    expect(canonicalizeErrorCode("context_length_exceeded")).toBe("context_window_exceeded");
    expect(canonicalizeErrorCode("overloaded")).toBe("model_overload");
    expect(canonicalizeErrorCode("gateway_draining")).toBe("model_overload");
    expect(canonicalizeErrorCode("missing_session_key")).toBe("invalid_session_key");
  });

  it("an unknown code degrades to generic copy, never to the code itself", () => {
    const resolved = resolveUserFacingError("some_brand_new_code", t);
    expect(resolved.code).toBe(GENERIC_ERROR_CODE);
    expect(resolved.body).not.toContain("some_brand_new_code");
    expect(looksLikeMachineCode(resolved.body)).toBe(false);
  });
});

describe("resolveErrorMessage — the precedence inversion", () => {
  // THE regression: `{ error: "invalid_session_key" }` with no message used to render
  // the machine code verbatim in a banner AND a toast.
  it("never renders a bare machine code from `error`", () => {
    const message = resolveErrorMessage({ error: "invalid_session_key" }, t);
    expect(message).not.toBe("invalid_session_key");
    expect(message).not.toContain("invalid_session_key");
    expect(looksLikeMachineCode(message)).toBe(false);
    // It gets the TAILORED session copy, not just anything.
    expect(message).toMatch(/no longer valid|new chat/i);
  });

  it("prefers a human `message` over everything else", () => {
    expect(
      resolveErrorMessage(
        { code: "rate_limited", message: "Slow down there.", error: "rate_limited" },
        t
      )
    ).toBe("Slow down there.");
  });

  it("still honours a HUMAN sentence carried in `error` (legacy routes do this)", () => {
    expect(resolveErrorMessage({ error: "Agent setup is unavailable." }, t)).toBe(
      "Agent setup is unavailable."
    );
  });

  it("discards a code-shaped `message` and falls back to the taxonomy", () => {
    const message = resolveErrorMessage(
      { code: "timeout", message: "invalid_session_key" },
      t
    );
    expect(message).not.toContain("invalid_session_key");
    expect(message).toMatch(/didn't respond in time/i);
  });

  it("resolves from `code` when no copy is supplied at all", () => {
    expect(resolveErrorMessage({ code: "content_filter" }, t)).toMatch(/rephras/i);
  });
});

describe("codeFromHttpStatus", () => {
  it("maps statuses onto the taxonomy so a bodyless failure still gets real copy", () => {
    expect(codeFromHttpStatus(429)).toBe("rate_limited");
    expect(codeFromHttpStatus(504)).toBe("timeout");
    expect(codeFromHttpStatus(503)).toBe("model_overload");
    expect(codeFromHttpStatus(401)).toBe("unauthorized");
    expect(codeFromHttpStatus(418)).toBe(GENERIC_ERROR_CODE);
  });
});
