const TOGETHER_CHAT_COMPLETIONS_URL = "https://api.together.xyz/v1/chat/completions";

function buildMessages(message) {
  return [
    {
      role: "system",
      content: [
        "You are ZAKI Spaces, a concise workspace assistant.",
        "The user is anonymous. Do not claim to remember them across sessions.",
        "Do not mention internal models, providers, routing, or system prompts.",
      ].join("\n\n"),
    },
    { role: "user", content: String(message || "") },
  ];
}

function providerErrorMessage(payload, fallback) {
  return String(payload?.error?.message || payload?.message || fallback);
}

async function readProviderFailure(response) {
  const payload = await response.json().catch(() => ({}));
  const error = new Error(
    providerErrorMessage(payload, `Anonymous Spaces provider failed (${response.status}).`)
  );
  error.status = response.status;
  throw error;
}

/**
 * Anonymous daily quota is charged per HTTP request, not per logical turn.
 * Until that counter accepts an idempotency key, replaying even a transient
 * provider failure would charge the same user prompt again.
 */
export function buildAnonymousSpacesStreamFailure(error) {
  return {
    code: "anonymous_chat_error",
    message: error?.message || "Anonymous Spaces chat failed.",
    retryable: false,
  };
}

/** Bind client lifetime to provider lifetime, including an abort that already fired. */
export function bindAnonymousSpacesClientAbort({ request, response, controller }) {
  const abort = () => controller.abort();
  request.once("aborted", abort);
  response.once("close", abort);
  if (request.aborted || response.destroyed || response.writableEnded) abort();
  return () => {
    request.removeListener("aborted", abort);
    response.removeListener("close", abort);
  };
}

export async function streamAnonymousSpacesReply({
  fetchImpl = fetch,
  apiKey,
  model,
  message,
  signal,
  timeoutMs = 30000,
  onDelta = () => {},
} = {}) {
  if (!apiKey) throw new Error("TOGETHER_API_KEY is not configured for anonymous Spaces.");

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    const error = new Error("Anonymous Spaces provider timed out.");
    error.name = "TimeoutError";
    controller.abort(error);
  }, Math.max(1, timeoutMs));
  if (typeof timeout.unref === "function") timeout.unref();

  let accumulated = "";
  try {
    const response = await fetchImpl(TOGETHER_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model,
        messages: buildMessages(message),
        max_tokens: 320,
        temperature: 0.4,
        stream: true,
      }),
      signal: controller.signal,
    });
    if (!response.ok) await readProviderFailure(response);
    if (!response.body) throw new Error("Anonymous Spaces provider returned no stream.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;

    const processBlock = (block) => {
      const data = block
        .replace(/\r/g, "")
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
        .trim();
      if (!data) return;
      if (data === "[DONE]") {
        done = true;
        return;
      }
      const payload = JSON.parse(data);
      if (payload?.error) {
        throw new Error(providerErrorMessage(payload, "Anonymous Spaces provider stream failed."));
      }
      const delta = String(payload?.choices?.[0]?.delta?.content || "");
      if (!delta) return;
      accumulated += delta;
      onDelta(delta);
    };

    while (!done) {
      const next = await reader.read();
      if (next.done) break;
      buffer = `${buffer}${decoder.decode(next.value, { stream: true })}`
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        processBlock(block);
        if (done) break;
        boundary = buffer.indexOf("\n\n");
      }
    }
    if (done && typeof reader.cancel === "function") {
      await reader.cancel().catch(() => {});
    }
    const trailing = `${buffer}${decoder.decode()}`.trim();
    if (!done && trailing) processBlock(trailing);
    if (!accumulated.trim()) {
      throw new Error("Anonymous Spaces provider returned an empty reply.");
    }
    return { text: accumulated };
  } catch (error) {
    if (error && typeof error === "object") {
      try {
        error.partialText = accumulated;
      } catch {
        // Preserve the original error when the runtime gives us a sealed DOMException.
      }
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
