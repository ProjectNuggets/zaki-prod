import { beforeEach, describe, it, expect } from "@jest/globals";
import {
  ANONYMOUS_SPACES_WORKSPACE_ID,
  createAnonymousSpaces,
  createAnonymousThreadId,
} from "./anonymousSpaces";
import { DEFAULT_THREAD_LABEL } from "./threadTitles";
import { upsertAnonymousWorkItem } from "./anonymousWork";

describe("anonymousSpaces", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("provisions a single default anonymous space keyed on the shared workspace id", () => {
    const spaces = createAnonymousSpaces();
    expect(spaces).toHaveLength(1);
    // Invariant that the ChatArea anonymous-send fallback depends on: the slug it
    // resolves to (ANONYMOUS_SPACES_WORKSPACE_ID) MUST match the id of the space
    // the Sidebar actually provisions, otherwise the anon send would target a
    // workspace that does not exist. Keep these two in lockstep.
    expect(spaces[0].id).toBe(ANONYMOUS_SPACES_WORKSPACE_ID);
    expect(spaces[0].fixed).toBe(true);
  });

  it("seeds the default anonymous space with a single default-labelled thread", () => {
    const [space] = createAnonymousSpaces();
    expect(space.threads).toHaveLength(1);
    expect(space.threads?.[0]?.label).toBe(DEFAULT_THREAD_LABEL);
    expect(space.threads?.[0]?.id).toMatch(/^anon-/);
  });

  it("mints unique anon-prefixed thread ids", () => {
    const a = createAnonymousThreadId();
    const b = createAnonymousThreadId();
    expect(a).toMatch(/^anon-/);
    expect(b).toMatch(/^anon-/);
    expect(a).not.toBe(b);
  });

  it("reconstructs saved anonymous threads instead of replacing them with an empty placeholder", () => {
    upsertAnonymousWorkItem({
      productId: "spaces",
      taskKind: "chat",
      prompt: "Saved launch discussion",
      reply: "Saved answer",
      threadId: "saved-thread",
      route: "/spaces/zaky/threads/saved-thread",
      title: "Saved launch discussion",
      status: "succeeded",
    });

    const [space] = createAnonymousSpaces();
    expect(space.threads).toEqual([
      expect.objectContaining({
        id: "saved-thread",
        label: "Saved launch discussion",
      }),
    ]);
  });
});
