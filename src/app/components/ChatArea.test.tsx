/**
 * ChatArea Component Tests
 * Focused smoke tests aligned with current ChatArea architecture.
 */

import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { ChatArea } from "./ChatArea";
import { useNavigationStore, useAuthStore } from "@/stores";
import { useMessages } from "@/queries/useThreads";

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
  })),
}));

jest.mock("@/stores", () => ({
  useNavigationStore: jest.fn(),
  useAuthStore: jest.fn(),
}));

jest.mock("@/queries/useThreads", () => ({
  useMessages: jest.fn(),
}));

jest.mock("@/queries", () => ({
  useEntitlements: () => ({
    data: {
      data: {
        plan: { tier: "free", status: "inactive" },
      },
    },
  }),
  useCheckout: () => ({
    mutateAsync: jest.fn(),
  }),
  useBillingPortal: () => ({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { returnObjects?: boolean }) =>
      options?.returnObjects ? [key] : key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

type NavState = {
  view: "home" | "spaces" | "library" | "space-detail" | "chat";
  spaceId: string | null;
  threadId: string | null;
  goHome: () => void;
  goToSpaces: () => void;
  goToLibrary: () => void;
  goToSpace: (spaceId: string) => void;
  goToThread: (spaceId: string, threadId: string) => void;
  clearThread: () => void;
};

describe("ChatArea Component", () => {
  let navState: NavState;

  beforeEach(() => {
    navState = {
      view: "chat",
      spaceId: null,
      threadId: null,
      goHome: jest.fn(),
      goToSpaces: jest.fn(),
      goToLibrary: jest.fn(),
      goToSpace: jest.fn(),
      goToThread: jest.fn(),
      clearThread: jest.fn(),
    };

    (useNavigationStore as jest.Mock).mockImplementation((selector?: (state: NavState) => unknown) =>
      selector ? selector(navState) : navState
    );

    (useAuthStore as jest.Mock).mockImplementation((selector?: (state: { user: { username: string } }) => unknown) => {
      const state = { user: { username: "test@example.com" } };
      return selector ? selector(state) : state;
    });

    (useMessages as jest.Mock).mockReturnValue({ data: [], isLoading: false });
  });

  it("renders ready state for a new chat", () => {
    navState.view = "chat";
    navState.threadId = null;

    render(<ChatArea />);

    expect(screen.getByText("empty.headline")).toBeInTheDocument();
  });

  it("renders ZAKI home view when view=home", () => {
    navState.view = "home";

    render(<ChatArea />);

    expect(screen.getByText("home.quickStartLabel")).toBeInTheDocument();
  });

  it("renders loaded messages for an active thread", async () => {
    navState.view = "chat";
    navState.spaceId = "space-1";
    navState.threadId = "thread-1";

    (useMessages as jest.Mock).mockReturnValue({
      data: [{ id: "m1", role: "assistant", content: "Hello from history" }],
      isLoading: false,
    });

    render(<ChatArea />);

    await waitFor(() => {
      expect(screen.getByText("Hello from history")).toBeInTheDocument();
    });
  });
});
