import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MessageContent } from "./MessageContent";

describe("MessageContent", () => {
  it("renders prose and headings with assistant structure", () => {
    render(
      <MessageContent
        role="assistant"
        content={"Intro paragraph.\n\n## Key points\n\n- First\n- Second"}
      />,
    );

    expect(screen.getByText("Intro paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Key points")).toBeInTheDocument();
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("renders a streaming cursor when assistant content is still streaming", () => {
    const { container } = render(
      <MessageContent role="assistant" content={"Working"} streaming />,
    );

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("preserves structured formatting for shared user content when requested", () => {
    render(
      <MessageContent
        role="user"
        surface="shared"
        preserveUserFormatting
        content={"Line one.\n\n- First\n- Second"}
      />,
    );

    expect(screen.getByText("Line one.")).toBeInTheDocument();
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("keeps standard user content in compact plain-text mode by default", () => {
    const { container } = render(<MessageContent role="user" content={"Line one.\n- stays plain"} />);

    expect(container.firstChild).toHaveTextContent("Line one.");
    expect(container.firstChild).toHaveTextContent("- stays plain");
    expect(container.querySelector("ul, ol, blockquote, pre")).toBeNull();
  });
});
