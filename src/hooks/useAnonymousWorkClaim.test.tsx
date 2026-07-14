import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAnonymousWorkClaim } from "./useAnonymousWorkClaim";
import { useAnonymousWorkClaimStore, useAuthStore } from "@/stores";
import { readAnonymousWorkLedger, upsertAnonymousWorkItem } from "@/lib/anonymousWork";
import { claimAnonymousSpacesWork } from "@/lib/api";
import { saveAgentPlanForClaim } from "@/lib/agentPlanPreview";
import { PENDING_INTENT_KEY, readPendingIntent } from "@/lib/pendingIntent";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom") as Record<string, unknown>;
  return { ...actual, useNavigate: () => mockNavigate };
});

jest.mock("@/lib/api", () => ({
  claimAnonymousSpacesWork: jest.fn(),
}));

/**
 * A host component that does nothing but mount the shared claim hook. It stands
 * in for App: the hook must fire from the presence of a token alone, with no
 * LoginScreen anywhere in the tree — which is exactly the situation a Google
 * OAuth return produces.
 */
function ClaimHost() {
  useAnonymousWorkClaim();
  return <div data-testid="host" />;
}

function renderHost() {
  return render(
    <MemoryRouter>
      <ClaimHost />
    </MemoryRouter>
  );
}

function seedPendingSpacesIntent(anonymousWorkId: string) {
  window.localStorage.setItem(
    PENDING_INTENT_KEY,
    JSON.stringify({
      productId: "spaces",
      taskKind: "chat",
      prompt: "Draft the launch memo",
      source: "dashboard",
      returnTo: "/spaces/zaky/threads/anon-abc",
      anonymousWorkId,
      createdAt: new Date().toISOString(),
    })
  );
}

function seedCompletedAnonymousWork() {
  return upsertAnonymousWorkItem({
    productId: "spaces",
    taskKind: "chat",
    prompt: "Draft the launch memo",
    replyPreview: "Here is the memo: intro, positioning...",
    reply: "Here is the memo:\n\n## Intro\n\n## Positioning",
    title: "Launch memo",
    route: "/spaces/zaky/threads/anon-abc",
    threadId: "anon-abc",
    meterRemaining: 19,
    status: "succeeded",
  });
}

/** The token arrives from session hydration — no LoginScreen, no credential form. */
function arriveAuthenticatedViaOAuthReturn() {
  useAuthStore.setState({
    token: "google-oauth-token",
    user: { id: 7, username: "google@example.com" },
    isHydrating: false,
    isLoading: false,
  });
}

const IMPORTED_OK = {
  response: { ok: true },
  data: {
    success: true,
    route: "/spaces/signed-space/threads/thread-1",
    imported: true,
    importedCount: 2,
  },
};

