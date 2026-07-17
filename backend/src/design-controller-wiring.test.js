import { describe, expect, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const indexSource = readFileSync(
  fileURLToPath(new URL("./index.js", import.meta.url)),
  "utf8"
);

describe("Design controller dark-mode wiring", () => {
  test("keeps controller-only routers behind their gate and under Design-only prefixes", () => {
    const designSection = indexSource.slice(
      indexSource.indexOf("// DESIGN ENGINE BFF"),
      indexSource.indexOf("// LEARNING ENGINE BFF")
    );
    const gatedControllerMounts = designSection.slice(
      designSection.indexOf("if (ZAKI_DESIGN_SESSION_CONTROLLER_ENABLED)"),
      designSection.indexOf("const unavailableDesignSessionController")
    );

    expect(gatedControllerMounts).toContain('"/internal/design/controller/v1"');
    expect(gatedControllerMounts).toContain('"/internal/design/read/v1"');
    expect(designSection).toContain('"/api/design/sessions"');
    expect(designSection).toContain(
      "enabled: ZAKI_DESIGN_ENABLED && ZAKI_DESIGN_SESSION_CONTROLLER_ENABLED"
    );
    expect(designSection).toContain("resolveBillingUserById: resolveDesignBillingUserById");
    expect(designSection).toContain("createDesignSessionProxyAuthorizer({");
    expect(designSection).toContain("issueMeterGrantForIdentity");

    for (const corePrefix of ["/api/agent", "/api/chat", "/api/billing"]) {
      expect(designSection).not.toContain(`"${corePrefix}`);
    }
  });
});
