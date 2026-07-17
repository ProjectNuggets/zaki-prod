import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { claimPendingAnonymousWork, isClaimableProduct } from "@/lib/anonymousWorkClaim";
import { readPendingIntent } from "@/lib/pendingIntent";
import { useAnonymousWorkClaimStore, useAuthStore } from "@/stores";

/**
 * The one post-auth anonymous-work claim, shared by EVERY way a user can become
 * authenticated.
 *
 * It triggers on the appearance of a token — nothing else. That is the whole
 * point: the claim used to live inside the credential-login branch of
 * LoginScreen, so a visitor who signed up with Google returned from the
 * provider, got a token via session hydration, never touched that branch, and
 * had their work silently dropped. Both paths converge on a token, so the claim
 * belongs where the token lands.
 *
 * It navigates to the imported thread ONLY when the server confirms it wrote the
 * work. When nothing was imported the pending intent is deliberately left alone,
 * so ChatArea replays the prompt at the destination and the visitor gets a real
 * answer instead of an empty thread.
 */
export function useAnonymousWorkClaim() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const claimedForTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || isHydrating) return;
    // One claim attempt per authenticated session — survives React's
    // double-invoked effects and any re-render of the host component.
    if (claimedForTokenRef.current === token) return;
    claimedForTokenRef.current = token;

    let isMounted = true;
    const tokenAtClaimStart = token;
    const isCurrentSession = () =>
      useAuthStore.getState().token === tokenAtClaimStart &&
      !useAuthStore.getState().isHydrating;
    const { setClaiming, setResult } = useAnonymousWorkClaimStore.getState();

    void (async () => {
      // A Spaces chat or a WP-F Agent plan preview — the two handoffs that carry real,
      // importable anonymous work. Everything else has nothing to claim.
      if (!isClaimableProduct(readPendingIntent()?.productId)) return;
      if (!isCurrentSession()) return;

      setClaiming();
      const result = await claimPendingAnonymousWork({ shouldCommit: isCurrentSession });
      if (!isMounted || !isCurrentSession()) return;

      setResult(result);

      if (result.status === "imported" && result.route) {
        navigate(result.route, { replace: true });
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [token, isHydrating, navigate]);
}
