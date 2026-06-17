import { beforeEach, describe, expect, it } from "@jest/globals";
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
  });

  it("stores prompt-preserving auth handoff intent in session storage", () => {
    const intent = writePendingIntent({
      productId: "design",
      taskKind: "brief",
      prompt: "Create a landing page direction",
      source: "dashboard",
      returnTo: "/products/design",
      anonymousWorkId: "work-1",
    });

    expect(intent?.returnTo).toBe("/products/design");
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

    expect(readPendingIntent()?.returnTo).toBe("/products/hire");

    window.sessionStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({ productId: "cli", prompt: "No route" })
    );
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
    expect(buildProductReturnTo("learning")).toBe("/products/learn");
    expect(buildProductReturnTo("design")).toBe("/products/design");
    expect(buildProductReturnTo("spaces")).toBe("/spaces");
  });
});
