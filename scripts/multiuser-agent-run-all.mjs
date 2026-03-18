#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolveBaseUrl, resolveMultiuserTokens } from "./multiuser-agent-env.mjs";

const steps = [
  {
    name: "smoke",
    cmd: ["node", "scripts/multiuser-agent-smoke.mjs"],
  },
  {
    name: "isolation",
    cmd: ["node", "scripts/multiuser-agent-isolation.mjs"],
  },
  {
    name: "stress",
    cmd: ["node", "scripts/multiuser-agent-stress.mjs"],
  },
];

const tokens = resolveMultiuserTokens();
if (tokens.length < 2) {
  console.error(
    "Missing multi-user tokens. Set ZAKI_MULTIUSER_TOKENS or ZAKI_MULTIUSER_TOKENS_FILE (>=2 tokens)."
  );
  process.exit(1);
}

async function runStep(step) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(step.cmd[0], step.cmd.slice(1), {
      stdio: "inherit",
      env: process.env,
    });
    child.on("close", (code) => {
      resolve({
        name: step.name,
        ok: code === 0,
        code: code ?? 1,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

const summary = [];
console.log(
  JSON.stringify(
    {
      baseUrl: resolveBaseUrl(),
      users: tokens.length,
      rounds: Number(process.env.ZAKI_MULTIUSER_ROUNDS || 3),
    },
    null,
    2
  )
);

for (const step of steps) {
  const result = await runStep(step);
  summary.push(result);
  if (!result.ok) break;
}

const payload = {
  ok: summary.every((item) => item.ok),
  summary,
};
console.log(JSON.stringify(payload, null, 2));
if (!payload.ok) process.exit(2);
