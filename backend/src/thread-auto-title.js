import { callNovaTypChat, parseJsonObjectFromText } from "./memory/nova-chat.js";

export const DEFAULT_THREAD_LABEL = "New chat";

const DEFAULT_THREAD_LABELS = new Set(["", DEFAULT_THREAD_LABEL.toLowerCase(), "thread"]);
const GENERIC_TITLES = new Set([
  "",
  DEFAULT_THREAD_LABEL.toLowerCase(),
  "thread",
  "untitled",
  "conversation",
]);

export function isDefaultThreadLabel(label) {
  return DEFAULT_THREAD_LABELS.has(String(label || "").trim().toLowerCase());
}

function getThreadSlug(thread) {
  return String(thread?.slug ?? thread?.id ?? "").trim();
}

function getThreadName(thread) {
  return String(thread?.name ?? thread?.label ?? "").trim();
}

function extractWorkspaceFromUpstream(data) {
  if (Array.isArray(data?.workspace)) {
    return data.workspace[0] || null;
  }
  return data?.workspace || null;
}

function mergeThreadNamesFromWorkspaceSummary(workspace, workspaceSummaries = []) {
  if (!workspace || typeof workspace !== "object") return workspace;
  const detailThreads = Array.isArray(workspace.threads) ? workspace.threads : [];
  const workspaceSummary = Array.isArray(workspaceSummaries)
    ? workspaceSummaries.find(
        (entry) => String(entry?.slug || "").trim().toLowerCase() === String(workspace?.slug || "").trim().toLowerCase()
      ) || null
    : null;
  const summaryThreads = Array.isArray(workspaceSummary?.threads) ? workspaceSummary.threads : [];
  if (detailThreads.length === 0 || summaryThreads.length === 0) return workspace;

  const summaryBySlug = new Map(
    summaryThreads
      .map((thread) => {
        const slug = getThreadSlug(thread);
        const name = getThreadName(thread);
        return slug ? [slug, name] : null;
      })
      .filter(Boolean)
  );

  return {
    ...workspace,
    threads: detailThreads.map((thread) => {
      const slug = getThreadSlug(thread);
      const summaryName = summaryBySlug.get(slug);
      if (!summaryName) return thread;
      return { ...thread, name: summaryName, label: summaryName };
    }),
  };
}

export function sanitizeGeneratedThreadTitle(input) {
  const stripped = String(input || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/[.!?؟]+$/g, "")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .trim();

  if (!stripped) return "";
  const words = stripped.split(/\s+/).filter(Boolean).slice(0, 8);
  const compact = words.join(" ").slice(0, 48).trim();
  if (!compact) return "";
  if (GENERIC_TITLES.has(compact.toLowerCase())) return "";
  return compact;
}

function buildAutoTitleMessages({ userMessage, assistantMessage }) {
  return [
    {
      role: "system",
      content: [
        "You generate short chat thread titles.",
        "Return ONLY valid JSON with one key: title.",
        "Rules:",
        "- 3 to 6 words preferred, 8 words maximum.",
        "- Use the same language as the user's message.",
        "- Be concrete and descriptive.",
        "- No quotes, emoji, markdown, or ending period.",
        "- Focus on the user's topic, not the assistant's tone.",
        '- Avoid filler like "Help with", "Question about", or "Chat about".',
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "Create a short chat title from this first exchange.",
        "",
        `USER:\n${String(userMessage || "").trim().slice(0, 1200)}`,
        "",
        `ASSISTANT:\n${String(assistantMessage || "").trim().slice(0, 1200)}`,
      ].join("\n"),
    },
  ];
}

function extractFirstExchangeFromHistory(history = []) {
  let firstUserMessage = "";
  let firstAssistantMessage = "";

  for (const entry of Array.isArray(history) ? history : []) {
    const role = String(entry?.role || "").trim().toLowerCase();
    const content = String(entry?.content || "").trim();
    if (!content) continue;

    if (!firstUserMessage && role === "user") {
      firstUserMessage = content;
      continue;
    }

    if (firstUserMessage && !firstAssistantMessage && role === "assistant") {
      firstAssistantMessage = content;
      break;
    }
  }

  return {
    userMessage: firstUserMessage,
    assistantMessage: firstAssistantMessage,
  };
}

