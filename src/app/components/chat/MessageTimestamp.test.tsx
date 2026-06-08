import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { formatMessageTimestamp, MessageTimestamp } from "./MessageTimestamp";

describe("MessageTimestamp", () => {
  it("formats same-day messages as a visible clock time", () => {
    const now = new Date(2026, 5, 8, 14, 0, 0);
    const sentAt = new Date(2026, 5, 8, 13, 48, 0).toISOString();

    expect(formatMessageTimestamp(sentAt, "en-US", now)?.shortLabel).toBe("1:48 PM");
  });

  it("keeps clock time visible on older messages", () => {
    const now = new Date(2026, 5, 8, 14, 0, 0);
    const sentAt = new Date(2026, 4, 27, 9, 30, 0).toISOString();

    expect(formatMessageTimestamp(sentAt, "en-US", now)?.shortLabel).toBe("May 27 · 9:30 AM");
  });

  it("does not fabricate just-now timestamps when the source value is missing", () => {
    expect(formatMessageTimestamp(null, "en-US", new Date(2026, 5, 8, 14, 0, 0))).toBeNull();

    const { container } = render(<MessageTimestamp value={null} role="assistant" locale="en-US" />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/just now/i)).not.toBeInTheDocument();
  });
});
