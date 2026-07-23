import { describe, expect, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const indexSource = readFileSync(fileURLToPath(new URL("./index.js", import.meta.url)), "utf8");
const envExample = readFileSync(fileURLToPath(new URL("../.env.example", import.meta.url)), "utf8");

describe("Minutes control-plane startup wiring", () => {
  test("mounts the callback/control BFF ahead of the read router behind both gates", () => {
    const controlSection = indexSource.slice(
      indexSource.indexOf("// MINUTES CONTROL BFF"),
      indexSource.indexOf("// MINUTES READ BFF")
    );
    // Options are built once (const minutesControlOptions) so the calendar
    // auto-join poller shares the exact same control wiring, then mounted.
    expect(controlSection).toContain("const minutesControlOptions = {");
    expect(controlSection).toContain('app.use("/api/minutes", buildMinutesControlRouter(minutesControlOptions));');
    expect(controlSection).toContain("enabled: ZAKI_MINUTES_CONTROL_ACTIVE");
    expect(controlSection).toContain("controlSigningKey: getMinutesEngineControlSigningKey()");
    expect(controlSection).toContain("recoveryEncryptionKey: getMinutesControlRecoveryEncryptionKey()");
    expect(controlSection).toContain("callbackHmacKey: getMinutesEngineCallbackHmacKey()");
    expect(controlSection).toContain("resolveUser: requireAuthUser");
    expect(indexSource.indexOf("// MINUTES CONTROL BFF")).toBeLessThan(indexSource.indexOf("// MINUTES READ BFF"));
    expect(indexSource).toContain("ZAKI_MINUTES_ENABLED && ZAKI_MINUTES_CONTROL_ENABLED && ZAKI_MINUTES_CONTROL_STAGING_READY");
    expect(indexSource).toContain("if (ZAKI_MINUTES_CONTROL_ACTIVE)");
    expect(indexSource).toContain("reconcileMinutesControlRecoveries({");
    expect(indexSource).toContain("resolveMinutesControlRecoveryKey");
  });

  test("documents a default-off, evidence-gated server-only control configuration", () => {
    expect(envExample).toContain("ZAKI_MINUTES_CONTROL_ENABLED=false");
    expect(envExample).toContain("ZAKI_MINUTES_CONTROL_STAGING_READY=false");
    expect(envExample).toContain("MINUTES_ENGINE_CONTROL_TOKEN_FILE=");
    expect(envExample).toContain("MINUTES_CONTROL_RECOVERY_KEY_FILE=");
    expect(envExample).toContain("MINUTES_ENGINE_CALLBACK_HMAC_KEY_FILE=");
    expect(envExample).toContain("MINUTES_CONTROL_CAPTURE_RESERVE_UNITS=");
    expect(envExample).toContain("MINUTES_CONTROL_MAX_CAPTURE_SECONDS=3600");
    expect(envExample).not.toContain("MINUTES_ENGINE_CONTROL_TOKEN=https://");
  });
});
