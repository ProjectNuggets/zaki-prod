import { describe, expect, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const indexSource = readFileSync(fileURLToPath(new URL("./index.js", import.meta.url)), "utf8");
const envExample = readFileSync(fileURLToPath(new URL("../.env.example", import.meta.url)), "utf8");

describe("Minutes read-plane startup wiring", () => {
  test("mounts only the authenticated read router with server-side config", () => {
    expect(indexSource).toContain("buildMinutesReadRouter,");
    expect(indexSource).toContain("bypassMinutesReadBodyParser,");
    expect(indexSource).toContain("isMinutesEnabled,");
    expect(indexSource).toContain('} from "./minutes-read-routes.js";');
    expect(indexSource).toContain("const ZAKI_MINUTES_ENABLED = isMinutesEnabled(process.env.ZAKI_MINUTES_ENABLED);");
    expect(indexSource).toContain('process.env.MINUTES_ENGINE_BASE_URL || ""');
    expect(indexSource).toContain("resolveMinutesReadToken({");
    expect(indexSource).toContain("tokenFile: process.env.MINUTES_ENGINE_READ_TOKEN_FILE");

    const minutesSection = indexSource.slice(
      indexSource.indexOf("// MINUTES READ BFF"),
      indexSource.indexOf("// DESIGN ENGINE BFF")
    );
    expect(minutesSection).toContain('app.use("/api/minutes", buildMinutesReadRouter({');
    expect(minutesSection).toContain("enabled: ZAKI_MINUTES_ENABLED");
    expect(minutesSection).toContain("resolveUser: requireAuthUser");
    expect(minutesSection).toContain("readToken: getMinutesEngineReadToken()");
    expect(minutesSection).toContain('logStructured("warn", "minutes.read.failed", event)');
    expect(minutesSection).not.toContain("webhook");
    expect(minutesSection).not.toContain("meter");
    expect(minutesSection).not.toContain("provision");
  });

  test("documents a default-off read-only environment boundary", () => {
    expect(envExample).toContain("ZAKI_MINUTES_ENABLED=false");
    expect(envExample).toContain("MINUTES_ENGINE_BASE_URL=http://127.0.0.1:8056");
    expect(envExample).toContain("MINUTES_ENGINE_READ_TOKEN_FILE=");
    expect(envExample).toContain("MINUTES_ENGINE_READ_TOKEN=");
    expect(envExample).not.toContain("MINUTES_ADMIN_TOKEN");
  });
});
