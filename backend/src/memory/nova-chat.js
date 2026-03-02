function resolveTimeoutMs(value, fallbackMs) {
  const raw = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(raw)) return fallbackMs;
  return Math.min(30_000, Math.max(500, raw));
}

function isAbortError(error) {
  if (!error || typeof error !== "object") return false;
  return error.name === "AbortError";
}

async function fetchWithTimeout(url, options, { timeoutMs, label }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (typeof timeout.unref === "function") {
    timeout.unref();
  }
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getNovaApiBase() {
  const base = String(process.env.NOVA_TYP_BASE_URL || "").trim();
  if (!base) {
    throw new Error("NOVA_TYP_BASE_URL not configured");
  }
  const normalized = base.replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

function getMemoryWorkspaceSlug() {
  return String(
    process.env.ZAKI_MEMORY_WORKSPACE_SLUG ||
      process.env.ZAKI_DEFAULT_WORKSPACE_SLUG ||
      ""
  )
    .trim()
    .toLowerCase();
}

function getChatModel() {
  return String(process.env.ZAKI_MEMORY_LLM_MODEL || "gpt-4o-mini").trim() || "gpt-4o-mini";
}

function buildAuthHeaders() {
  const apiKey = String(process.env.NOVA_TYP_API_KEY || "").trim();
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

function normalizeMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => ({
      role: String(message?.role || "user").trim().toLowerCase(),
      content: String(message?.content || "").trim(),
    }))
    .filter((message) => message.content.length > 0);
}

function buildWorkspacePrompt(messages, { jsonMode = false } = {}) {
  const lines = normalizeMessages(messages).map(
    (message) => `${message.role.toUpperCase()}:\n${message.content}`
  );
  const prompt = lines.join("\n\n");
  if (!jsonMode) return prompt;
  return `${prompt}\n\nReturn ONLY valid JSON. No markdown, no backticks, no extra text.`;
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function getOpenAiContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

function getWorkspaceContent(payload) {
  const candidates = [payload?.textResponse, payload?.response, payload?.message, payload?.text];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
}

function stripCodeFence(text) {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (!fenced) return trimmed;
  return String(fenced[1] || "").trim();
}

function extractFirstJsonObject(text) {
  const input = String(text || "");
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (start < 0) {
      if (char === "{") {
        start = index;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, index + 1);
      }
    }
  }

  return "";
}

export function parseJsonObjectFromText(text) {
  const stripped = stripCodeFence(text);
  if (!stripped) {
    throw new Error("Provider response was empty.");
  }
  try {
    return JSON.parse(stripped);
  } catch {
    const candidate = extractFirstJsonObject(stripped);
    if (!candidate) {
      throw new Error("Provider response did not contain a JSON object.");
    }
    return JSON.parse(candidate);
  }
}

export async function callNovaTypChat({
  messages,
  temperature = 0.1,
  maxTokens,
  jsonMode = false,
  timeoutMs = 6_000,
  label = "Memory chat request",
} = {}) {
  const normalizedMessages = normalizeMessages(messages);
  if (normalizedMessages.length === 0) {
    throw new Error("Memory chat request requires at least one message.");
  }

  const apiBase = getNovaApiBase();
  const headers = buildAuthHeaders();
  const model = getChatModel();
  const boundedTimeoutMs = resolveTimeoutMs(timeoutMs, 6_000);

  let openAiError = null;

  try {
    const openAiResponse = await fetchWithTimeout(
      `${apiBase}/v1/openai/chat/completions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: normalizedMessages,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          temperature,
          ...(Number.isFinite(maxTokens) ? { max_tokens: maxTokens } : {}),
        }),
      },
      {
        timeoutMs: boundedTimeoutMs,
        label,
      }
    );

    if (openAiResponse.ok) {
      const data = await openAiResponse.json().catch(() => ({}));
      const content = getOpenAiContent(data);
      if (content) {
        return {
          content,
          transport: "openai_compat",
          model,
        };
      }
      openAiError = new Error("OpenAI-compatible chat response had no message content.");
    } else {
      const errorText = (await safeReadText(openAiResponse)).slice(0, 240);
      openAiError = new Error(
        `OpenAI-compatible chat failed with ${openAiResponse.status}${errorText ? `: ${errorText}` : ""}`
      );
    }
  } catch (error) {
    openAiError = error;
  }

  const workspaceSlug = getMemoryWorkspaceSlug();
  if (!workspaceSlug) {
    throw new Error(
      `Memory chat failed via OpenAI-compatible route${
        openAiError?.message ? ` (${openAiError.message})` : ""
      }. Set ZAKI_MEMORY_WORKSPACE_SLUG or ZAKI_DEFAULT_WORKSPACE_SLUG for workspace fallback.`
    );
  }

  const workspaceResponse = await fetchWithTimeout(
    `${apiBase}/v1/workspace/${encodeURIComponent(workspaceSlug)}/chat`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        mode: "chat",
        message: buildWorkspacePrompt(normalizedMessages, { jsonMode }),
      }),
    },
    {
      timeoutMs: boundedTimeoutMs,
      label: `${label} (workspace fallback)`,
    }
  );

  if (!workspaceResponse.ok) {
    const errorText = (await safeReadText(workspaceResponse)).slice(0, 240);
    throw new Error(
      `Workspace chat fallback failed with ${workspaceResponse.status}${
        errorText ? `: ${errorText}` : ""
      }${openAiError?.message ? ` (OpenAI route: ${openAiError.message})` : ""}`
    );
  }

  const workspaceData = await workspaceResponse.json().catch(() => ({}));
  const content = getWorkspaceContent(workspaceData);
  if (!content) {
    throw new Error(
      `Workspace chat fallback returned no text response.${
        openAiError?.message ? ` (OpenAI route: ${openAiError.message})` : ""
      }`
    );
  }

  return {
    content,
    transport: "workspace_chat",
    model,
  };
}
