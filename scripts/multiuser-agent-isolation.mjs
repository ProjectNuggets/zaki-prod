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

async function readTokenText(response) {
  const raw = await response.text();
  let output = "";
  for (const block of raw.split("\n\n")) {
    const eventType = block
      .split("\n")
      .find((line) => line.startsWith("event:"))
      ?.slice(6)
      .trim();
    if (eventType !== "token") continue;
    const dataLine = block
      .split("\n")
      .find((line) => line.startsWith("data:"))
      ?.slice(5)
      .trim();
    if (!dataLine) continue;
    try {
      const payload = JSON.parse(dataLine);
      output += String(payload.delta || payload.token || payload.text || payload.chunk || payload.content || "");
    } catch {
      // ignore
    }
  }
  return output;
}

const now = Date.now();
const users = tokens.map((token, index) => ({
  token,
  label: `user${index + 1}`,
  codeword: `ISOLATION_${index + 1}_${now}`,
}));

for (const user of users) {
  const provision = await authRequest(user.token, "/api/agent/provision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spaceId: "zaki-bot", threadId: "main" }),
  });
  if (!provision.ok) {
    console.error(`[${user.label}] provision failed: ${provision.status}`);
    process.exit(1);
  }
}

const replies = await Promise.all(
  users.map(async (user) => {
    const response = await authRequest(user.token, "/api/agent/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Answer with only this marker and nothing else: ${user.codeword}`,
        spaceId: "zaki-bot",
        threadId: "main",
      }),
    });
    if (!response.ok) {
      throw new Error(`[${user.label}] stream failed: ${response.status}`);
    }
    const text = await readTokenText(response);
    return { ...user, text };
  })
);

let leaks = 0;
for (const owner of replies) {
  for (const other of replies) {
    if (owner.label === other.label) continue;
    if (owner.text.includes(other.codeword)) leaks += 1;
  }
}

const result = {
  ok: leaks === 0,
  leaks,
  users: replies.map(({ label, codeword }) => ({ label, codeword })),
};
console.log(JSON.stringify(result, null, 2));
if (leaks > 0) process.exit(2);
