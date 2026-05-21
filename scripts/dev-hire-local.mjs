#!/usr/bin/env node

/**
 * Starts the local ZAKI Hire development stack with the same boundaries used in
 * production: browser -> ZAKI web -> ZAKI API -> internal Hire engine.
 *
 * Usage:
 *   npm run dev:hire:local
 *   npm run dev:hire:local:restart
 *   node scripts/dev-hire-local.mjs --check-only
 */

import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKEND_DIR = path.join(ROOT, "backend");
const ENGINE_REPO = process.env.ZAKI_HIRE_ENGINE_REPO || path.resolve(ROOT, "..", "zaki-hire-engine");

const RESTART = process.argv.includes("--restart");
const CHECK_ONLY = process.argv.includes("--check-only");

const API_PG_CONTAINER = "zaki-e2e-api-postgres";
const HIRE_PG_CONTAINER = "zaki-e2e-hire-postgres";
const HIRE_ENGINE_CONTAINER = "zaki-e2e-hire-engine";
const DOCKER_NETWORK = "zaki-e2e-net";

const API_PG_PORT = Number(process.env.ZAKI_HIRE_LOCAL_API_PG_PORT || 15433);
const BACKEND_PORT = Number(process.env.ZAKI_HIRE_LOCAL_BACKEND_PORT || 8787);
const FRONTEND_PORT = Number(process.env.ZAKI_HIRE_LOCAL_FRONTEND_PORT || 5174);
const HIRE_ENGINE_PORT = Number(process.env.ZAKI_HIRE_LOCAL_ENGINE_PORT || 18002);
const TYP_MOCK_PORT = Number(process.env.ZAKI_HIRE_LOCAL_TYP_PORT || 19090);

const HIRE_ENGINE_IMAGE = process.env.ZAKI_HIRE_ENGINE_IMAGE || "zaki-hire-engine:codex-smoke-arm64";
const INTERNAL_TOKEN = process.env.ZAKI_HIRE_LOCAL_INTERNAL_TOKEN || "zaki-e2e-hire-token";
const PASSWORD = process.env.ZAKI_HIRE_LOCAL_PASSWORD || "ZakiE2E!2026";
const LEGAL_POLICY_VERSION = process.env.ZAKI_LEGAL_POLICY_VERSION || "2026-02-17.v2";

const USERS = [
  { id: 1001, email: "zaki-e2e-admin@example.com", name: "ZAKI E2E Admin" },
  { id: 1002, email: "zaki-e2e-user-a@example.com", name: "ZAKI E2E User A" },
  { id: 1003, email: "zaki-e2e-user-b@example.com", name: "ZAKI E2E User B" },
];

const children = [];
let typMockServer = null;

function log(message) {
  process.stdout.write(`[hire-local] ${message}\n`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    env: options.env || process.env,
    encoding: "utf8",
    stdio: options.quiet ? "pipe" : "inherit",
  });
  if (result.status !== 0) {
    const stderr = String(result.stderr || "").trim();
    const suffix = stderr ? `\n${stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} failed${suffix}`);
  }
  return String(result.stdout || "").trim();
}

function tryRun(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    env: options.env || process.env,
    encoding: "utf8",
    stdio: "pipe",
  });
  return {
    ok: result.status === 0,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
  };
}

function docker(args, options = {}) {
  return run("docker", args, options);
}

function dockerOk(args) {
  return tryRun("docker", args).ok;
}

function containerExists(name) {
  return dockerOk(["container", "inspect", name]);
}

function containerRunning(name) {
  const result = tryRun("docker", ["inspect", "-f", "{{.State.Running}}", name]);
  return result.ok && result.stdout === "true";
}

function imageExists(ref) {
  return dockerOk(["image", "inspect", ref]);
}

function portPid(port) {
  const result = tryRun("lsof", [`-tiTCP:${port}`, "-sTCP:LISTEN"]);
  return result.ok ? result.stdout.split(/\s+/).filter(Boolean) : [];
}

function isPortOpen(port) {
  return portPid(port).length > 0;
}

function killPort(port) {
  const pids = portPid(port);
  if (pids.length === 0) return;
  log(`Stopping listener(s) on port ${port}: ${pids.join(", ")}`);
  for (const pid of pids) {
    tryRun("kill", [pid]);
  }
}

