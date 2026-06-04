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

    expect(container.querySelector(".zaki-streaming-caret")).not.toBeNull();
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

  it("renders assistant markdown tables with desktop and mobile layouts", () => {
    const { container } = render(
      <MessageContent
        role="assistant"
        content={"| Plan | Price | Notes |\n| --- | --- | --- |\n| Personal | $13 / month | Best for ongoing work |\n| Student | $8 / month | Use your .edu email |"}
      />,
    );

    const desktopTable = screen.getByTestId("message-table-desktop");
    const mobileCards = screen.getByTestId("message-table-mobile");

    expect(desktopTable).toHaveClass("hidden", "sm:block");
    expect(mobileCards).toHaveClass("sm:hidden");
    expect(container.querySelector("table")).not.toBeNull();
    expect(screen.getAllByText("Plan").length).toBeGreaterThan(1);
    expect(screen.getAllByText("$13 / month").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Best for ongoing work").length).toBeGreaterThan(0);
  });

  it("preserves links, inline code, and long prose in table cells", () => {
    render(
      <MessageContent
        role="assistant"
        content={
          "| Item | Details |\n| --- | --- |\n| Link | Visit [docs](https://example.com/docs) and run `npm run dev` |\n| Notes | This is a longer sentence that should wrap naturally instead of collapsing into unreadable narrow columns on mobile. |"
        }
      />,
    );

    expect(screen.getAllByRole("link", { name: "docs" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("npm run dev").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "This is a longer sentence that should wrap naturally instead of collapsing into unreadable narrow columns on mobile.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("renders plain email addresses as mail links", () => {
    render(
      <MessageContent
        role="assistant"
        content="Send the signed copy to alaa@example.com."
      />,
    );

    expect(screen.getByRole("link", { name: "alaa@example.com" })).toHaveAttribute(
      "href",
      "mailto:alaa@example.com",
    );
  });

  it("renders email drafts with structured fields and body", () => {
    render(
      <MessageContent
        role="assistant"
        content={"To: alaa@example.com\nSubject: Launch update\n\nHi Alaa,\n\nThe report is attached."}
      />,
    );

    expect(screen.getByTestId("message-email-draft")).toHaveTextContent("Email draft");
    expect(screen.getByTestId("message-email-draft")).toHaveTextContent("Subject");
    expect(screen.getByRole("link", { name: "alaa@example.com" })).toHaveAttribute(
      "href",
      "mailto:alaa@example.com",
    );
    expect(screen.getByText("The report is attached.")).toBeInTheDocument();
  });
});
