import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  PENDING_INTENT_KEY,
  buildProductReturnTo,
  clearPendingIntent,
  consumeWebsiteCommandIntentFromUrl,
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

  it("defaults partial handoff intents to plan work", () => {
    const intent = writePendingIntent({
      productId: "agent",
      prompt: "Plan the launch cutover",
    });

    expect(intent?.taskKind).toBe("plan");

    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({
        productId: "agent",
        prompt: "Plan the launch cutover",
        returnTo: "/agent",
        createdAt: "2026-06-01T10:00:00.000Z",
      })
    );
    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-06-01T10:01:00.000Z"));

    expect(readPendingIntent()?.taskKind).toBe("plan");
  });

  it("defaults replay to a safe draft and preserves an explicit submit mode", () => {
    expect(
      writePendingIntent({
        productId: "agent",
        prompt: "Continue my interrupted work",
      })?.replayMode
    ).toBe("draft");

    expect(
      writePendingIntent({
        productId: "spaces",
        prompt: "Start this new chat",
        replayMode: "submit",
      })?.replayMode
    ).toBe("submit");
    expect(readPendingIntent()?.replayMode).toBe("submit");
  });

  it("sanitizes unsafe return routes and ignores malformed data", () => {
    // WP-K: retired products are no longer valid intent product ids at all, so a
    // "hire" intent is rejected outright rather than resolving to the dashboard.
    // (Stronger than WP-14, which only neutered its returnTo.)
    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({
        productId: "hire",
        taskKind: "rubric",
        prompt: "Build a rubric",
        returnTo: "https://evil.example/hire",
        createdAt: new Date().toISOString(),
      })
    );
    expect(readPendingIntent()).toBeNull();

    // A live product with an external returnTo still gets its route sanitized.
    writePendingIntent({
      productId: "agent",
      taskKind: "rubric",
      prompt: "Build a rubric",
      returnTo: "https://evil.example/agent",
    });
    expect(readPendingIntent()?.returnTo).toBe("/agent");

    writePendingIntent({
      productId: "agent",
      taskKind: "rubric",
      prompt: "Build a safer rubric",
      returnTo: "/./\\evil.example/agent",
    });
    expect(readPendingIntent()?.returnTo).toBe("/agent");

    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({ productId: "cli", prompt: "No route" })
    );
    expect(readPendingIntent()).toBeNull();
  });

  it("maps the legacy 'chat' product id onto the canonical Spaces lane", () => {
    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({
        productId: "chat",
        taskKind: "chat",
        prompt: "Draft a reply",
        returnTo: "/spaces",
        createdAt: new Date().toISOString(),
      })
    );

    const intent = readPendingIntent();
    expect(intent?.productId).toBe("spaces");
    expect(intent?.returnTo).toBe("/spaces");
  });

  it("keeps intents across OAuth and email verification for up to 24 hours", () => {
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

    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-06-02T09:59:00.000Z"));
    expect(readPendingIntent()?.prompt).toBe("Summarize my notebook");

    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-06-02T10:01:00.000Z"));
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

  it("announces the exact work when browser storage cannot preserve it", () => {
    const handleFailure = jest.fn();
    window.addEventListener("zaki:pending-intent-storage-failed", handleFailure);
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });

    try {
      expect(
        writePendingIntent({
          productId: "brain",
          prompt: "Keep this memory note visible",
          returnTo: "/brain",
        })
      ).toBeNull();
      expect(handleFailure).toHaveBeenCalledTimes(1);
      expect((handleFailure.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
        productId: "brain",
        prompt: "Keep this memory note visible",
      });
    } finally {
      window.removeEventListener("zaki:pending-intent-storage-failed", handleFailure);
    }
  });

  it("builds canonical product return routes for the visible spokes", () => {
    // WP-14: only the four release-visible spokes have canonical routes.
    expect(buildProductReturnTo("agent")).toBe("/agent");
    expect(buildProductReturnTo("spaces")).toBe("/spaces");
    expect(buildProductReturnTo("design")).toBe("/design");
    expect(buildProductReturnTo("minutes")).toBe("/minutes");
  });

  it("falls back to the dashboard for hidden products", () => {
    // WP-14: Learn + Hire/Career are hidden, so they have no canonical route.
    expect(buildProductReturnTo("learning")).toBe("/");
    expect(buildProductReturnTo("hire")).toBe("/");
  });

  it("consumes website command query params into a replayable pending intent", () => {
    const intent = consumeWebsiteCommandIntentFromUrl({
      pathname: "/agent",
      search:
        "?source=website_home_command&intent=agent&prompt=Plan%20my%20launch",
    });

    expect(intent).toMatchObject({
      productId: "agent",
      taskKind: "agent",
      prompt: "Plan my launch",
      source: "website_home_command",
      returnTo: "/agent",
    });
    expect(readPendingIntent()).toMatchObject({
      productId: "agent",
      prompt: "Plan my launch",
    });
  });

  it("maps anonymous website command intent to Chat and ignores non-website sources", () => {
    expect(
      consumeWebsiteCommandIntentFromUrl({
        pathname: "/",
        search:
          "?source=website_home_command&intent=anonymous_command&prompt=Draft%20this",
      })
    ).toMatchObject({
      productId: "spaces",
      returnTo: "/spaces",
    });

    clearPendingIntent();

    expect(
      consumeWebsiteCommandIntentFromUrl({
        pathname: "/agent",
        search: "?source=dashboard&intent=agent&prompt=Ignore%20me",
      })
    ).toBeNull();
    expect(readPendingIntent()).toBeNull();
  });
});
