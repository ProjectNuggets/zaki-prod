#!/usr/bin/env node
// CI guard (G2-ISO-PREV): every admin-key call (novaAdminRequest/adminRequest) that lives inside
// an HTTP route handler must sit under a recognized ownership/auth gate. Catches a future un-gated
// admin-key endpoint that would let any signed-in user reach another user's workspace/thread data.
//
// Conservative by design: only flags calls whose *enclosing top-level boundary* is a route handler
// (named handler fn/const OR an inline app.<verb>(...) arrow) and that has NO gate helper referenced
// anywhere in that block. Legitimately un-scoped admin calls (internal helpers, static lookups)
// are silenced with an inline `// lint-allow-admin-ungated: <reason>` pragma on the call line
// or anywhere in the enclosing block.
import { readFileSync } from "node:fs";

const FILE = "src/index.js"; // run with cwd = backend/
const src = readFileSync(FILE, "utf8").split("\n");

const CALL = /\b(?:novaAdminRequest|adminRequest)\s*\(/;
const GATES = /requireWorkspaceAccess|assertWorkspaceAndThreadOwnership|requireAuthUser|workspaceVisibleForSession|ensureTypUserForZakiUser/;
// Column-0 boundary heads: named fn, assigned const, or an inline express route registration.
const HEAD = /^(?:export\s+)?(?:async\s+)?function\s+\w+|^(?:export\s+)?const\s+\w+\s*=|^app\.(?:get|post|put|delete|patch|all)\s*\(/;
const DEF_LINE = /^\s*(?:export\s+)?async\s+function\s+novaAdminRequest\b/; // the definition itself
const PROP_VAL = /adminRequest:\s*novaAdminRequest/; // passed as a value, not invoked
const PRAGMA = /lint-allow-admin-ungated/;

const violations = [];
for (let i = 0; i < src.length; i++) {
  const line = src[i];
  if (!CALL.test(line)) continue;
  if (DEF_LINE.test(line)) continue;
  if (PROP_VAL.test(line)) continue;
  if (PRAGMA.test(line)) continue;

  let start = -1;
  for (let j = i; j >= 0; j--) {
    if (src[j].length && !/^\s/.test(src[j]) && HEAD.test(src[j])) { start = j; break; }
  }
  if (start === -1) {
    violations.push({ line: i + 1, fn: "<no enclosing handler>", text: line.trim() });
    continue;
  }
  let end = src.length;
  for (let j = start + 1; j < src.length; j++) {
    if (src[j].length && !/^\s/.test(src[j]) && HEAD.test(src[j])) { end = j; break; }
  }
  const body = src.slice(start, end).join("\n");
  if (PRAGMA.test(body)) continue;
  if (GATES.test(body)) continue;

  const head = src[start];
  const name =
    (head.match(/function\s+(\w+)/) || head.match(/const\s+(\w+)/) || [])[1] ||
    head.trim().slice(0, 60);
  violations.push({ line: i + 1, fn: name, text: line.trim() });
}

if (violations.length) {
  console.error(
    `\n[lint-admin-gating] ${violations.length} admin-key call(s) in a route handler with NO ownership gate:\n`
  );
  for (const v of violations) {
    console.error(`  ${FILE}:${v.line}  [${v.fn}]  ${v.text}`);
  }
  console.error(
    `\nEach flagged handler must reference an ownership/auth gate ` +
      `(requireWorkspaceAccess / assertWorkspaceAndThreadOwnership / requireAuthUser / ` +
      `workspaceVisibleForSession / ensureTypUserForZakiUser).\n` +
      `If the call is intentionally un-scoped, annotate it with an inline ` +
      `\`// lint-allow-admin-ungated: <reason>\` comment.\n`
  );
  process.exit(1);
}
console.log("[lint-admin-gating] OK — all admin-key route handlers are gated.");