async function waitForHttp(url, { timeoutMs = 30_000, ok = (response) => response.statusCode < 500 } = {}) {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    try {
      const statusCode = await new Promise((resolve, reject) => {
        const req = http.get(url, (response) => {
          response.resume();
          response.on("end", () => resolve(response.statusCode || 0));
        });
        req.setTimeout(1_000, () => req.destroy(new Error("timeout")));
        req.on("error", reject);
      });
      if (ok({ statusCode })) return statusCode;
      lastError = `status ${statusCode}`;
    } catch (error) {
      lastError = error?.message || String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${url} did not become ready: ${lastError}`);
}

async function waitForCommand(command, args, { timeoutMs = 30_000 } = {}) {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
    const result = tryRun(command, args);
    if (result.ok) return;
    lastError = result.stderr || result.stdout || `exit ${command}`;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${command} ${args.join(" ")} did not become ready: ${lastError}`);
}

function ensureDocker() {
  run("docker", ["info"], { quiet: true });
  if (!dockerOk(["network", "inspect", DOCKER_NETWORK])) {
    log(`Creating Docker network ${DOCKER_NETWORK}`);
    docker(["network", "create", DOCKER_NETWORK]);
  }
}

async function ensurePostgresContainers() {
  if (!containerExists(API_PG_CONTAINER)) {
    log(`Creating ${API_PG_CONTAINER}`);
    docker([
      "run", "-d",
      "--name", API_PG_CONTAINER,
      "--network", DOCKER_NETWORK,
      "-e", "POSTGRES_USER=zaki",
      "-e", "POSTGRES_PASSWORD=zaki",
      "-e", "POSTGRES_DB=zaki",
      "-p", `${API_PG_PORT}:5432`,
      "postgres:16",
    ]);
  } else if (!containerRunning(API_PG_CONTAINER)) {
    log(`Starting ${API_PG_CONTAINER}`);
    docker(["start", API_PG_CONTAINER]);
  }

  if (!containerExists(HIRE_PG_CONTAINER)) {
    log(`Creating ${HIRE_PG_CONTAINER}`);
    docker([
      "run", "-d",
      "--name", HIRE_PG_CONTAINER,
      "--network", DOCKER_NETWORK,
      "-e", "POSTGRES_USER=hire",
      "-e", "POSTGRES_PASSWORD=hire",
      "-e", "POSTGRES_DB=zaki_hire",
      "postgres:16",
    ]);
  } else if (!containerRunning(HIRE_PG_CONTAINER)) {
    log(`Starting ${HIRE_PG_CONTAINER}`);
    docker(["start", HIRE_PG_CONTAINER]);
  }

  await waitForCommand("docker", ["exec", API_PG_CONTAINER, "pg_isready", "-U", "zaki", "-d", "zaki"], { timeoutMs: 30_000 });
  await waitForCommand("docker", ["exec", HIRE_PG_CONTAINER, "pg_isready", "-U", "hire", "-d", "zaki_hire"], { timeoutMs: 30_000 });
}

function ensureHireEngineImage() {
  if (imageExists(HIRE_ENGINE_IMAGE)) return;
  const dockerfile = path.join(ENGINE_REPO, "Dockerfile");
  if (!tryRun("test", ["-f", dockerfile]).ok) {
    throw new Error(
      `Missing Hire engine image ${HIRE_ENGINE_IMAGE}. Build it or set ZAKI_HIRE_ENGINE_IMAGE. ` +
        `Expected engine repo at ${ENGINE_REPO}.`
    );
  }
  log(`Building ${HIRE_ENGINE_IMAGE} from ${ENGINE_REPO}`);
  docker(["build", "-t", HIRE_ENGINE_IMAGE, "."], { cwd: ENGINE_REPO });
}

