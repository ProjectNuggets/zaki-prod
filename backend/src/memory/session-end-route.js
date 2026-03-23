import { summarizeConversation as summarizeConversationOp } from "./session-summary.js";
import { resolveMemoryCapturePolicy as resolveMemoryCapturePolicyOp } from "./operations.js";

export function createSessionEndHandler({
  requireAuthUser,
  summarizeConversation = summarizeConversationOp,
  resolveMemoryCapturePolicy = resolveMemoryCapturePolicyOp,
  isEnabled = () => process.env.ZAKI_ENABLE_SESSION_SUMMARIZATION === "true",
} = {}) {
  return async function sessionEndHandler(req, res) {
    try {
      if (typeof requireAuthUser !== "function") {
        res.status(500).json({ error: "Memory auth is not configured." });
        return;
      }

      const authResult = await requireAuthUser(req, res);
      if (!authResult) return;
      const userEmail = authResult.email;

      const { messages, threadId, threadTitle } = req.body || {};

      if (!Array.isArray(messages) || messages.length < 3) {
        return res.json({ skipped: true, reason: "conversation_too_short" });
      }

      if (!isEnabled()) {
        return res.json({ skipped: true, reason: "disabled" });
      }

      const { capturePolicy } = await resolveMemoryCapturePolicy(userEmail);
      summarizeConversation({
        userId: userEmail,
        messages,
        threadId,
        threadTitle,
        policy: capturePolicy,
      })
        .then((result) => {
          if (result?.skipped) {
            console.log(
              `[Memory] Session end skipped for ${userEmail}: ${result.reason || "unknown"}`
            );
            return;
          }
          console.log(
            `[Memory] Session ended for ${userEmail}: stored=${result?.stored || 0} duplicates=${result?.duplicates || 0} conflicts=${result?.conflicts || 0} errors=${result?.errors || 0}`
          );
        })
        .catch((err) => {
          console.warn("[Memory] Session processing failed:", err.message);
        });

      res.json({ ok: true, queued: true });
    } catch (error) {
      console.error("[Memory] End session error:", error);
      res.status(500).json({ error: "Failed to process session end" });
    }
  };
}
