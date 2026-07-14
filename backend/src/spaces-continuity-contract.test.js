import { describe, expect, test } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Spaces continuity contract", () => {
  test("backend exposes anonymous-work claim and no retired linked-account copy", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const sidebarSource = fs.readFileSync(
      path.join(__dirname, "../../src/app/components/Sidebar.tsx"),
      "utf8"
    );
    const retiredLinkedTypCopy = ["linked T", "YP"].join("");
    const retiredRequiresCopy = ["requires a", " linked"].join("");
    const retiredTypUserCopy = ["NOVA", "TYP user not found"].join(".");

    expect(source).toContain("/api/spaces/anonymous-work/claim");
    expect(source).not.toMatch(
      new RegExp(
        `${retiredLinkedTypCopy}|${retiredRequiresCopy}|${retiredTypUserCopy.replace(".", "\\.")}`,
        "i"
      )
    );
    expect(sidebarSource).not.toMatch(/NOVA\.TYP|linked TYP|requires a linked/i);
  });

  test("Spaces chat/download config failures use normalized provisioning errors", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const streamHandlerSource = source.slice(
      source.indexOf("const streamChatHandler = async"),
      source.indexOf("app.post(\n  \"/workspace/:slug/thread/:threadSlug/stream-chat\"")
    );
    const generatedFileDownloadSource = source.slice(
      source.indexOf('app.get("/api/spaces/:spaceId/files/:storageFilename"'),
      source.indexOf("function buildAgentMeterIdentity")
    );

    expect(streamHandlerSource).toContain("sendSpacesAdapterConfigFailure");
    expect(generatedFileDownloadSource).toContain("sendSpacesAdapterConfigFailure");
    expect(streamHandlerSource).not.toMatch(/res\.status\(500\)\.json\(\{\s*error:\s*"NOVA_TYP_BASE_URL is not configured\."/);
    expect(generatedFileDownloadSource).not.toMatch(/res\.status\(500\)\.json\(\{\s*error:\s*"NOVA_TYP_(BASE_URL|API_KEY) is not configured\."/);
  });

  test("anonymous work claim reuses the default thread before creating a fallback thread", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const claimHandlerSource = source.slice(
      source.indexOf("const claimAnonymousSpacesWorkHandler = async"),
      source.indexOf("app.post(\n  \"/api/spaces/anonymous-work/claim\"")
    );

    expect(claimHandlerSource).toContain("let threadSlug = target.threadSlug || null");
    expect(claimHandlerSource).toMatch(/if \(!threadSlug\) \{[\s\S]*createThreadInWorkspace/);
  });

  // --- WP-A: the claim must be real, and it must run on EVERY sign-in path ---

  test("the claim actually imports the work and never hardcodes imported: false", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const claimHandlerSource = source.slice(
      source.indexOf("const claimAnonymousSpacesWorkHandler = async"),
      source.indexOf("app.post(\n  \"/api/spaces/anonymous-work/claim\"")
    );

    // It writes the turns...
    expect(claimHandlerSource).toContain("importAnonymousWorkClaim");
    // ...it is idempotent on the saved work's identity...
    expect(claimHandlerSource).toContain("resolveClaimKey");
    expect(claimHandlerSource).toContain("findClaim");
    // ...and it reports what it actually did, rather than asserting a constant.
    expect(claimHandlerSource).toContain("imported: result.imported");
    expect(claimHandlerSource).not.toMatch(/imported:\s*false/);
  });

  test("imported turns are merged into the thread history read path", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const chatsHandlerSource = source.slice(
      source.indexOf("const getThreadChatsHandler = async"),
      source.indexOf('app.get("/workspace/:slug/thread/:threadSlug/chats"')
    );

    // Upstream has no message-append API, so a claimed conversation only reaches
    // the user if this read path unions ZAKI's imported rows with the upstream
    // history. Without it the thread renders empty and the claim is a lie again.
    expect(chatsHandlerSource).toContain("mergeImportedThreadHistory");
    expect(chatsHandlerSource).toContain("listThreadMessages");
  });

  test("pending imported turns are fed to the model once on the authenticated stream path", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const streamHandlerSource = source.slice(
      source.indexOf("const streamChatHandler = async"),
      source.indexOf('app.post(\n  "/workspace/:slug/thread/:threadSlug/stream-chat"')
    );

    expect(source).toContain("createImportedThreadContextProvider");
    expect(streamHandlerSource).toContain("getThreadContext");
    expect(streamHandlerSource).toMatch(
      /composeContextEnvelope\(\{[\s\S]*importedTranscript/
    );
    expect(streamHandlerSource).toMatch(
      /if \(upstreamResponse\.ok[\s\S]*markForwarded/
    );
  });

  test("the post-auth claim is shared by every sign-in path, not just credential login", () => {
    const appSource = fs.readFileSync(
      path.join(__dirname, "../../src/app/App.tsx"),
      "utf8"
    );
    const loginSource = fs.readFileSync(
      path.join(__dirname, "../../src/app/components/LoginScreen.tsx"),
      "utf8"
    );

    // App keys the claim off the token appearing, so a Google OAuth return —
    // which never touches LoginScreen — is claimed exactly like a credential
    // login. This is the whole fix for "Google returns never claim at all".
    expect(appSource).toContain("useAnonymousWorkClaim");

    // And the claim must NOT be re-inlined into the credential branch, which is
    // what made it unreachable for Google in the first place.
    expect(loginSource).not.toContain("claimAnonymousSpacesWork");
  });

  test("workspace list synthesizes both created and repaired default workspaces", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const listHandlerSource = source.slice(
      source.indexOf("const listWorkspacesHandler = async"),
      source.indexOf("app.get(\"/workspaces\"")
    );

    expect(listHandlerSource).toContain(
      "workspaceTarget?.created || workspaceTarget?.repaired"
    );
  });

  test("workspace list normalizes adapter outages instead of returning an opaque 500", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const listHandlerSource = source.slice(
      source.indexOf("const listWorkspacesHandler = async"),
      source.indexOf("app.get(\"/workspaces\"")
    );

    expect(listHandlerSource).toContain("normalizeSpacesProvisioningError");
    expect(listHandlerSource).toContain("SPACES_PROVISIONING_ERROR_CODES.UPSTREAM_UNAVAILABLE");
    expect(listHandlerSource).toMatch(/try\s*\{\s*upstream = await fetchTypWorkspaces/);
  });
});