describe("useAnonymousWorkClaim — the shared post-auth claim", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    useAnonymousWorkClaimStore.getState().reset();
    useAuthStore.setState({ token: null, user: null, isHydrating: false, isLoading: false });
    (claimAnonymousSpacesWork as unknown as jest.Mock).mockResolvedValue(IMPORTED_OK);
  });

  // (e) THE regression this exists to prevent. The claim used to live inside
  // LoginScreen's credential branch, which a Google sign-up never touches — so
  // Google users' work was dropped on the floor, every time.
  it("claims the work when the user arrives authenticated via the Google OAuth return", async () => {
    const savedWork = seedCompletedAnonymousWork();
    seedPendingSpacesIntent(savedWork!.id);

    // Mount FIRST, unauthenticated — this is the app booting on the OAuth
    // redirect target. No LoginScreen is involved anywhere.
    renderHost();
    expect(claimAnonymousSpacesWork).not.toHaveBeenCalled();

    // Then the refresh cookie hydrates a token, exactly as App does after the
    // OAuth callback redirects back.
    arriveAuthenticatedViaOAuthReturn();

    await waitFor(() => {
      expect(claimAnonymousSpacesWork).toHaveBeenCalledTimes(1);
    });
    expect(claimAnonymousSpacesWork).toHaveBeenCalledWith(
      expect.objectContaining({
        workId: savedWork!.id,
        prompt: "Draft the launch memo",
        reply: "Here is the memo:\n\n## Intro\n\n## Positioning",
      })
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/spaces/signed-space/threads/thread-1", {
        replace: true,
      });
    });
  });

  it("claims the work when the token arrives from a credential login too", async () => {
    const savedWork = seedCompletedAnonymousWork();
    seedPendingSpacesIntent(savedWork!.id);

    // Already authenticated at mount — what a credential login leaves behind
    // after LoginScreen sets the token and redirects.
    useAuthStore.setState({
      token: "credential-token",
      user: { id: 42, username: "user@example.com" },
      isHydrating: false,
      isLoading: false,
    });
    renderHost();

    await waitFor(() => {
      expect(claimAnonymousSpacesWork).toHaveBeenCalledTimes(1);
    });
  });

  // (c) The ledger is the ONLY copy of the conversation. It is consumed only
  // once the server confirms the import.
  it("clears the ledger item after — and only after — the server confirms the import", async () => {
    const savedWork = seedCompletedAnonymousWork();
    seedPendingSpacesIntent(savedWork!.id);
    expect(readAnonymousWorkLedger().items).toHaveLength(1);

    arriveAuthenticatedViaOAuthReturn();
    renderHost();

    await waitFor(() => {
      expect(readAnonymousWorkLedger().items).toHaveLength(0);
    });
    expect(useAnonymousWorkClaimStore.getState().status).toBe("imported");
    expect(useAnonymousWorkClaimStore.getState().importedCount).toBe(2);
  });

  it("KEEPS the ledger item when the server imported nothing", async () => {
    (claimAnonymousSpacesWork as unknown as jest.Mock).mockResolvedValueOnce({
      response: { ok: true },
      data: {
        success: true,
        route: "/spaces/signed-space/threads/thread-1",
        imported: false,
        importedCount: 0,
      },
    });
    const savedWork = seedCompletedAnonymousWork();
    seedPendingSpacesIntent(savedWork!.id);

    arriveAuthenticatedViaOAuthReturn();
    renderHost();

    await waitFor(() => {
      expect(useAnonymousWorkClaimStore.getState().status).toBe("nothing");
    });
    // Destroying the only copy of the work because a claim *ran* would lose it
    // outright. Nothing landed, so nothing is thrown away.
    expect(readAnonymousWorkLedger().items).toHaveLength(1);
    // (d) And the UI is given no basis to claim otherwise.
    expect(useAnonymousWorkClaimStore.getState().importedCount).toBe(0);
  });

  it("KEEPS the ledger item when the claim fails outright", async () => {
    (claimAnonymousSpacesWork as unknown as jest.Mock).mockResolvedValueOnce({
      response: { ok: false },
      data: { success: false, error: "Spaces is temporarily unavailable.", retryable: true },
    });
    const savedWork = seedCompletedAnonymousWork();
    seedPendingSpacesIntent(savedWork!.id);

    arriveAuthenticatedViaOAuthReturn();
    renderHost();

    await waitFor(() => {
      expect(useAnonymousWorkClaimStore.getState().status).toBe("error");
    });
    expect(readAnonymousWorkLedger().items).toHaveLength(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Pending-intent ordering: the replay must still be able to consume it.
  it("retires the pending intent after an import, so the prompt is not replayed on top of it", async () => {
    const savedWork = seedCompletedAnonymousWork();
    seedPendingSpacesIntent(savedWork!.id);

    arriveAuthenticatedViaOAuthReturn();
    renderHost();

    await waitFor(() => {
      expect(useAnonymousWorkClaimStore.getState().status).toBe("imported");
    });
    // The conversation is already IN the thread. Replaying the prompt would ask
    // the same question twice and bill a second answer.
    expect(readPendingIntent()).toBeNull();
  });

  it("LEAVES the pending intent for ChatArea to replay when there was nothing to import", async () => {
    // A draft: the visitor typed a prompt but never got an answer, so there is
    // no conversation to carry over — it must be replayed for real instead.
    const draft = upsertAnonymousWorkItem({
      productId: "spaces",
      taskKind: "chat",
      prompt: "Draft the launch memo",
      title: "Launch memo",
      route: "/spaces/zaky/threads/anon-abc",
      threadId: "anon-abc",
      meterRemaining: 19,
      status: "draft",
    });
    seedPendingSpacesIntent(draft!.id);

    arriveAuthenticatedViaOAuthReturn();
    renderHost();

    await waitFor(() => {
      expect(useAnonymousWorkClaimStore.getState().status).toBe("idle");
    });
    // No answer existed, so we do not pretend to have kept one...
    expect(claimAnonymousSpacesWork).not.toHaveBeenCalled();
    // ...and the intent SURVIVES so ChatArea replays the prompt and the visitor
    // actually gets an answer, instead of landing in an empty thread.
    expect(readPendingIntent()).not.toBeNull();
    expect(readPendingIntent()?.prompt).toBe("Draft the launch memo");
  });

  it("does not claim without a pending claimable intent", async () => {
    seedCompletedAnonymousWork();
    arriveAuthenticatedViaOAuthReturn();
    renderHost();

    await waitFor(() => {
      expect(useAnonymousWorkClaimStore.getState().status).toBe("idle");
    });
    expect(claimAnonymousSpacesWork).not.toHaveBeenCalled();
  });

  // ── WP-F — the anonymous Agent PLAN PREVIEW claims through this SAME path ──────────────
  //
  // The whole point of "Save and continue" is that the plan the visitor just read survives
  // signup. It does that by reusing this claim, not a parallel one. The hazard is #89's own
  // rule working against us: a DRAFT with no reply imports nothing. A plan is a real result,
  // so saveAgentPlanForClaim writes it as `status: "succeeded"` with the plan as the reply —
  // and these tests are what prove the plan actually lands in the account.

  it("imports a saved anonymous Agent PLAN after signup (WP-F Save and continue)", async () => {
    const plan = saveAgentPlanForClaim({
      prompt: "Plan the cutover checklist",
      steps: ["Freeze writes", "Migrate the tables", "Flip the DNS"],
      planMarkdown:
        "**Agent plan (preview)**\n\nTask: Plan the cutover checklist\n\n1. Freeze writes\n2. Migrate the tables\n3. Flip the DNS",
    });
    expect(plan).toBeTruthy();

    arriveAuthenticatedViaOAuthReturn();
    renderHost();

    await waitFor(() => {
      expect(claimAnonymousSpacesWork).toHaveBeenCalledTimes(1);
    });

    // The claim carries the PLAN as the assistant reply — which is exactly what
    // buildClaimTurns() needs (a prompt AND a reply) to write two rows instead of zero.
    const payload = (claimAnonymousSpacesWork as unknown as jest.Mock).mock.calls[0]![0] as {
      prompt: string;
      reply: string;
      workId: string;
      route: string;
    };
    expect(payload.prompt).toBe("Plan the cutover checklist");
    expect(payload.reply).toContain("Freeze writes");
    expect(payload.reply).toContain("Flip the DNS");
    expect(payload.workId).toBe(plan);
    expect(payload.route).toBe("/agent");

    // And the server confirmed the import, so the store says so.
    await waitFor(() => {
      expect(useAnonymousWorkClaimStore.getState().status).toBe("imported");
    });
    expect(useAnonymousWorkClaimStore.getState().importedCount).toBe(2);
  });

  // The guard rail on the guard rail: an Agent row with NO plan is a draft, and #89 must keep
  // refusing to import it. If this ever starts importing, we are back to shipping empty threads.
  it("still imports NOTHING for an Agent draft that never got a plan", async () => {
    const draft = upsertAnonymousWorkItem({
      productId: "agent",
      taskKind: "plan",
      prompt: "Plan the cutover checklist",
      route: "/agent",
      status: "draft",
    });
    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({
        productId: "agent",
        taskKind: "plan",
        prompt: "Plan the cutover checklist",
        source: "dashboard",
        returnTo: "/agent",
        anonymousWorkId: draft!.id,
        createdAt: new Date().toISOString(),
      })
    );

    arriveAuthenticatedViaOAuthReturn();
    renderHost();

    await waitFor(() => {
      expect(useAnonymousWorkClaimStore.getState().status).toBe("idle");
    });
    // No reply -> nothing to keep -> the claim is never even attempted.
    expect(claimAnonymousSpacesWork).not.toHaveBeenCalled();
    // And the draft survives locally so the prompt can still be replayed.
    expect(readAnonymousWorkLedger().items).toHaveLength(1);
  });

  it("claims once per session, not once per render", async () => {
    const savedWork = seedCompletedAnonymousWork();
    seedPendingSpacesIntent(savedWork!.id);
    arriveAuthenticatedViaOAuthReturn();

    const { rerender } = renderHost();
    rerender(
      <MemoryRouter>
        <ClaimHost />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(claimAnonymousSpacesWork).toHaveBeenCalledTimes(1);
    });
  });

  it("does not claim while the session is still hydrating", async () => {
    const savedWork = seedCompletedAnonymousWork();
    seedPendingSpacesIntent(savedWork!.id);
    useAuthStore.setState({
      token: "token-mid-hydration",
      user: null,
      isHydrating: true,
      isLoading: true,
    });

    renderHost();

    await waitFor(() => expect(useAnonymousWorkClaimStore.getState().status).toBe("idle"));
    expect(claimAnonymousSpacesWork).not.toHaveBeenCalled();
  });
});