function ensureHireEngineContainer() {
  ensureHireEngineImage();
  if (RESTART && containerExists(HIRE_ENGINE_CONTAINER)) {
    log(`Recreating ${HIRE_ENGINE_CONTAINER}`);
    tryRun("docker", ["rm", "-f", HIRE_ENGINE_CONTAINER]);
  }
  if (!containerExists(HIRE_ENGINE_CONTAINER)) {
    log(`Creating ${HIRE_ENGINE_CONTAINER}`);
    docker([
      "run", "-d",
      "--name", HIRE_ENGINE_CONTAINER,
      "--network", DOCKER_NETWORK,
      "-p", `${HIRE_ENGINE_PORT}:8002`,
      "-e", "ZAKI_RUNTIME_MODE=hosted",
      "-e", `ZAKI_INTERNAL_TOKEN=${INTERNAL_TOKEN}`,
      "-e", "ZAKI_REQUIRE_TENANT_HEADERS=true",
      "-e", "ZAKI_TENANT_HEADER=X-Zaki-User-Id",
      "-e", "ZAKI_HIRE_DATABASE_URL=postgresql://hire:hire@zaki-e2e-hire-postgres:5432/zaki_hire",
      "-e", "HIRE_SQLITE_COMPAT_MODE=false",
      "-e", "HIRE_TENANT_DATA_ROOT=/tmp/zaki-hire/users",
      "-e", "HIRE_ARTIFACT_STORAGE_PROVIDER=filesystem",
      "-e", "HIRE_ARTIFACT_FILESYSTEM_DURABLE=true",
      "-e", "HIRE_LLM_PROVIDER=ollama",
      "-e", "HIRE_LLM_MODEL=llama3",
      "-e", "HIRE_ALLOW_INTERNAL_OLLAMA=true",
      "-e", "HIRE_SOURCE_POLICY_VERSION=2026-05-20.local",
      "-e", "HIRE_SOURCE_CONFIG_RUNTIME_READY=true",
      "-e", "X_BEARER_TOKEN=local-x-token",
      "-e", "APIFY_TOKEN=local-apify-token",
      "-e", "HUNTER_API_KEY=local-hunter-token",
      "-e", "PROXYCURL_API_KEY=local-proxycurl-token",
      "-e", "HIRE_CUSTOM_CONNECTOR_CATALOG=local-catalog",
      "-e", "HIRE_BROWSER_AUTOMATION_ENABLED=true",
      "-e", "HIRE_AUTO_APPLY_ENABLED=true",
      "-e", "HIRE_AUTO_APPLY_CONSENT_REQUIRED=true",
      "-e", "HIRE_AUTO_APPLY_AUDIT_READY=true",
      "-e", "HIRE_BROWSER_SANDBOX_READY=true",
      "-e", "HIRE_AUTO_APPLY_KILL_SWITCH_READY=true",
      HIRE_ENGINE_IMAGE,
    ]);
  } else if (!containerRunning(HIRE_ENGINE_CONTAINER)) {
    log(`Starting ${HIRE_ENGINE_CONTAINER}`);
    docker(["start", HIRE_ENGINE_CONTAINER]);
  }
}

function startTypMock() {
  if (isPortOpen(TYP_MOCK_PORT)) {
    if (!RESTART) {
      log(`Reusing existing TYP mock/listener on ${TYP_MOCK_PORT}`);
      return;
    }
    killPort(TYP_MOCK_PORT);
  }

  const workspace = {
    slug: "zaki",
    name: "ZAKI",
    title: "ZAKI",
    description: "Local Hire activation workspace",
    icon: "zaki",
    color: "#f10202",
    openAiPrompt: "Local Hire activation prompt",
    documents: [],
    threads: USERS.map((user) => ({
      slug: user.email.split("@")[0],
      id: user.email.split("@")[0],
      name: user.name,
      label: user.name,
      user_id: user.id,
    })),
  };

  typMockServer = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://127.0.0.1:${TYP_MOCK_PORT}`);
    res.setHeader("content-type", "application/json");
    if (url.pathname === "/api/v1/users" && req.method === "GET") {
      res.end(JSON.stringify({ users: USERS.map((user) => ({ id: user.id, username: user.email })) }));
      return;
    }
    if (url.pathname === "/api/v1/admin/users/new" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        let email = "unknown@example.com";
        try {
          const parsed = JSON.parse(body || "{}");
          email = parsed.email || parsed.username || email;
        } catch {
          // ignore malformed local test payloads
        }
        const known = USERS.find((user) => user.email.toLowerCase() === String(email).toLowerCase());
        const user = known || { id: 1999, email };
        res.end(JSON.stringify({ user: { id: user.id, username: user.email }, id: user.id }));
      });
      return;
    }
    if (url.pathname === "/api/v1/workspaces" && req.method === "GET") {
      res.end(JSON.stringify({ workspaces: [workspace] }));
      return;
    }
    if (url.pathname === "/api/v1/workspace/zaki" && req.method === "GET") {
      res.end(JSON.stringify({ workspace }));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not_found", path: url.pathname, method: req.method }));
  });
  typMockServer.listen(TYP_MOCK_PORT, "127.0.0.1");
  log(`TYP mock listening on http://127.0.0.1:${TYP_MOCK_PORT}`);
}

