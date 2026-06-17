import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  PENDING_INTENT_KEY,
  buildProductReturnTo,
  clearPendingIntent,
  readPendingIntent,
  writePendingIntent,
} from "./pendingIntent";

describe("pending intent", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("stores prompt-preserving auth handoff intent in local storage", () => {
    const intent = writePendingIntent({
      productId: "design",
      taskKind: "brief",
      prompt: "Create a landing page direction",
      source: "dashboard",
      returnTo: "/design",
      anonymousWorkId: "work-1",
    });

    expect(intent?.returnTo).toBe("/design");
    expect(window.localStorage.getItem(PENDING_INTENT_KEY)).not.toBeNull();
    expect(window.sessionStorage.getItem(PENDING_INTENT_KEY)).toBeNull();
    expect(readPendingIntent()).toMatchObject({
      productId: "design",
      taskKind: "brief",
      prompt: "Create a landing page direction",
      anonymousWorkId: "work-1",
    });
  });

  it("sanitizes unsafe return routes and ignores malformed data", () => {
    writePendingIntent({
      productId: "hire",
      taskKind: "rubric",
      prompt: "Build a rubric",
      returnTo: "https://evil.example/hire",
    });

    expect(readPendingIntent()?.returnTo).toBe("/hire");

    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({ productId: "cli", prompt: "No route" })
    );
    expect(readPendingIntent()).toBeNull();
  });

  it("ignores intents older than the short redirect handoff window", () => {
    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({
        productId: "agent",
        taskKind: "preview",
        prompt: "Summarize my notebook",
        returnTo: "/agent",
        createdAt: "2026-06-01T10:00:00.000Z",
      })
    );

    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-06-01T10:29:00.000Z"));
    expect(readPendingIntent()?.prompt).toBe("Summarize my notebook");

    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-06-01T10:31:00.000Z"));
    expect(readPendingIntent()).toBeNull();
  });

  it("clears only the pending intent contract", () => {
    writePendingIntent({
      productId: "brain",
      taskKind: "summary",
      prompt: "Map this note",
    });

    clearPendingIntent();

    expect(readPendingIntent()).toBeNull();
  });

  it("builds canonical product return routes", () => {
    expect(buildProductReturnTo("agent")).toBe("/agent");
    expect(buildProductReturnTo("learning")).toBe("/learn");
    expect(buildProductReturnTo("spaces")).toBe("/spaces");
  });
});
