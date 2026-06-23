import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MessageBubble, type Message } from "./MessageBubble";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string; count?: number }) => {
      if (opts?.defaultValue) return opts.defaultValue;
      if (opts?.count != null) return `${key} ${opts.count}`;
      return key;
    },
    i18n: {
      language: "en",
      dir: () => "ltr",
    },
  }),
}));

jest.mock("@/lib/api", () => ({
  deleteMemory: jest.fn(async () => ({ ok: true })),
}));

describe("MessageBubble source chip", () => {
  it("marks assistant rows while the response is streaming", () => {
    const message: Message = {
      id: "streaming-1",
      role: "assistant",
      content: "working",
    };
    const { container } = render(<MessageBubble message={message} isStreaming animate={false} />);
    const row = container.querySelector(".zaki-message-row");
    expect(row).toHaveClass("is-streaming");
    expect(row).toHaveAttribute("data-streaming", "true");
  });

  it("does not render per-message source chips by default", () => {
    const message: Message = {
      id: "1",
      role: "user",
      content: "hello",
    };
    render(<MessageBubble message={message} animate={false} />);
    expect(document.querySelector('[data-testid="source-chip"]')).toBeNull();
  });

  it("can hide source chips on product surfaces that carry provenance elsewhere", () => {
    const message: Message = {
      id: "agent-1",
      role: "assistant",
      content: "done",
    };
    render(<MessageBubble message={message} animate={false} />);
    expect(document.querySelector('[data-testid="source-chip"]')).toBeNull();
  });

  it("renders Agent lane metadata without leaking web/main provenance chips", () => {
    const message: Message = {
      id: "agent-2",
      role: "assistant",
      content: "Done.",
      createdAt: "2026-05-27T09:30:00.000Z",
    };
    render(
      <MessageBubble
        message={message}
        botMode
        animate={false}
      />
    );

    expect(screen.queryByText("ZAKI")).not.toBeInTheDocument();
    expect(screen.queryByText("You")).not.toBeInTheDocument();
    expect(screen.queryByText("v2 · final")).not.toBeInTheDocument();
    expect(document.querySelector(".zaki-message-rune")).not.toBeNull();
    expect(document.querySelector('[data-testid="source-chip"]')).toBeNull();
  });

  it("renders a quiet timestamp footer with full time metadata", () => {
    const message: Message = {
      id: "timestamp-1",
      role: "assistant",
      content: "Done.",
      createdAt: "2026-05-27T09:30:00.000Z",
    };

    render(<MessageBubble message={message} botMode animate={false} />);

    const timestamp = screen.getByTestId("message-timestamp");
    expect(timestamp).toHaveAttribute("dateTime", "2026-05-27T09:30:00.000Z");
    expect(timestamp).toHaveAttribute("title", expect.stringContaining("2026"));
    expect(timestamp).toHaveAttribute("aria-label", expect.stringContaining("Message sent"));
    expect(timestamp.textContent?.trim()).toBeTruthy();
    expect(timestamp).not.toHaveTextContent(/just now/i);
    expect(timestamp).toHaveTextContent(/\d{1,2}:\d{2}/);
  });

  it("does not leak malformed tool-call tag fragments in assistant replies", () => {
    const message: Message = {
      id: "tool-fragment-1",
      role: "assistant",
      content:
        "I created the report. (ool call>) <tool_result>{\"ok\":true}</tool_result> The document is ready.",
    };

    render(
      <MessageBubble
        message={message}
        botMode
        animate={false}
      />
    );

    expect(screen.getByText(/I created the report/)).toBeInTheDocument();
    expect(screen.queryByText(/ool call/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tool_result/i)).not.toBeInTheDocument();
  });

  it("suppresses standalone runtime JSON in persisted Agent replies", () => {
    const message: Message = {
      id: "json-leak-1",
      role: "assistant",
      content: '{"type":"tool_result","tool":"shell","output_preview":"raw terminal output"}',
    };

    render(
      <MessageBubble
        message={message}
        botMode
        animate={false}
      />
    );

    expect(screen.getByTestId("agent-runtime-suppressed")).toHaveTextContent("No final reply");
    expect(screen.queryByText(/tool_result/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/raw terminal output/i)).not.toBeInTheDocument();
  });

  it("hides gateway tool previews and approval observations in Agent replies", () => {
    const message: Message = {
      id: "gateway-json-leak-1",
      role: "assistant",
      content: [
        "I now have enough market data.",
        '{"tool":"web_search","status":"ok","partial":false,"original_bytes":2024,"shown_bytes":2024,"result_hash":"ec1462c0aa4d1909","content_preview":"Results for personal AI agents market"}',
        "[Approved tool execution: id=1 tool=artifact_create status=succeeded] Output: Created artifact 'Personal AI Agent Market Report' (id=abc, kind=markdown, version=1, url=/api/v1/users/1/artifacts/abc)\nContinue your reasoning based on this tool result. Produce the next step for the user.",
        "Done — your report is live in the side panel.",
      ].join("\n\n"),
    };

    render(
      <MessageBubble
        message={message}
        botMode
        animate={false}
      />
    );

    expect(screen.getByText("I now have enough market data.")).toBeInTheDocument();
    expect(screen.getByText("Done — your report is live in the side panel.")).toBeInTheDocument();
    expect(screen.queryByText(/web_search/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/content_preview/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Approved tool execution/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Continue your reasoning/i)).not.toBeInTheDocument();
  });

  it("renders a 'memories used' reveal when the message has memorySources", () => {
    render(
      <MessageBubble
        message={
          {
            id: "m1",
            role: "assistant",
            content: "hi",
            memorySources: [{ id: "a", content: "Lives in Riyadh", type: "fact" }],
          } as Message
        }
        showWhy
        animate={false}
      />
    );
    expect(screen.getByText(/used .*memor|memor.*used/i)).toBeInTheDocument();
  });

  it("keeps memory and document chips out of Agent replies", () => {
    const message: Message = {
      id: "agent-memory-1",
      role: "assistant",
      content: "Done.",
      memorySources: [{ id: "a", content: "Lives in Riyadh", type: "fact" }],
      docSources: [{ id: "d1", title: "contract.pdf", snippet: "Payment is net-30." }],
    };

    render(<MessageBubble message={message} botMode showWhy animate={false} />);

    expect(screen.getByText("Done.")).toBeInTheDocument();
    expect(screen.queryByText(/used .*memor|memor.*used/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Lives in Riyadh")).not.toBeInTheDocument();
    expect(screen.queryByText("contract.pdf")).not.toBeInTheDocument();
  });

  it("offers a don't-use (delete) action on a used memory", async () => {
    const api = await import("@/lib/api");
    render(
      <MessageBubble
        message={
          {
            id: "m1",
            role: "assistant",
            content: "hi",
            memorySources: [{ id: "a", content: "Lives in Riyadh", type: "fact" }],
          } as Message
        }
        showWhy
        animate={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /don.?t use|forget|delete/i }));
    await waitFor(() => expect(api.deleteMemory).toHaveBeenCalledWith("a"));
  });

  it("renders document citation chips when the message has docSources", () => {
    const message: Message = {
      id: "m1",
      role: "assistant",
      content: "Payment terms are net-30.",
      docSources: [
        { id: "d1", title: "contract.pdf", snippet: "Payment is net-30." },
        { id: "d2", title: "appendix.docx" },
      ],
    };
    render(<MessageBubble message={message} animate={false} />);
    expect(screen.getByText("contract.pdf")).toBeInTheDocument();
    expect(screen.getByText("appendix.docx")).toBeInTheDocument();
  });
});