function spawnProcess(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd || ROOT,
    env: options.env || process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  child.stdout.on("data", (data) => process.stdout.write(`[${label}] ${data}`));
  child.stderr.on("data", (data) => process.stderr.write(`[${label}] ${data}`));
  child.on("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGINT") {
      process.stderr.write(`[hire-local] ${label} exited with ${code ?? signal}\n`);
    }
  });
}

function backendEnv() {
  const env = {
    ...process.env,
    NODE_ENV: "development",
    PORT: String(BACKEND_PORT),
    DATABASE_URL: `postgres://zaki:zaki@127.0.0.1:${API_PG_PORT}/zaki`,
    NOVA_TYP_BASE_URL: `http://127.0.0.1:${TYP_MOCK_PORT}`,
    NOVA_TYP_API_KEY: "local-hire-e2e",
    ZAKI_EMAIL_MODE: "none",
    ZAKI_ALLOWED_ORIGINS: `http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT}`,
    ZAKI_PUBLIC_URL: `http://127.0.0.1:${BACKEND_PORT}`,
    ZAKI_APP_URL: `http://127.0.0.1:${FRONTEND_PORT}`,
    ZAKI_LEGAL_POLICY_VERSION: LEGAL_POLICY_VERSION,
    ZAKI_JWT_SIGNING_KEY: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ZAKI_SUPER_ADMIN_EMAILS: USERS[0].email,
    ZAKI_LEARNING_ENABLED: "false",
    LEARNING_ENGINE_BASE_URL: "",
    LEARNING_ENGINE_INTERNAL_TOKEN: "",
    ZAKI_HIRE_ENABLED: "true",
    HIRE_ENGINE_BASE_URL: `http://127.0.0.1:${HIRE_ENGINE_PORT}`,
    HIRE_ENGINE_INTERNAL_TOKEN: INTERNAL_TOKEN,
    ZAKI_BACKEND_IMAGE_TAG: "ghcr.io/projectnuggets/zaki-api:sha-0000000",
    ZAKI_HIRE_ENGINE_IMAGE_TAG: "ghcr.io/projectnuggets/zaki-hire-engine:sha-0000000",
    ZAKI_HIRE_ENGINE_SOURCE_REPOSITORY: "github.com/projectnuggets/zaki-hire-engine",
    ZAKI_HIRE_ENGINE_SOURCE_COMMIT: "0".repeat(40),
    ZAKI_HIRE_LLM_PROVIDER: "ollama",
    ZAKI_HIRE_LLM_MODEL: "llama3",
    ZAKI_HIRE_SOURCE_POLICY_VERSION: "2026-05-20.local",
    ZAKI_HIRE_BROWSER_AUTOMATION_ENABLED: "true",
    ZAKI_HIRE_AUTO_APPLY_ENABLED: "true",
    ZAKI_HIRE_AUTO_APPLY_CONSENT_REQUIRED: "true",
    ZAKI_HIRE_AUTO_APPLY_AUDIT_REQUIRED: "true",
    ZAKI_HIRE_WEEKLY_PROMPT_BUCKET: "hire_weekly",
    ZAKI_HIRE_WEEKLY_PROMPT_LIMIT: "20",
  };
  return env;
}

async function ensureAccount(user) {
  const login = await fetch(`http://127.0.0.1:${BACKEND_PORT}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user.email, password: PASSWORD }),
  });
  if (login.ok) return;

  const signup = await fetch(`http://127.0.0.1:${BACKEND_PORT}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: PASSWORD,
      name: user.name,
      dateOfBirth: "1990-01-01",
      legalConsentAccepted: true,
      legalPolicyVersion: LEGAL_POLICY_VERSION,
    }),
  });
  if (!signup.ok && signup.status !== 400) {
    const raw = await signup.text().catch(() => "");
    throw new Error(`Unable to seed ${user.email}: ${signup.status} ${raw}`);
  }

  const retry = await fetch(`http://127.0.0.1:${BACKEND_PORT}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user.email, password: PASSWORD }),
  });
  if (!retry.ok) {
    throw new Error(
      `Unable to authenticate seeded local account ${user.email}. ` +
        `Run npm run dev:hire:local:restart if a stale local database has different credentials.`
    );
  }
}

async function loginToken(user) {
  const response = await fetch(`http://127.0.0.1:${BACKEND_PORT}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user.email, password: PASSWORD }),
  });
  const raw = await response.text().catch(() => "");
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!response.ok || typeof data?.token !== "string") {
    throw new Error(`Unable to log in as ${user.email}: ${response.status} ${raw}`);
  }
  return data.token;
}

