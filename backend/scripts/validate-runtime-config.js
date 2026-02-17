#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { validateRuntimeConfig } from "../src/config-validation.js";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend", ".env"),
  path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", ".env"),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const report = validateRuntimeConfig(process.env);

console.log(
  `[Config] NODE_ENV=${report.summary.nodeEnv} emailMode=${report.summary.emailMode} origins=${report.summary.allowedOriginsCount} superAdmins=${report.summary.superAdminEmailsCount} legacyAdmins=${report.summary.legacyAdminEmailsCount}`
);

if (report.warnings.length > 0) {
  for (const warning of report.warnings) {
    console.warn(`[Config][warn] ${warning.key}: ${warning.message}`);
  }
}

if (!report.ok) {
  for (const issue of report.errors) {
    console.error(`[Config][error] ${issue.key}: ${issue.message}`);
  }
  process.exitCode = 1;
} else {
  console.log("[Config] Runtime configuration is valid.");
}
