import { describe, expect, it } from "@jest/globals";
import {
  buildCanonicalZakiThreadSessionKey,
  buildDefaultZakiThreadTitle,
  isInternalProbeZakiAgentSession,
  isPlaceholderZakiSessionTitle,
  isThreadLaneZakiSessionKey,
  listPublicZakiAgentSessions,
  normalizeZakiAgentBackendSessions,
  normalizeZakiSessionKey,
  overlayZakiAgentSessionTitles,
  parseZakiSessionKey,
} from "./zaki-agent-sessions.js";

describe("zaki agent session helpers", () => {
  it("normalizes legacy main keys", () => {
    expect(normalizeZakiSessionKey("agent:zaki-bot:user:7:main")).toBe(
      "agent:zaki-bot:user:7:thread:main",
    );
  });

  it("builds canonical thread session keys", () => {
    expect(buildCanonicalZakiThreadSessionKey("7", "thread-42")).toBe(
      "agent:zaki-bot:user:7:thread:thread-42",
    );
  });

  it("parses lanes without converting task or cron into thread", () => {
    expect(parseZakiSessionKey("agent:zaki-bot:user:7:task:77")).toMatchObject({
      lane: "task",
      threadId: null,
      value: "77",
    });
    expect(parseZakiSessionKey("agent:zaki-bot:user:7:cron:nightly")).toMatchObject({
      lane: "cron",
      threadId: null,
      value: "nightly",
    });
  });

  it("detects thread-lane sessions", () => {
    expect(isThreadLaneZakiSessionKey("agent:zaki-bot:user:7:thread:main")).toBe(true);
    expect(isThreadLaneZakiSessionKey("agent:zaki-bot:user:7:task:77")).toBe(false);
  });

  it("lists public canonical thread sessions with local title overlays only", () => {
    const sessions = listPublicZakiAgentSessions({
      upstreamSessions: [
        {
          session_key: "agent:zaki-bot:user:7:thread:thread-42",
          title: "",
          message_count: 3,
          last_active: "2026-04-28T08:00:00Z",
          live: true,
        },
        {
          session_key: "agent:zaki-bot:user:7:task:77",
          title: "Task 77",
          message_count: 1,
          last_active: "2026-04-27T08:00:00Z",
        },
        {
          session_key: "agent:zaki-bot:user:7:thread:bench-b4_agentic_file_read-1776986713",
          title: "Session",
          message_count: 90,
          last_active: "2026-04-29T08:00:00Z",
        },
      ],
      localThreads: [
        {
          session_key: "agent:zaki-bot:user:7:thread:thread-42",
          title: "Travel budget",
          message_count: 9,
          last_active: "2026-04-28T09:00:00Z",
        },
        {
          session_key: "agent:zaki-bot:user:7:thread:main",
          title: "Main session",
          message_count: 4,
          last_active: "2026-04-26T08:00:00Z",
        },
      ],
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      session_key: "agent:zaki-bot:user:7:thread:thread-42",
      title: "Travel budget",
      message_count: 3,
      live: true,
    });
  });

  it("normalizes backend sessions only and sorts by real recency", () => {
    const sessions = normalizeZakiAgentBackendSessions([
      {
        session_key: "agent:zaki-bot:user:7:thread:older",
        title: "Older",
        last_active: 1_779_910_000_000,
      },
      {
        session_key: "agent:zaki-bot:user:7:thread:newer",
        title: "Newer",
        last_active: 1_779_920_000_000,
      },
      {
        session_key: "agent:zaki-bot:user:7:main",
        title: "Legacy main",
        last_active: "2026-05-27T10:00:00Z",
      },
    ]);

    expect(sessions.map((session) => session.session_key)).toEqual([
      "agent:zaki-bot:user:7:thread:newer",
      "agent:zaki-bot:user:7:thread:older",
      "agent:zaki-bot:user:7:thread:main",
    ]);
    expect(sessions).toHaveLength(3);
  });

  it("overlays generated local titles without adding local-only sessions", () => {
    const sessions = overlayZakiAgentSessionTitles({
      upstreamSessions: [
        {
          session_key: "agent:zaki-bot:user:7:thread:01H92ZJVFCAFR5RV",
          title: "May 30, 9:10 AM",
          last_active: "2026-05-30T09:10:00Z",
        },
        {
          session_key: "agent:zaki-bot:user:7:thread:server-audit",
          title: "Backend Audit",
          last_active: "2026-05-29T09:10:00Z",
        },
      ],
      localThreads: [
        {
          session_key: "agent:zaki-bot:user:7:thread:01H92ZJVFCAFR5RV",
          title: "Personal AI market research",
        },
        {
          session_key: "agent:zaki-bot:user:7:thread:local-only",
          title: "Should not appear",
        },
      ],
    });

    expect(sessions.map((session) => session.session_key)).toEqual([
      "agent:zaki-bot:user:7:thread:01H92ZJVFCAFR5RV",
      "agent:zaki-bot:user:7:thread:server-audit",
    ]);
    expect(sessions[0]).toMatchObject({ title: "Personal AI market research" });
    expect(sessions[1]).toMatchObject({ title: "Backend Audit" });
  });

  it("treats generated backend labels as placeholders for local titles", () => {
    expect(isPlaceholderZakiSessionTitle("anon-1772488359256")).toBe(true);
    expect(isPlaceholderZakiSessionTitle("codex-live-e2e-1772488359256")).toBe(true);
    expect(isPlaceholderZakiSessionTitle("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isPlaceholderZakiSessionTitle("thread-42")).toBe(true);

    const sessions = overlayZakiAgentSessionTitles({
      upstreamSessions: [
        {
          session_key: "agent:zaki-bot:user:7:thread:anon-1772488359256",
          title: "anon-1772488359256",
          last_active: "2026-05-30T09:10:00Z",
        },
      ],
      localThreads: [
        {
          session_key: "agent:zaki-bot:user:7:thread:anon-1772488359256",
          title: "Readable research thread",
        },
      ],
    });

    expect(sessions[0]).toMatchObject({ title: "Readable research thread" });
  });

  it("detects internal probe sessions before they reach the public rail", () => {
    expect(
      isInternalProbeZakiAgentSession({
        sessionKey: "agent:zaki-bot:user:7:thread:bench-b13_ledger_math-1776678582",
        title: "Session",
      }),
    ).toBe(true);
    expect(
      isInternalProbeZakiAgentSession({
        sessionKey: "agent:zaki-bot:user:7:thread:k26-smoke-1778186569",
        title: "How are you habib",
      }),
    ).toBe(true);
    expect(
      isInternalProbeZakiAgentSession({
        sessionKey: "agent:zaki-bot:user:7:thread:mcp-smoke-test",
        title: "Session",
      }),
    ).toBe(true);
    expect(
      isInternalProbeZakiAgentSession({
        sessionKey: "agent:zaki-bot:user:7:thread:dtaas-bench-scale",
        title: "Session",
      }),
    ).toBe(true);
    expect(
      isInternalProbeZakiAgentSession({
        sessionKey: "agent:zaki-bot:user:7:thread:market-research",
        title: "Personal AI market research",
      }),
    ).toBe(false);
  });

  it("keeps New chat as the default local thread title", () => {
    expect(buildDefaultZakiThreadTitle("")).toBe("New chat");
    expect(buildDefaultZakiThreadTitle("New chat")).toBe("New chat");
    expect(buildDefaultZakiThreadTitle("Trip planning")).toBe("Trip planning");
  });
});
