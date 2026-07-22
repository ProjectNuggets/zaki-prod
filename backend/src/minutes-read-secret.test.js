import { describe, expect, jest, test } from "@jest/globals";
import { resolveMinutesReadToken } from "./minutes-read-secret.js";

describe("Minutes read credential loading", () => {
  test("loads the dedicated credential from an absolute projected secret file", () => {
    const readFileSync = jest.fn().mockReturnValue("f".repeat(32));

    expect(resolveMinutesReadToken({
      tokenFile: "/run/secrets/zaki-read/minutes",
      fallbackToken: "env-secret-must-not-win".repeat(2),
      readFileSync,
    })).toBe("f".repeat(32));
    expect(readFileSync).toHaveBeenCalledWith("/run/secrets/zaki-read/minutes", "utf8");
  });
});
