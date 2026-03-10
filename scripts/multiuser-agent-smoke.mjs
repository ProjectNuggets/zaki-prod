#!/usr/bin/env node

import {
  requireAtLeastTwoTokens,
  requireNonPlaceholderTokens,
  resolveBaseUrl,
  resolveMultiuserTokens,
} from "./multiuser-agent-env.mjs";

const baseUrl = resolveBaseUrl();
const tokens = resolveMultiuserTokens();
requireAtLeastTwoTokens(tokens);
requireNonPlaceholderTokens(tokens);

async function authRequest(token, path, init = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
}

async function parseSseText(response) {
  const raw = await response.text();
  const chunks = [];
  for (const block of raw.split("\n\n")) {
    const eventLine = block
      .split("\n")
      .find((line) => line.startsWith("event:"));
    const dataLine = block
      .split("\n")
      .find((line) => line.startsWith("data:"));
    const eventType = eventLine ? eventLine.slice(6).trim() : "";
    const payloadText = dataLine ? dataLine.slice(5).trim() : "";
    if (!payloadText) continue;
    try {
      const payload = JSON.parse(payloadText);
      if (eventType === "token") {
        chunks.push(
          String(payload.delta || payload.token || payload.text || payload.chunk || payload.content || "")
        );
      }
    } catch {
      // ignore non-json payload blocks
    }
  }
  return chunks.join("");
}

const results = [];
for (let index = 0; index < tokens.length; index += 1) {
  const token = tokens[index];
  const tag = `user${index + 1}`;
  const codeword = `CODEWORD_${index + 1}_${Date.now()}`;

  const provision = await authRequest(token, "/api/agent/provision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spaceId: "zaki-bot", threadId: "main" }),
  });
  if (!provision.ok) {
    console.error(`[${tag}] provision failed: ${provision.status}`);
    process.exit(1);
  }

  const stream = await authRequest(token, "/api/agent/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Echo this marker once and only once: ${codeword}`,
      spaceId: "zaki-bot",
      threadId: "main",
    }),
  });
  if (!stream.ok) {
    console.error(`[${tag}] stream failed: ${stream.status}`);
    process.exit(1);
  }

  const replyText = await parseSseText(stream);
  results.push({ user: tag, codeword, replyText });
}

console.log(JSON.stringify({ ok: true, users: results.length, results }, null, 2));