export function createThreadAutoTitleHandler({
  requireWorkspaceAccess,
  novaAdminRequest,
  chatFn = callNovaTypChat,
} = {}) {
  return async function threadAutoTitleHandler(req, res) {
    try {
      const access = await requireWorkspaceAccess(req, res);
      if (!access) return;

      const threadSlug = String(req.params.threadSlug || "").trim();
      const fallbackUserMessage = String(req.body?.userMessage || "").trim();
      const fallbackAssistantMessage = String(req.body?.assistantMessage || "").trim();

      if (!threadSlug) {
        res.status(400).json({ error: "Thread slug is required." });
        return;
      }

      const workspaceResponse = await novaAdminRequest(`/v1/workspace/${access.slug}`);
      const workspaceData = await workspaceResponse.json().catch(() => ({}));
      let summariesData = {};
      try {
        const summariesResponse = await novaAdminRequest("/v1/workspaces");
        summariesData = await summariesResponse.json().catch(() => ({}));
      } catch {
        summariesData = {};
      }
      const workspace = mergeThreadNamesFromWorkspaceSummary(
        extractWorkspaceFromUpstream(workspaceData),
        summariesData?.workspaces
      );
      const threads = Array.isArray(workspace?.threads)
        ? workspace.threads
        : [];
      const existingThread = threads.find((thread) => getThreadSlug(thread) === threadSlug);

      if (!existingThread) {
        res.status(200).json({ status: "skipped", reason: "thread_not_found" });
        return;
      }

      const currentName = getThreadName(existingThread);
      if (!isDefaultThreadLabel(currentName)) {
        res.status(200).json({ status: "skipped", reason: "not_default_label" });
        return;
      }

      let userMessage = fallbackUserMessage;
      let assistantMessage = fallbackAssistantMessage;
      try {
        const historyResponse = await novaAdminRequest(
          `/v1/workspace/${access.slug}/thread/${encodeURIComponent(threadSlug)}/chats`
        );
        const historyData = await historyResponse.json().catch(() => ({}));
        if (historyResponse.ok) {
          const derived = extractFirstExchangeFromHistory(historyData?.history);
          if (derived.userMessage && derived.assistantMessage) {
            userMessage = derived.userMessage;
            assistantMessage = derived.assistantMessage;
          }
        }
      } catch {
        // Fall back to the client-provided exchange.
      }

      if (!userMessage || !assistantMessage) {
        res.status(200).json({ status: "skipped", reason: "insufficient_content" });
        return;
      }

      let generatedTitle = "";
      try {
        const result = await chatFn({
          messages: buildAutoTitleMessages({ userMessage, assistantMessage }),
          jsonMode: true,
          temperature: 0.1,
          maxTokens: 80,
          timeoutMs: 4_000,
          label: "Thread auto-title request",
        });
        const parsed = parseJsonObjectFromText(result.content || "");
        generatedTitle = sanitizeGeneratedThreadTitle(parsed?.title);
      } catch {
        generatedTitle = "";
      }

      if (!generatedTitle) {
        res.status(200).json({ status: "skipped", reason: "generation_failed" });
        return;
      }

      const updateResponse = await novaAdminRequest(
        `/v1/workspace/${access.slug}/thread/${encodeURIComponent(threadSlug)}/update`,
        {
          method: "POST",
          body: JSON.stringify({ name: generatedTitle }),
        }
      );
      const updateData = await updateResponse.json().catch(() => ({}));

      const updatedThread = updateData?.thread || null;
      const updatedThreadSlug = getThreadSlug(updatedThread);
      const updatedThreadName = getThreadName(updatedThread);

      if (!updateResponse.ok || !updatedThreadSlug || !updatedThreadName) {
        res.status(200).json({ status: "skipped", reason: "generation_failed" });
        return;
      }

      res.status(200).json({
        status: "updated",
        thread: {
          slug: updatedThreadSlug,
          name: updatedThreadName,
        },
      });
    } catch (error) {
      console.error("[Workspace] Thread auto-title error:", error);
      res.status(500).json({ error: error?.message || "Unable to auto-title thread." });
    }
  };
}
