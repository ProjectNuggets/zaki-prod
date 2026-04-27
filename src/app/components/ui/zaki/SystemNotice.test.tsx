import "@testing-library/jest-dom";
import { act } from "react";
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import {
  SystemNotice,
  SystemNoticesStack,
  emitSystemNotice,
} from "./SystemNotice";

describe("SystemNotice", () => {
  it("renders a compaction notice visibly (not behind a toggle)", () => {
    render(<SystemNotice kind="compaction" />);
    expect(screen.getByText("Context was compacted")).toBeInTheDocument();
    expect(screen.getByTestId("system-notice").getAttribute("data-kind")).toBe(
      "compaction"
    );
  });

  it("renders all four notice kinds", () => {
    const kinds: Array<
      "compaction" | "provider_fallback" | "connector_stale" | "multimodal_failure"
    > = ["compaction", "provider_fallback", "connector_stale", "multimodal_failure"];
    kinds.forEach((kind) => {
      const { unmount } = render(<SystemNotice kind={kind} />);
      expect(screen.getByTestId("system-notice").getAttribute("data-kind")).toBe(
        kind
      );
      unmount();
    });
  });
});

describe("SystemNoticesStack", () => {
  it("renders nothing when no notices have been emitted", () => {
    render(<SystemNoticesStack />);
    expect(screen.queryByTestId("system-notices-stack")).not.toBeInTheDocument();
  });

  it("appends notices emitted via emitSystemNotice", async () => {
    render(<SystemNoticesStack />);
    await act(async () => {
      emitSystemNotice({ kind: "provider_fallback" });
      emitSystemNotice({ kind: "connector_stale", detail: "telegram" });
    });
    expect(screen.getByText("Provider fallback")).toBeInTheDocument();
    expect(screen.getByText("Connector is stale")).toBeInTheDocument();
    expect(screen.getByText("telegram")).toBeInTheDocument();
  });
});
