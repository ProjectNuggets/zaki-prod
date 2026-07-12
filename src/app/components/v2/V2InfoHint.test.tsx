import { fireEvent, render, screen } from "@testing-library/react";
import { V2InfoHint } from "./V2InfoHint";

describe("V2InfoHint", () => {
  it("exposes an accessible (i) trigger and keeps the note closed until asked", () => {
    render(<V2InfoHint triggerLabel="What's this?" note="A plain-language note." />);

    expect(screen.getByRole("button", { name: "What's this?" })).toBeInTheDocument();
    // Closed: the tooltip is hidden and out of the accessibility tree.
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("reveals the note on click and wires aria-describedby", () => {
    render(<V2InfoHint triggerLabel="What's this?" note="A plain-language note." />);
    const trigger = screen.getByRole("button", { name: "What's this?" });

    fireEvent.click(trigger);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("A plain-language note.");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-describedby", tooltip.getAttribute("id"));
  });

  it("reveals the note on keyboard focus and hides it again on blur", () => {
    render(<V2InfoHint triggerLabel="What's this?" note="A plain-language note." />);
    const trigger = screen.getByRole("button", { name: "What's this?" });

    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.blur(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<V2InfoHint triggerLabel="What's this?" note="A plain-language note." />);
    const trigger = screen.getByRole("button", { name: "What's this?" });

    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
