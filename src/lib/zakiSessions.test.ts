import {
  buildCanonicalZakiThreadSessionKey,
  extractThreadSlugFromSessionKey,
  formatZakiSessionFallbackLabel,
  formatZakiSessionLabel,
  isInternalProbeZakiSession,
  isRepairableZakiSessionTitle,
  isThreadLaneZakiSessionKey,
  normalizeZakiSessionKey,
  parseZakiSessionKey,
  parseZakiSessionTimestampMs,
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

  it("parses ISO, Unix-second, and Unix-millisecond session timestamps", () => {
    expect(parseZakiSessionTimestampMs("2026-05-08T00:00:00Z")).toBe(
      Date.parse("2026-05-08T00:00:00Z"),
    );
    expect(parseZakiSessionTimestampMs(1_778_400_000)).toBe(1_778_400_000_000);
    expect(parseZakiSessionTimestampMs(1_778_400_000_000)).toBe(1_778_400_000_000);
    expect(parseZakiSessionTimestampMs("not a date")).toBe(0);
  });

  it("identifies narrow synthetic QA/probe session signatures", () => {
    expect(
      isInternalProbeZakiSession({
        sessionKey: "agent:zaki-bot:user:7:thread:r6-cap",
        title: "r6-cap",
      }),
    ).toBe(true);
    expect(
      isInternalProbeZakiSession({
        sessionKey: "agent:zaki-bot:user:7:thread:main",
        title: "Reply exactly: PONG_ZAKI_AGENT_CLOSE_17799057788",
      }),
    ).toBe(true);
    expect(
      isInternalProbeZakiSession({
        sessionKey: "agent:zaki-bot:user:7:thread:test_image_demo",
        title: "test_image_demo",
      }),
    ).toBe(true);
    expect(
      isInternalProbeZakiSession({
        sessionKey: "agent:zaki-bot:user:7:thread:market-research",
        title: "Market research",
      }),
    ).toBe(false);
  });

  it("formats lane-aware fallback labels", () => {
    expect(formatZakiSessionFallbackLabel("agent:zaki-bot:user:7:thread:main")).toBe("Main");
    expect(formatZakiSessionFallbackLabel("agent:zaki-bot:user:7:thread:thread-42")).toBe(
      "New thread",
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

  it("does not expose date stamps for opaque thread ids", () => {
    const opaque = "agent:zaki-bot:user:7:thread:01H92ZJVFCAFR5RV";
    const out = formatZakiSessionFallbackLabel(opaque, {
      createdAt: "2026-05-08T00:00:00Z",
    });
    expect(out).toBe("New thread");
  });

  it("returns the readable threadId when it isn't an opaque id", () => {
    expect(
      formatZakiSessionFallbackLabel("agent:zaki-bot:user:7:thread:trip-planning", {
        createdAt: "2026-05-08T00:00:00Z",
      }),
    ).toBe("trip-planning");
  });

  it("keeps generated numeric thread ids neutral", () => {
    expect(formatZakiSessionFallbackLabel("agent:zaki-bot:user:7:thread:thread-42")).toBe(
      "New thread",
    );
    expect(
      formatZakiSessionLabel({
        sessionKey: "agent:zaki-bot:user:7:thread:thread-42",
        title: "thread-42",
      }),
    ).toBe("New thread");
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

  it("keeps opaque untitled thread labels neutral", () => {
    const out = formatZakiSessionLabel({
      sessionKey: "agent:zaki-bot:user:7:thread:01H92ZJVFCAFR5RV",
      title: null,
      createdAt: "2026-05-08T00:00:00Z",
    });
    expect(out).toBe("New thread");
  });

  it("ignores placeholder backend titles when deriving a user-facing label", () => {
    const out = formatZakiSessionLabel({
      sessionKey: "agent:zaki-bot:user:7:thread:01H92ZJVFCAFR5RV",
      title: "Session",
      createdAt: "2026-05-08T00:00:00Z",
    });
    expect(out).not.toBe("Session");
  });

  it("ignores date-like backend titles for opaque sessions", () => {
    const out = formatZakiSessionLabel({
      sessionKey: "agent:zaki-bot:user:7:thread:01H92ZJVFCAFR5RV",
      title: "May 30, 9:10 AM",
      createdAt: "2026-05-08T00:00:00Z",
    });
    expect(out).toBe("New thread");
  });

  it("ignores internal generated ids when deriving a user-facing title", () => {
    expect(
      formatZakiSessionLabel({
        sessionKey: "agent:zaki-bot:user:7:thread:anon-1780260474283-eyovaz",
        title: "anon-1780260474283-eyovaz",
      }),
    ).toBe("New thread");
    expect(
      formatZakiSessionLabel({
        sessionKey: "agent:zaki-bot:user:7:thread:codex-live-e2e-1780103345101",
        title: "codex-live-e2e-1780103345101",
      }),
    ).toBe("New thread");
  });

  it("marks only placeholder thread titles as repairable", () => {
    expect(
      isRepairableZakiSessionTitle({
        sessionKey: "agent:zaki-bot:user:7:thread:thread-42",
        title: "Session",
      }),
    ).toBe(true);
    expect(
      isRepairableZakiSessionTitle({
        sessionKey: "agent:zaki-bot:user:7:thread:thread-42",
        title: null,
      }),
    ).toBe(true);
    expect(
      isRepairableZakiSessionTitle({
        sessionKey: "agent:zaki-bot:user:7:thread:main",
        title: "Main",
      }),
    ).toBe(false);
    expect(
      isRepairableZakiSessionTitle({
        sessionKey: "agent:zaki-bot:user:7:thread:market-research",
        title: "Market research",
      }),
    ).toBe(false);
    expect(
      isRepairableZakiSessionTitle({
        sessionKey: "agent:zaki-bot:user:7:thread:r6-cap",
        title: "r6-cap",
      }),
    ).toBe(false);
  });
});
