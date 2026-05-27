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
    window.addEventListener("zaki:toggle-agent-focus", focusHandler);
    window.addEventListener("zaki:toggle-agent-panel", panelHandler);

    try {
      render(
        <MemoryRouter initialEntries={["/agent"]}>
          <AppTopbar />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId("agent-focus-toggle"));
      fireEvent.click(screen.getByTestId("agent-inspector-toggle"));

      expect(focusHandler).toHaveBeenCalledTimes(1);
      expect(panelHandler).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener("zaki:toggle-agent-focus", focusHandler);
      window.removeEventListener("zaki:toggle-agent-panel", panelHandler);
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
  });
});
