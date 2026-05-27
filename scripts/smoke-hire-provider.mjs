#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const container = process.env.HIRE_ENGINE_CONTAINER || "zaki-e2e-hire-engine";
const expectedProvider = process.env.SMOKE_HIRE_EXPECT_PROVIDER || "";
const args = ["exec"];
if (process.env.HIRE_PROVIDER_SMOKE_ALLOW_COST) {
  args.push("-e", `HIRE_PROVIDER_SMOKE_ALLOW_COST=${process.env.HIRE_PROVIDER_SMOKE_ALLOW_COST}`);
}
args.push(container, "python", "-m", "ops.llm_smoke");
if (expectedProvider) {
  args.push("--expect-provider", expectedProvider);
}

const result = spawnSync("docker", args, {
  env: process.env,
  encoding: "utf8",
  stdio: "inherit",
});

process.exit(result.status ?? 1);
