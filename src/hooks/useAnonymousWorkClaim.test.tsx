import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAnonymousWorkClaim } from "./useAnonymousWorkClaim";
import { useAnonymousWorkClaimStore, useAuthStore } from "@/stores";
import { readAnonymousWorkLedger, upsertAnonymousWorkItem } from "@/lib/anonymousWork";
import { claimAnonymousSpacesWork } from "@/lib/api";
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

  it("does not claim without a pending Spaces intent", async () => {
    seedCompletedAnonymousWork();
    arriveAuthenticatedViaOAuthReturn();
    renderHost();

    await waitFor(() => {
      expect(useAnonymousWorkClaimStore.getState().status).toBe("idle");
    });
    expect(claimAnonymousSpacesWork).not.toHaveBeenCalled();
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
