import { describe, expect, test } from "@jest/globals";
import {
  failClosedMinutesControlSchema,
  isMinutesControlSchemaRequired,
} from "./db.js";

describe("Minutes control schema startup safety", () => {
  const activeEnv = {
    ZAKI_MINUTES_CONTROL_ENABLED: "true",
    ZAKI_MINUTES_CONTROL_STAGING_READY: "true",
  };

  test("requires both the wallet and callback schema once the evidence gate is active", () => {
    expect(isMinutesControlSchemaRequired(activeEnv)).toBe(true);
    expect(() => failClosedMinutesControlSchema("unit-ledger", new Error("ddl failed"), activeEnv)).toThrow(
      "Minutes control is active but required unit-ledger schema migration failed."
    );
    expect(() => failClosedMinutesControlSchema("control-state", new Error("ddl failed"), activeEnv)).toThrow(
      "Minutes control is active but required control-state schema migration failed."
    );
  });

  test("keeps dark-launch migration failures non-fatal", () => {
    expect(isMinutesControlSchemaRequired({
      ZAKI_MINUTES_CONTROL_ENABLED: "true",
      ZAKI_MINUTES_CONTROL_STAGING_READY: "false",
    })).toBe(false);
    expect(() => failClosedMinutesControlSchema("unit-ledger", new Error("ddl failed"), {
      ZAKI_MINUTES_CONTROL_ENABLED: "false",
      ZAKI_MINUTES_CONTROL_STAGING_READY: "false",
    })).not.toThrow();
  });
});
