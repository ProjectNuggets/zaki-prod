import "@testing-library/jest-dom";
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ZakiSettingsSheet } from "./ZakiSettingsSheet";
import { useAuthStore } from "@/stores";
import {
  connectBotTelegram,
  disconnectBotTelegram,
  fetchBotHeartbeat,
  fetchBotOnboarding,
  fetchBotSettings,
  updateBotHeartbeat,
  updateBotSettings,
} from "@/lib/api";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.defaultValue && typeof options.defaultValue === "string") {
        return options.defaultValue;
      }
      return key;
    },
    i18n: {
      language: "en",
      dir: () => "ltr",
      changeLanguage: jest.fn(async () => undefined),
    },
  }),
}));

jest.mock("@/lib/api", () => ({
  connectBotTelegram: jest.fn(),
  disconnectBotTelegram: jest.fn(),
  fetchBotHeartbeat: jest.fn(),
  fetchBotOnboarding: jest.fn(),
  fetchBotSettings: jest.fn(),
  fetchBotUsage: jest.fn().mockResolvedValue({
    response: { ok: true, status: 200 },
    data: { state: "normal", requests_day: 0, tokens_day: 0, tokens_month: 0 },
  }),
  updateBotHeartbeat: jest.fn(),
  updateBotSettings: jest.fn(),
}));

jest.mock("@/stores", () => ({
  useAuthStore: jest.fn(),
}));

function TestHarness() {
  return <ZakiSettingsSheet isOpen onClose={jest.fn()} />;
}

