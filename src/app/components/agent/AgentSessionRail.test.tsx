import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ComponentProps } from "react";
import { AgentSessionRail } from "./AgentSessionRail";
import type { AgentSession } from "@/lib/api";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (typeof options?.defaultValue === "string") {
        return options.defaultValue
          .replace("{{shown}}", String(options.shown ?? ""))
          .replace("{{total}}", String(options.total ?? ""))
          .replace("{{threadLabel}}", String(options.threadLabel ?? ""));
      }
      return key;
    },
  }),
}));

function makeSession(index: number, patch: Partial<AgentSession> = {}): AgentSession {
  return {
    session_key: `agent:zaki-bot:user:1:thread:thread-${index}`,
    title: `Thread ${index}`,
    last_active: `2026-05-${String((index % 28) + 1).padStart(2, "0")}T10:00:00Z`,
    live: false,
    pending_approval_count: 0,
    ...patch,
  };
}

function renderRail(
  sessions: AgentSession[],
  activeSessionKey: string | null = null,
  overrides: Partial<ComponentProps<typeof AgentSessionRail>> = {}
) {
  return render(
    <AgentSessionRail
      sessions={sessions}
      isLoading={false}
      activeSessionKey={activeSessionKey}
      isRtl={false}
      onSelectSession={jest.fn()}
      onCreateSession={jest.fn()}
      onDeleteSession={jest.fn()}
      {...overrides}
    />
  );
}

