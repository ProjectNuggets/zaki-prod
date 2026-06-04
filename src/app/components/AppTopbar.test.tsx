import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppTopbar } from "./AppTopbar";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  }),
}));

describe("AppTopbar", () => {
  it("exposes Agent focus and panel controls only on the Agent route", () => {
    const focusHandler = jest.fn();
    const panelHandler = jest.fn();
    const shareHandler = jest.fn();
    const memoryHandler = jest.fn();
    const exportHandler = jest.fn();
    window.addEventListener("zaki:toggle-agent-focus", focusHandler);
    window.addEventListener("zaki:toggle-agent-panel", panelHandler);
    window.addEventListener("zaki:agent-share", shareHandler);
    window.addEventListener("zaki:agent-review-memories", memoryHandler);
    window.addEventListener("zaki:agent-export", exportHandler);

    try {
      render(
        <MemoryRouter initialEntries={["/agent"]}>
          <AppTopbar />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId("agent-focus-toggle"));
      fireEvent.click(screen.getByTestId("agent-inspector-toggle"));
      fireEvent.click(screen.getByTestId("agent-share-toggle"));
      fireEvent.click(screen.getByTestId("agent-more-toggle"));
      fireEvent.click(screen.getByRole("menuitem", { name: "Review memories" }));
      fireEvent.click(screen.getByTestId("agent-more-toggle"));
      fireEvent.click(screen.getByRole("menuitem", { name: "Export JSON" }));

      expect(focusHandler).toHaveBeenCalledTimes(1);
      expect(panelHandler).toHaveBeenCalledTimes(1);
      expect(shareHandler).toHaveBeenCalledTimes(1);
      expect(memoryHandler).toHaveBeenCalledTimes(1);
      expect(exportHandler).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/Stage/i)).not.toBeInTheDocument();
    } finally {
      window.removeEventListener("zaki:toggle-agent-focus", focusHandler);
      window.removeEventListener("zaki:toggle-agent-panel", panelHandler);
      window.removeEventListener("zaki:agent-share", shareHandler);
      window.removeEventListener("zaki:agent-review-memories", memoryHandler);
      window.removeEventListener("zaki:agent-export", exportHandler);
    }
  });

  it("keeps non-Agent routes free of Agent-only chrome", () => {
    render(
      <MemoryRouter initialEntries={["/brain"]}>
        <AppTopbar />
      </MemoryRouter>
    );

    expect(screen.queryByTestId("agent-focus-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-inspector-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-share-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-more-toggle")).not.toBeInTheDocument();
  });
});
