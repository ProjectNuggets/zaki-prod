#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const shouldValidateProdConfig =
  String(process.env.RELEASE_CHECK_VALIDATE_PROD_CONFIG || "true").toLowerCase() !== "false";
const shouldRunMemorySmoke =
  String(process.env.RELEASE_CHECK_RUN_MEMORY_SMOKE || "").toLowerCase() === "true";
const shouldRunBillingE2E =
  String(process.env.RELEASE_CHECK_RUN_BILLING_E2E || "").toLowerCase() === "true";

function runStep({ label, cmd, args, env = {} }) {
  process.stdout.write(`\n[RELEASE-CHECK] ${label}\n`);
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(`Step failed: ${label}`);
  }
}

function printSummary() {
  process.stdout.write(
    `\n[RELEASE-CHECK] Completed successfully.\n` +
      `- prod config validated: ${shouldValidateProdConfig}\n` +
      `- memory smoke run: ${shouldRunMemorySmoke}\n` +
      `- billing e2e smoke run: ${shouldRunBillingE2E}\n`
  );
}

try {
  if (shouldValidateProdConfig) {
    runStep({
      label: "Validate backend config in production mode",
      cmd: "npm",
      args: ["--prefix", "backend", "run", "config:check"],
      env: { NODE_ENV: "production" },
    });
  }

  runStep({
    label: "Backend lint",
    cmd: "npm",
    args: ["--prefix", "backend", "run", "lint"],
  });
  runStep({
    label: "Backend tests",
    cmd: "npm",
    args: ["--prefix", "backend", "test"],
  });
  runStep({
    label: "Frontend tests",
    cmd: "npm",
    args: ["test", "--", "--runInBand"],
  });
  runStep({
    label: "Frontend typecheck",
    cmd: "npm",
    args: ["run", "typecheck"],
  });
  runStep({
    label: "Frontend build",
    cmd: "npm",
    args: ["run", "build"],
  });

  if (shouldRunMemorySmoke) {
    runStep({
      label: "Memory smoke gate",
      cmd: "npm",
      args: ["run", "smoke:memory-capture"],
    });
  } else {
    process.stdout.write(
      "\n[RELEASE-CHECK] Memory smoke skipped. Set RELEASE_CHECK_RUN_MEMORY_SMOKE=true to enable.\n"
    );
  }

  if (shouldRunBillingE2E) {
    runStep({
      label: "Billing webhook E2E smoke gate",
      cmd: "npm",
      args: ["run", "smoke:billing"],
      env: { SMOKE_REQUIRE_SECRETS: "true" },
    });
  } else {
    process.stdout.write(
      "\n[RELEASE-CHECK] Billing E2E smoke skipped. Set RELEASE_CHECK_RUN_BILLING_E2E=true to enable.\n"
    );
  }

  printSummary();
} catch (error) {
  console.error(`\n[RELEASE-CHECK] FAILED: ${error?.message || error}`);
  process.exit(1);
}
