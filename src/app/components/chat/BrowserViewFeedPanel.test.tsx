import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserViewFeedPanel } from "./BrowserViewFeedPanel";
import type { BrowserFrame } from "@/types";

const BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function makeFrame(overrides: Partial<BrowserFrame> = {}): BrowserFrame {
  return {
    sessionId: "session-1",
    frame: BASE64,
    url: "https://example.com/page",
    title: "Example Page",
    runId: "run-1",
    timestamp: 1700000000000,
    ...overrides,
  };
}

describe("BrowserViewFeedPanel", () => {
  it("renders the url, title, and the screenshot as a data URL", () => {
    render(<BrowserViewFeedPanel frame={makeFrame()} onClose={jest.fn()} />);

    expect(screen.getByText("Example Page")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/page")).toBeInTheDocument();

    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img).toHaveAttribute("src", `data:image/png;base64,${BASE64}`);
    expect(img).toHaveAttribute("alt", "Agent browser view: Example Page");
  });

  it("shows the empty state when frame is null", () => {
    render(<BrowserViewFeedPanel frame={null} onClose={jest.fn()} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText(/waiting for the agent to browse/i)).toBeInTheDocument();
  });

  it("shows the empty state when frame.frame is an empty string (no broken img)", () => {
    render(
      <BrowserViewFeedPanel frame={makeFrame({ frame: "" })} onClose={jest.fn()} />
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText(/waiting for the agent to browse/i)).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = jest.fn();
    render(<BrowserViewFeedPanel frame={makeFrame()} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /close browser view/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