async function requestJson(pathname, { token } = {}) {
  const response = await fetch(`http://127.0.0.1:${BACKEND_PORT}${pathname}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const raw = await response.text().catch(() => "");
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  return { response, data, raw };
}

async function verifyHireActivation() {
  const adminToken = await loginToken(USERS[0]);
  const userToken = await loginToken(USERS[1]);

  const readiness = await requestJson("/api/internal/hire/deployment-readiness", { token: adminToken });
  if (!readiness.response.ok || readiness.data?.deploymentReadiness?.ready !== true) {
    throw new Error(`Hire deployment readiness is not ready: ${readiness.response.status} ${readiness.raw}`);
  }

  const status = await requestJson("/api/hire/status", { token: userToken });
  if (!status.response.ok) {
    throw new Error(`User-facing Hire status is unavailable: ${status.response.status} ${status.raw}`);
  }

  const userReadiness = await requestJson("/api/hire/readiness", { token: userToken });
  if (!userReadiness.response.ok || userReadiness.data?.available !== true) {
    throw new Error(`User-facing Hire readiness is not available: ${userReadiness.response.status} ${userReadiness.raw}`);
  }
}

async function startAppProcesses() {
  if (RESTART) {
    killPort(BACKEND_PORT);
    killPort(FRONTEND_PORT);
  }

  if (isPortOpen(BACKEND_PORT)) {
    log(`Reusing existing backend on ${BACKEND_PORT}`);
  } else if (!CHECK_ONLY) {
    log(`Starting backend on ${BACKEND_PORT}`);
    spawnProcess("zaki-api", "npm", ["start"], { cwd: BACKEND_DIR, env: backendEnv() });
  }

  await waitForHttp(`http://127.0.0.1:${BACKEND_PORT}/ready`, {
    timeoutMs: 45_000,
    ok: (response) => response.statusCode === 200,
  });

  if (isPortOpen(FRONTEND_PORT)) {
    log(`Reusing existing frontend on ${FRONTEND_PORT}`);
  } else if (!CHECK_ONLY) {
    log(`Starting frontend on ${FRONTEND_PORT}`);
    spawnProcess("zaki-web", "npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(FRONTEND_PORT)], {
      cwd: ROOT,
      env: { ...process.env, VITE_ZAKI_BACKEND_URL: `http://127.0.0.1:${BACKEND_PORT}` },
    });
  }

  await waitForHttp(`http://127.0.0.1:${FRONTEND_PORT}/hire`, {
    timeoutMs: 30_000,
    ok: (response) => response.statusCode === 200,
  });

  for (const user of USERS) {
    await ensureAccount(user);
  }
  await verifyHireActivation();
}

async function main() {
  ensureDocker();
  await ensurePostgresContainers();
  ensureHireEngineContainer();
  await waitForHttp(`http://127.0.0.1:${HIRE_ENGINE_PORT}/health`, {
    timeoutMs: 60_000,
    ok: (response) => response.statusCode === 200,
  });
  startTypMock();
  await waitForHttp(`http://127.0.0.1:${TYP_MOCK_PORT}/api/v1/workspaces`, {
    timeoutMs: 5_000,
    ok: (response) => response.statusCode === 200,
  });
  await startAppProcesses();

  log("ZAKI Hire local stack is ready.");
  log(`Open http://127.0.0.1:${FRONTEND_PORT}/hire`);
  log(`Login: ${USERS[1].email} / ${PASSWORD}`);
  log("Verify in another terminal: npm run smoke:hire-browser");

  if (CHECK_ONLY) {
    if (typMockServer) typMockServer.close();
    return;
  }
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  if (typMockServer) typMockServer.close();
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(130);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(143);
});

main().catch((error) => {
  shutdown();
  console.error(`[hire-local] FAILED: ${error?.message || error}`);
  process.exitCode = 1;
});
