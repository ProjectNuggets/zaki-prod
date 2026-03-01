/**
 * ChatArea Component Tests
 * Focused smoke tests aligned with current ChatArea architecture.
 */

import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ChatArea } from "./ChatArea";
import { useNavigationStore, useAuthStore } from "@/stores";
import { useMessages } from "@/queries/useThreads";
import { apiRequest } from "@/lib/api";

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
  view: "home" | "spaces" | "space-detail" | "chat";
  spaceId: string | null;
  threadId: string | null;
  goHome: () => void;
  goToSpaces: () => void;
  goToSpace: (spaceId: string) => void;
  goToThread: (spaceId: string, threadId: string) => void;
  clearThread: () => void;
};

function renderChatArea() {
  return render(
    <MemoryRouter>
      <ChatArea />
    </MemoryRouter>
  );
}

async function renderChatAreaAndWaitForEffects() {
  const result = renderChatArea();
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/api/documents/accepted-file-types"));
  return result;
}

describe("ChatArea Component", () => {
  let navState: NavState;

  beforeEach(() => {
    (apiRequest as jest.Mock).mockClear();
    navState = {
      view: "chat",
      spaceId: null,
      threadId: null,
      goHome: jest.fn(),
      goToSpaces: jest.fn(),
      goToSpace: jest.fn(),
      goToThread: jest.fn(),
      clearThread: jest.fn(),
    };

    (useNavigationStore as jest.Mock).mockImplementation((selector?: (state: NavState) => unknown) =>
      selector ? selector(navState) : navState
    );

    (useAuthStore as jest.Mock).mockImplementation((selector?: (state: { user: { username: string } | null }) => unknown) => {
      const state = { user: null };
      return selector ? selector(state) : state;
    });

    (useMessages as jest.Mock).mockReturnValue({ data: [], isLoading: false });
  });

  it("renders ready state for a new chat", async () => {
    navState.view = "chat";
    navState.threadId = null;

    await renderChatAreaAndWaitForEffects();

    expect(screen.getByText("empty.headline")).toBeInTheDocument();
  });

  it("renders ZAKI home view when view=home", async () => {
    navState.view = "home";

    await renderChatAreaAndWaitForEffects();

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

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(screen.getByText("Hello from history")).toBeInTheDocument();
    });
  });

  it("strips versioned injected memory envelope from user history messages", async () => {
    navState.view = "chat";
    navState.spaceId = "space-1";
    navState.threadId = "thread-1";

    (useMessages as jest.Mock).mockReturnValue({
      data: [
        {
          id: "m1",
          role: "user",
          content:
            "[[ZAKI_MEMORY_CONTEXT_V2]]\nAbout this person:\n- Likes tea\n[[/ZAKI_MEMORY_CONTEXT_V2]]\nWhat should I do today?",
        },
      ],
      isLoading: false,
    });

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(screen.getByText("What should I do today?")).toBeInTheDocument();
    });
    expect(screen.queryByText("[[ZAKI_MEMORY_CONTEXT_V2]]")).not.toBeInTheDocument();
  });
});