describe("AgentSessionRail", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("caps large session lists and expands on demand", () => {
    const sessions = Array.from({ length: 90 }, (_, index) => makeSession(index));
    const { container } = renderRail(sessions);

    expect(container.querySelectorAll(".zaki-thread-item")).toHaveLength(72);
    expect(screen.getAllByText("72 of 90 threads").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "More" }));

    expect(container.querySelectorAll(".zaki-thread-item")).toHaveLength(90);
    expect(screen.getByText("90 threads")).toBeInTheDocument();
  });

  it("keeps the active session visible when it falls beyond the initial cap", () => {
    const base = Date.UTC(2026, 5, 1, 12, 0, 0);
    const sessions = Array.from({ length: 90 }, (_, index) =>
      makeSession(index, {
        last_active: new Date(base - index * 60_000).toISOString(),
      })
    );
    const { container } = renderRail(sessions, sessions[89].session_key);

    expect(container.querySelectorAll(".zaki-thread-item")).toHaveLength(73);
    expect(screen.getByText("Thread 89")).toBeInTheDocument();
  });

  it("shows only real thread sessions sorted by recency", () => {
    const sessions: AgentSession[] = [
      makeSession(1, { title: "Older", last_active: "2026-05-08T10:00:00Z" }),
      {
        session_key: "agent:zaki-bot:user:1:task:99",
        title: "Task should stay out",
        last_active: "2026-05-10T10:00:00Z",
      },
      makeSession(2, { title: "Newest", last_active: "2026-05-12T10:00:00Z" }),
      {
        session_key: "agent:zaki-bot:user:1:cron:nightly",
        title: "Cron should stay out",
        last_active: "2026-05-11T10:00:00Z",
      },
    ];
    const { container } = renderRail(sessions);
    const rows = container.querySelectorAll(".zaki-thread-item");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Newest");
    expect(rows[1]).toHaveTextContent("Older");
    expect(screen.queryByText("Task should stay out")).not.toBeInTheDocument();
    expect(screen.queryByText("Cron should stay out")).not.toBeInTheDocument();
    expect(screen.getByText("2 threads")).toBeInTheDocument();
  });

  it("hides synthetic QA/probe sessions from the production rail", () => {
    const sessions: AgentSession[] = [
      makeSession(1, { title: "Market research" }),
      makeSession(2, { title: "r6-cap" }),
      makeSession(3, { title: "Health check ping response" }),
      makeSession(4, { title: "Reply exactly: PONG_ZAKI_AGENT_CLOSE_17799057788" }),
      makeSession(5, { title: "Approval Reload Proof 1780319121998" }),
      makeSession(6, { title: "test_image_demo" }),
    ];
    renderRail(sessions);

    expect(screen.getByText("Market research")).toBeInTheDocument();
    expect(screen.queryByText("r6-cap")).not.toBeInTheDocument();
    expect(screen.queryByText("Health check ping response")).not.toBeInTheDocument();
    expect(screen.queryByText(/Reply exactly/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Approval Reload Proof/)).not.toBeInTheDocument();
    expect(screen.queryByText("test_image_demo")).not.toBeInTheDocument();
    expect(screen.getByText("1 thread")).toBeInTheDocument();
  });

  it("keeps a synthetic session visible when it is the active session", () => {
    const synthetic = makeSession(2, { title: "r6-cap" });
    renderRail([makeSession(1, { title: "Market research" }), synthetic], synthetic.session_key);

    expect(screen.getByText("Market research")).toBeInTheDocument();
    expect(screen.getByText("r6-cap")).toBeInTheDocument();
    expect(screen.getByText("2 threads")).toBeInTheDocument();
  });

  it("sorts mixed Unix-second and ISO timestamps by actual recency", () => {
    const sessions: AgentSession[] = [
      makeSession(1, { title: "ISO older", last_active: "2026-05-08T10:00:00Z" }),
      makeSession(2, { title: "Unix newer", last_active: 1_778_400_000 }),
    ];
    const { container } = renderRail(sessions);
    const rows = container.querySelectorAll(".zaki-thread-item");

    expect(rows[0]).toHaveTextContent("Unix newer");
    expect(rows[1]).toHaveTextContent("ISO older");
  });

  it("dedupes canonical-equivalent sessions and keeps the newest record", () => {
    const sessions: AgentSession[] = [
      {
        session_key: "agent:zaki-bot:user:1:main",
        title: "Legacy main",
        last_active: "2026-05-08T10:00:00Z",
      },
      {
        session_key: "agent:zaki-bot:user:1:thread:main",
        title: "Canonical main",
        last_active: "2026-05-09T10:00:00Z",
      },
      makeSession(2, { title: "Project brief", last_active: "2026-05-07T10:00:00Z" }),
    ];
    const { container } = renderRail(sessions, "agent:zaki-bot:user:1:main");
    const rows = container.querySelectorAll(".zaki-thread-item");
    const activeRows = container.querySelectorAll(".zaki-nav-active");

    expect(rows).toHaveLength(2);
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0]).toHaveTextContent("Canonical main");
    expect(screen.queryByText("Legacy main")).not.toBeInTheDocument();
  });

  it("disambiguates repeated visible labels without leaking session keys", () => {
    const sessions: AgentSession[] = [
      makeSession(1, {
        title: "Session",
        last_active: "2026-05-08T10:00:00Z",
        message_count: 2,
      }),
      makeSession(2, {
        title: "Session",
        last_active: "2026-05-09T10:00:00Z",
        message_count: 5,
      }),
    ];
    renderRail(sessions);

    expect(screen.getByText(/New thread · .*5 msg/)).toBeInTheDocument();
    expect(screen.getByText(/New thread · .*2 msg/)).toBeInTheDocument();
    expect(screen.queryByText("thread-1")).not.toBeInTheDocument();
    expect(screen.queryByText("thread-2")).not.toBeInTheDocument();
  });

  it("keeps long thread names one-line while exposing the full name on hover", () => {
    const longTitle =
      "Analyze enterprise onboarding risks across billing, activation, memory, and agent approvals";
    renderRail([makeSession(1, { title: longTitle })]);

    const rowButton = screen.getByRole("button", { name: longTitle });
    const visibleLabel = screen.getByText(longTitle);

    expect(rowButton).toHaveAttribute("title", longTitle);
    expect(visibleLabel).toHaveClass("truncate");
    expect(visibleLabel).toHaveAttribute("title", longTitle);
  });

  it("normalizes generated title whitespace before rendering the rail label", () => {
    renderRail([
      makeSession(1, {
        title: "Plan   launch\n\nhandoff\twith staging checks",
      }),
    ]);

    const normalizedTitle = "Plan launch handoff with staging checks";

    expect(screen.getByText(normalizedTitle)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: normalizedTitle })).toHaveAttribute(
      "title",
      normalizedTitle
    );
  });

  it("requests bounded title repair for visible placeholder thread sessions", async () => {
    const onRepairSessionTitles = jest.fn(async () => undefined);
    const sessions: AgentSession[] = [
      makeSession(1, { title: "Session", message_count: 2 }),
      makeSession(2, { title: "Market research", message_count: 4 }),
      makeSession(3, { title: "thread-3", message_count: 2 }),
    ];
    renderRail(sessions, null, { onRepairSessionTitles });

    await waitFor(() => {
      expect(onRepairSessionTitles).toHaveBeenCalledTimes(1);
    });
    const repaired = onRepairSessionTitles.mock.calls[0]?.[0] as AgentSession[];
    expect(repaired.map((session) => session.session_key)).toEqual([
      "agent:zaki-bot:user:1:thread:thread-3",
      "agent:zaki-bot:user:1:thread:thread-1",
    ]);
  });

  it("does not request title repair while sessions are loading", async () => {
    const onRepairSessionTitles = jest.fn(async () => undefined);
    renderRail([makeSession(1, { title: "Session", message_count: 2 })], null, {
      onRepairSessionTitles,
      isLoading: true,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onRepairSessionTitles).not.toHaveBeenCalled();
  });

  it("persists manual renames through the rail handler", async () => {
    const onRenameSession = jest.fn(async () => undefined);
    renderRail([makeSession(1, { title: "Session" })], null, { onRenameSession });

    fireEvent.click(screen.getByRole("button", { name: /Rename/i }));
    const input = screen.getByRole("textbox", { name: "Session name" });
    fireEvent.change(input, { target: { value: "Market research" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(onRenameSession).toHaveBeenCalledWith(
        "agent:zaki-bot:user:1:thread:thread-1",
        "Market research"
      );
    });
    expect(screen.getByText("Market research")).toBeInTheDocument();
  });

  it("rolls back optimistic session renames when persistence fails", async () => {
    const onRenameSession = jest.fn(async () => {
      throw new Error("rename failed");
    });
    renderRail([makeSession(1, { title: "Original title" })], null, { onRenameSession });

    fireEvent.click(screen.getByRole("button", { name: /Rename/i }));
    const input = screen.getByRole("textbox", { name: "Session name" });
    fireEvent.change(input, { target: { value: "Rejected title" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("Rejected title")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Original title")).toBeInTheDocument();
    });
    expect(screen.queryByText("Rejected title")).not.toBeInTheDocument();
  });

  it("keeps the session rail focused on search without operational filter tabs", () => {
    const sessions = [
      makeSession(1, { title: "Planning thread" }),
      makeSession(2, { title: "Live browser run", live: true }),
      makeSession(3, { title: "Approval blocked", pending_approval_count: 1 }),
    ];
    const { container } = renderRail(sessions);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search threads" }), {
      target: { value: "approval" },
    });

    expect(screen.getByText("Approval blocked")).toBeInTheDocument();
    expect(screen.getByText("1 of 1 matching")).toBeInTheDocument();
    expect(screen.queryByText("Planning thread")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".zaki-thread-item")).toHaveLength(1);

    expect(screen.queryByLabelText("Thread filters")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Live/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Download/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Share/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("live")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("idle")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reset/i }));

    expect(screen.getByText("Planning thread")).toBeInTheDocument();
    expect(screen.getByText("Live browser run")).toBeInTheDocument();
    expect(screen.getByText("Approval blocked")).toBeInTheDocument();
  });
});