describe("ZakiSettingsSheet", () => {
  let authState: { user: { username: string } | null; isLoading: boolean };

  beforeEach(() => {
    jest.clearAllMocks();
    authState = { user: { username: "nova@test.com" }, isLoading: false };
    (useAuthStore as unknown as jest.Mock).mockImplementation(
      (
        selector?: (state: { user: { username: string } | null; isLoading: boolean }) => unknown
      ) => (selector ? selector(authState) : authState)
    );

    (fetchBotOnboarding as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: {
        completed: true,
        completed_at_s: 1760000000,
        can_start_chat_now: true,
        minimum_required: [],
        setup: {
          guidance: {
            summary: "Everything is connected.",
          },
          channels: {
            telegram: {
              status: "connected",
              bot_username: "@zaki_bot",
              webhook_base_url: "https://zaki.example.com",
              allow_from: ["12345"],
            },
          },
        },
      },
    });

    (fetchBotSettings as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: {
        assistant_mode: "balanced",
        group_activation: "mention",
        proactive_updates: true,
        voice_replies: false,
        session_timeout_minutes: 30,
      },
    });

    (fetchBotHeartbeat as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: { enabled: true },
    });

    (updateBotSettings as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: {
        assistant_mode: "deep",
        group_activation: "always",
        proactive_updates: false,
        voice_replies: true,
        session_timeout_minutes: 45,
      },
    });

    (connectBotTelegram as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: { status: "connected", channel: "telegram" },
    });

    (disconnectBotTelegram as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: { status: "disconnected", channel: "telegram" },
    });

    (updateBotHeartbeat as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: { enabled: false },
    });
  });

  it("renders overview, assistant, telegram, and autonomy sections", async () => {
    render(<TestHarness />);

    expect(await screen.findByText("zakiSettingsSheet.title")).toBeInTheDocument();
    expect(screen.getByText("zakiSettingsSheet.sections.overview.title")).toBeInTheDocument();
    expect(screen.getByText("zakiSettingsSheet.sections.assistant.title")).toBeInTheDocument();
    expect(screen.getByText("zakiSettingsSheet.sections.telegram.title")).toBeInTheDocument();
    expect(screen.getByText("zakiSettingsSheet.sections.autonomy.title")).toBeInTheDocument();
  });

  it("reads Telegram status from setup.channel_guides when channels are not present", async () => {
    (fetchBotOnboarding as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: {
        completed: false,
        completed_at_s: null,
        setup: {
          can_start_chat_now: true,
          minimum_required: [],
          channel_guides: {
            telegram: {
              status: "connected",
              connected: true,
              webhook_url: "https://zaki.example.com/webhook/telegram?user_id=42",
            },
          },
        },
      },
    });

    render(<TestHarness />);

    expect(await screen.findByText("zakiSettingsSheet.workspace.channelStatus.connected")).toBeInTheDocument();
    expect(screen.getByText("zakiSettingsSheet.overview.readyToStart")).toBeInTheDocument();
  });

  it("waits for auth readiness before loading settings state", async () => {
    authState = { user: { username: "nova@test.com" }, isLoading: true };

    const view = render(<TestHarness />);

    await screen.findByText("zakiSettingsSheet.loading.state");
    expect(fetchBotOnboarding).not.toHaveBeenCalled();
    expect(fetchBotSettings).not.toHaveBeenCalled();
    expect(fetchBotHeartbeat).not.toHaveBeenCalled();

    authState = { user: { username: "nova@test.com" }, isLoading: false };
    view.rerender(<TestHarness />);

    await waitFor(() => {
      expect(fetchBotOnboarding).toHaveBeenCalled();
      expect(fetchBotSettings).toHaveBeenCalled();
      expect(fetchBotHeartbeat).toHaveBeenCalled();
    });
  });

  it("shows the assistant controls and save action", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await screen.findByText("zakiSettingsSheet.title");
    await user.click(screen.getByRole("button", { name: /zakiSettingsSheet.sections.assistant.title/i }));
    await waitFor(() => {
      expect(screen.getByLabelText("zakiSettingsSheet.fields.responseStyle.title")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("zakiSettingsSheet.fields.joinBehavior.title")).toBeInTheDocument();
    expect(screen.getByLabelText("zakiSettingsSheet.fields.proactiveUpdates.title")).toBeInTheDocument();
    expect(screen.getByLabelText("zakiSettingsSheet.fields.voiceReplies.title")).toBeInTheDocument();
    expect(screen.getByLabelText("zakiSettingsSheet.fields.sessionWindow.title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "zakiSettingsSheet.footer.saveAssistant" })).toBeEnabled();
    expect(updateBotSettings).not.toHaveBeenCalled();
  });

  it("allows Telegram connect without allow_from in the normal flow", async () => {
    (fetchBotOnboarding as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: {
        completed: false,
        completed_at_s: null,
        can_start_chat_now: false,
        minimum_required: ["telegram"],
        setup: {
          channels: {
            telegram: {
              status: "disconnected",
            },
          },
        },
      },
    });

    const user = userEvent.setup();
    render(<TestHarness />);

    await screen.findByText("zakiSettingsSheet.workspace.channelStatus.notConnected");
    await user.click(screen.getByRole("button", { name: /zakiSettingsSheet.sections.telegram.title/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "zakiSettingsSheet.actions.connectTelegram" })).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText("zakiSettingsSheet.telegram.botTokenLabel"), "123:abc");
    await user.click(
      screen.getByRole("button", {
        name: /zakiSettingsSheet\.actions\.(connectTelegram|reconnectTelegram)/i,
      })
    );

    await waitFor(() => {
      expect(connectBotTelegram).toHaveBeenCalledWith({
        bot_token: "123:abc",
      });
    });
  });

  it("disables voice replies and heartbeat when Telegram is disconnected", async () => {
    (fetchBotOnboarding as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: {
        completed: false,
        completed_at_s: null,
        can_start_chat_now: false,
        minimum_required: ["telegram"],
        setup: {
          channels: {
            telegram: {
              status: "disconnected",
            },
          },
        },
      },
    });

    render(<TestHarness />);
    await screen.findByText("zakiSettingsSheet.workspace.channelStatus.notConnected");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /zakiSettingsSheet.sections.assistant.title/i }));
    await waitFor(() => {
      expect(screen.getByLabelText("zakiSettingsSheet.fields.voiceReplies.title")).toBeDisabled();
    });
    expect(screen.getByLabelText("zakiSettingsSheet.fields.voiceReplies.title")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /zakiSettingsSheet.sections.autonomy.title/i }));
    expect(screen.getByLabelText("zakiSettingsSheet.autonomy.heartbeatTitle")).toBeDisabled();
  });

  it("toggles heartbeat through the separate endpoint", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await screen.findByText("zakiSettingsSheet.title");
    await user.click(screen.getByRole("button", { name: /zakiSettingsSheet.sections.autonomy.title/i }));
    await waitFor(() => {
      expect(screen.getByLabelText("zakiSettingsSheet.autonomy.heartbeatTitle")).toBeInTheDocument();
    });
    await user.click(screen.getByLabelText("zakiSettingsSheet.autonomy.heartbeatTitle"));

    await waitFor(() => {
      expect(updateBotHeartbeat).toHaveBeenCalledWith({ enabled: false });
    });
  });

  it("opens the telegram section first when Telegram is disconnected", async () => {
    (fetchBotOnboarding as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: {
        completed: false,
        completed_at_s: null,
        can_start_chat_now: false,
        minimum_required: ["telegram"],
        setup: {
          channels: {
            telegram: {
              status: "disconnected",
            },
          },
        },
      },
    });

    render(<TestHarness />);

    await screen.findByText("zakiSettingsSheet.workspace.channelStatus.notConnected");
    expect(screen.getByLabelText("zakiSettingsSheet.telegram.botTokenLabel")).toBeInTheDocument();
  });

  it("only shows Telegram success after onboarding confirms a real connected state", async () => {
    let onboardingCalls = 0;
    (fetchBotOnboarding as unknown as jest.Mock).mockImplementation(async () => {
      onboardingCalls += 1;
      return onboardingCalls === 1
        ? {
            response: { ok: true },
            data: {
              completed: false,
              completed_at_s: null,
              can_start_chat_now: false,
              minimum_required: ["telegram"],
              setup: {
                channels: {
                  telegram: {
                    status: "disconnected",
                  },
                },
              },
            },
          }
        : {
            response: { ok: true },
            data: {
              completed: true,
              completed_at_s: 1760000000,
              can_start_chat_now: true,
              minimum_required: [],
              setup: {
                channels: {
                  telegram: {
                    status: "connected",
                    webhook_url: "https://agent.zaki.test/webhook/telegram?user_id=1",
                    allow_from: ["12345"],
                  },
                },
              },
            },
          };
    });

    const user = userEvent.setup();
    render(<TestHarness />);

    await screen.findByText("zakiSettingsSheet.workspace.channelStatus.notConnected");
    await user.clear(screen.getByLabelText("zakiSettingsSheet.telegram.allowFromLabel"));
    await user.type(screen.getByLabelText("zakiSettingsSheet.telegram.botTokenLabel"), "123456:ABC");
    await user.type(screen.getByLabelText("zakiSettingsSheet.telegram.allowFromLabel"), "12345");
    await user.click(
      screen.getByRole("button", {
        name: /zakiSettingsSheet\.actions\.(connectTelegram|reconnectTelegram)/i,
      })
    );

    await waitFor(() => {
      expect(connectBotTelegram).toHaveBeenCalled();
    });

    expect(await screen.findByText("zakiSettingsSheet.workspace.channelStatus.connected")).toBeInTheDocument();
  });

  it("does not claim Telegram is connected when the post-connect refresh still shows disconnected", async () => {
    (fetchBotOnboarding as unknown as jest.Mock).mockImplementation(async () => ({
      response: { ok: true },
      data: {
        completed: false,
        completed_at_s: null,
        can_start_chat_now: false,
        minimum_required: ["telegram"],
        setup: {
          channels: {
            telegram: {
              status: "disconnected",
            },
          },
        },
      },
    }));

    const user = userEvent.setup();
    render(<TestHarness />);

    await screen.findByText("zakiSettingsSheet.workspace.channelStatus.notConnected");
    await user.clear(screen.getByLabelText("zakiSettingsSheet.telegram.allowFromLabel"));
    await user.type(screen.getByLabelText("zakiSettingsSheet.telegram.botTokenLabel"), "123456:ABC");
    await user.type(screen.getByLabelText("zakiSettingsSheet.telegram.allowFromLabel"), "12345");
    await user.click(
      screen.getByRole("button", {
        name: /zakiSettingsSheet\.actions\.(connectTelegram|reconnectTelegram)/i,
      })
    );

    await waitFor(
      () => {
        expect(connectBotTelegram).toHaveBeenCalled();
        expect((fetchBotOnboarding as unknown as jest.Mock).mock.calls.length).toBeGreaterThan(1);
      },
      { timeout: 5000 }
    );
    expect(screen.queryByText("zakiSettingsSheet.success.telegramConnected")).not.toBeInTheDocument();
  }, 10000);

  it("does not claim Telegram is connected when webhook prerequisites are missing", async () => {
    (fetchBotOnboarding as unknown as jest.Mock).mockImplementation(async () => ({
      response: { ok: true },
      data: {
        completed: false,
        completed_at_s: null,
        can_start_chat_now: false,
        minimum_required: ["telegram"],
        setup: {
          channels: {
            telegram: {
              status: "disconnected",
            },
          },
        },
      },
    }));
    (connectBotTelegram as unknown as jest.Mock).mockResolvedValueOnce({
      response: { ok: false },
      data: {
        error: "missing webhook_base_url",
        message:
          "Webhook base URL is not configured. Ask the operator to configure ZAKI_AGENT_WEBHOOK_BASE_URL or enter a valid https:// webhook base URL.",
      },
    });

    const user = userEvent.setup();
    render(<TestHarness />);

    await screen.findByText("zakiSettingsSheet.workspace.channelStatus.notConnected");
    await user.clear(screen.getByLabelText("zakiSettingsSheet.telegram.allowFromLabel"));
    await user.type(screen.getByLabelText("zakiSettingsSheet.telegram.botTokenLabel"), "123456:ABC");
    await user.type(screen.getByLabelText("zakiSettingsSheet.telegram.allowFromLabel"), "12345");
    await user.click(
      screen.getByRole("button", {
        name: /zakiSettingsSheet\.actions\.(connectTelegram|reconnectTelegram)/i,
      })
    );

    await waitFor(() => {
      expect(connectBotTelegram).toHaveBeenCalled();
    });
    expect(screen.queryByText("zakiSettingsSheet.success.telegramConnected")).not.toBeInTheDocument();
  });

});
