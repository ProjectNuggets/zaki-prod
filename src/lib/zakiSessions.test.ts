import {
  buildCanonicalZakiThreadSessionKey,
  extractThreadSlugFromSessionKey,
  formatZakiSessionFallbackLabel,
  formatZakiSessionLabel,
  isThreadLaneZakiSessionKey,
  normalizeZakiSessionKey,
  parseZakiSessionKey,
} from "./zakiSessions";

describe("zaki session helpers", () => {
  it("normalizes legacy :main keys to canonical thread:main", () => {
    expect(normalizeZakiSessionKey("agent:zaki-bot:user:7:main")).toBe(
      "agent:zaki-bot:user:7:thread:main",
    );
  });

  it("builds canonical thread session keys", () => {
    expect(buildCanonicalZakiThreadSessionKey("7", "thread-42")).toBe(
      "agent:zaki-bot:user:7:thread:thread-42",
    );
    expect(buildCanonicalZakiThreadSessionKey("7")).toBe(
      "agent:zaki-bot:user:7:thread:main",
    );
  });

  it("parses thread lanes", () => {
    expect(parseZakiSessionKey("agent:zaki-bot:user:7:thread:thread-42")).toMatchObject({
      userId: "7",
      lane: "thread",
      value: "thread-42",
      threadId: "thread-42",
    });
  });

  it("parses task and cron lanes without pretending they are threads", () => {
    expect(parseZakiSessionKey("agent:zaki-bot:user:7:task:77")).toMatchObject({
      lane: "task",
      value: "77",
      threadId: null,
    });
    expect(parseZakiSessionKey("agent:zaki-bot:user:7:cron:nightly")).toMatchObject({
      lane: "cron",
      value: "nightly",
      threadId: null,
    });
  });

  it("extracts thread slugs only for thread lanes", () => {
    expect(extractThreadSlugFromSessionKey("agent:zaki-bot:user:7:thread:main")).toBe("main");
    expect(extractThreadSlugFromSessionKey("agent:zaki-bot:user:7:thread:thread-42")).toBe(
      "thread-42",
    );
    expect(extractThreadSlugFromSessionKey("agent:zaki-bot:user:7:task:77")).toBeNull();
  });

  it("detects thread-lane sessions", () => {
    expect(isThreadLaneZakiSessionKey("agent:zaki-bot:user:7:thread:main")).toBe(true);
    expect(isThreadLaneZakiSessionKey("agent:zaki-bot:user:7:task:77")).toBe(false);
  });

  it("formats lane-aware fallback labels", () => {
    expect(formatZakiSessionFallbackLabel("agent:zaki-bot:user:7:thread:main")).toBe("Main");
    expect(formatZakiSessionFallbackLabel("agent:zaki-bot:user:7:thread:thread-42")).toBe(
      "thread-42",
    );
    expect(formatZakiSessionFallbackLabel("agent:zaki-bot:user:7:task:77")).toBe("Task 77");
    expect(formatZakiSessionFallbackLabel("agent:zaki-bot:user:7:cron:nightly")).toBe(
      "Cron nightly",
    );
  });

  it("prefers non-default titles but keeps New chat when that is the stored local title", () => {
    expect(
      formatZakiSessionLabel({
        sessionKey: "agent:zaki-bot:user:7:thread:thread-42",
        title: "Trip planning",
      }),
    ).toBe("Trip planning");
    expect(
      formatZakiSessionLabel({
        sessionKey: "agent:zaki-bot:user:7:thread:thread-42",
        title: "New chat",
      }),
    ).toBe("New chat");
    expect(
      formatZakiSessionLabel({
        sessionKey: "agent:zaki-bot:user:7:task:77",
        title: "",
      }),
    ).toBe("Task 77");
  });

  it("falls back to a date stamp when the threadId looks opaque and createdAt is provided", () => {
    const opaque = "agent:zaki-bot:user:7:thread:01H92ZJVFCAFR5RV";
    const out = formatZakiSessionFallbackLabel(opaque, {
      createdAt: "2026-05-08T00:00:00Z",
    });
    expect(out).not.toMatch(/^Session/);
    expect(out.length).toBeGreaterThan(0);
  });

  it("returns the readable threadId when it isn't an opaque id", () => {
    expect(
      formatZakiSessionFallbackLabel("agent:zaki-bot:user:7:thread:trip-planning", {
        createdAt: "2026-05-08T00:00:00Z",
      }),
    ).toBe("trip-planning");
  });

  it("uses createdAt date for unknown-lane keys when no readable tail is available", () => {
    const out = formatZakiSessionFallbackLabel("agent:zaki-bot:user:7:abcdef0123456789", {
      createdAt: "2026-05-08T00:00:00Z",
    });
    expect(out).not.toMatch(/^Session/);
    expect(out.length).toBeGreaterThan(0);
  });

  it("uses readable tail when key tail is short and human-meaningful", () => {
    expect(formatZakiSessionFallbackLabel("agent:zaki-bot:user:7:demo")).toBe("demo");
  });

  it("returns plain Session when nothing better is available", () => {
    expect(formatZakiSessionFallbackLabel("agent:zaki-bot:user:7:abcdef0123456789")).toBe(
      "Session",
    );
  });

  it("threads createdAt through formatZakiSessionLabel", () => {
    const out = formatZakiSessionLabel({
      sessionKey: "agent:zaki-bot:user:7:thread:01H92ZJVFCAFR5RV",
      title: null,
      createdAt: "2026-05-08T00:00:00Z",
    });
    expect(out).not.toMatch(/^Session/);
    expect(out.length).toBeGreaterThan(0);
  });

  it("ignores placeholder backend titles when deriving a user-facing label", () => {
    const out = formatZakiSessionLabel({
      sessionKey: "agent:zaki-bot:user:7:thread:01H92ZJVFCAFR5RV",
      title: "Session",
      createdAt: "2026-05-08T00:00:00Z",
    });
    expect(out).not.toBe("Session");
  });
});
