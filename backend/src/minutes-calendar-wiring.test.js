import { describe, expect, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const indexSource = readFileSync(fileURLToPath(new URL("./index.js", import.meta.url)), "utf8");

// The calendar auto-join sweep is only ever exercised end-to-end at runtime, so
// these source-grep pins guard the startup wiring against drift — same approach
// as minutes-control-wiring.test.js. If a rename or refactor moves an anchor,
// the test breaks loudly instead of the poller silently going dark or regressing.
const sweepSection = indexSource.slice(
  indexSource.indexOf("// WP-M10 calendar auto-join sweep"),
  indexSource.indexOf('console.log("[Minutes] calendar auto-join sweep armed")')
);

describe("Minutes calendar auto-join sweep startup wiring", () => {
  test("arms the sweep only behind the full evidence gate, with a UUID lease owner", () => {
    // The marker + armed-log bound the section; if either moves the slice is empty.
    expect(indexSource).toContain("// WP-M10 calendar auto-join sweep");
    expect(indexSource).toContain('console.log("[Minutes] calendar auto-join sweep armed")');
    expect(sweepSection.length).toBeGreaterThan(0);

    // (a) Dark unless all three: ZAKI_MINUTES_CALENDAR_ENABLED (itself gated on the
    // master minutes flag) AND the encryption key AND the Google OAuth client.
    expect(indexSource).toContain("isMinutesEnabled(process.env.ZAKI_MINUTES_CALENDAR_ENABLED) && ZAKI_MINUTES_ENABLED");
    expect(sweepSection).toContain(
      "if (ZAKI_MINUTES_CALENDAR_ENABLED && calendarEncryptionKey && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {"
    );

    // (b) lease_owner is a UUID column — regression guard for the 22P02 UUID-lease bug.
    expect(sweepSection).toContain("const CALENDAR_POLLER_LEASE_OWNER = crypto.randomUUID();");
  });

  test("watchdogs the sweep and shares the browser control-plane wiring", () => {
    // (c) Promise.race watchdog wraps runCalendarAutojoinSweep so a wedged call
    // never freezes the running flag for the process lifetime.
    expect(sweepSection).toContain("await Promise.race([");
    expect(sweepSection).toContain("runCalendarAutojoinSweep({ deps: calendarSweepDeps }),");
    expect(sweepSection).toContain("calendar sweep watchdog timeout");
    expect(sweepSection.indexOf("await Promise.race([")).toBeLessThan(
      sweepSection.indexOf("runCalendarAutojoinSweep({ deps: calendarSweepDeps }),")
    );

    // (d) loadZakiUser uses the shared _ZAKI_USER_COLS projection, never SELECT *.
    expect(sweepSection).toContain("loadZakiUser:");
    expect(sweepSection).toContain("SELECT ${_ZAKI_USER_COLS} FROM zaki_users WHERE id = $1");
    expect(sweepSection).not.toContain("SELECT *");

    // (e) fireCapture routes through buildMinutesControlDependencies(minutesControlOptions)
    // so the poller shares the exact browser reserve/create/persist/compensate wiring.
    expect(sweepSection).toContain("const calendarControlDeps = buildMinutesControlDependencies(minutesControlOptions);");
    expect(sweepSection).toContain(
      "fireCapture: ({ context, input }) => createMinutesCaptureForUser({ context, input, dependencies: calendarControlDeps }),"
    );
  });
});
