import "@testing-library/jest-dom";
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ZakiSettingsSheet } from "./ZakiSettingsSheet";
import {
  connectBotTelegram,
  disconnectBotTelegram,
  fetchBotOnboarding,
  fetchBotSettings,
  fetchBotUsage,
  provisionBot,
  updateBotOnboarding,
  updateBotSettings,
} from "@/lib/api";

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue || key,
    i18n: {
      language: "en",
      dir: () => "ltr",
      changeLanguage: jest.fn(async () => undefined),
    },
  }),
}));

jest.mock("@/queries", () => ({
  useEntitlements: () => ({
    data: null,
  }),
  useDeleteAccount: () => ({
    isPending: false,
    mutateAsync: jest.fn(async () => undefined),
  }),
}));

jest.mock("@/lib/api", () => ({
  connectBotTelegram: jest.fn(),
  disconnectBotTelegram: jest.fn(),
  exportAccountData: jest.fn(),
  fetchBotOnboarding: jest.fn(),
  fetchBotSettings: jest.fn(),
  fetchBotUsage: jest.fn(),
  provisionBot: jest.fn(),
  updateBotOnboarding: jest.fn(),
  updateBotSettings: jest.fn(),
}));

function TestHarness() {
  return (
    <ZakiSettingsSheet
      isOpen
      onClose={jest.fn()}
    />
  );
}

describe("ZakiSettingsSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchBotOnboarding as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: {
        completed: true,
        completed_at_s: 1760000000,
        setup: {
          guidance: {
            summary: "Finish channels to complete your bot setup.",
          },
          channels: {
            telegram: {
              status: "connected",
              bot_username: "@zaki_bot",
            },
            slack: {
              instructions: ["Open Slack", "Add the app", "Authorize the workspace"],
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

    (fetchBotUsage as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: {
        state: "normal",
        requests_day: 4,
        tokens_day: 0,
        tokens_month: 0,
      },
    });

    (provisionBot as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: { status: "provisioned" },
    });

    (updateBotOnboarding as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: {
        completed: true,
        completed_at_s: 1760000000,
        setup: null,
      },
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
  });

  it("renders the minimized settings surface with all sections collapsed by default", async () => {
    render(<TestHarness />);

    expect(await screen.findByText("zakiSettingsSheet.title")).toBeInTheDocument();
    expect(screen.getByText("zakiSettingsSheet.sections.core.title")).toBeInTheDocument();
    expect(screen.getByText("zakiSettingsSheet.sections.workspace.title")).toBeInTheDocument();
    expect(screen.queryByText("zakiSettingsSheet.sections.limits.title")).not.toBeInTheDocument();
    expect(screen.queryByText("zakiSettingsSheet.sections.advanced.title")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("zakiSettingsSheet.fields.responseStyle.title")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("zakiSettingsSheet.workspace.telegramToken")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("settingsModal.profile.displayName")).not.toBeInTheDocument();
  });

  it("shows the locked end-user note and disables core behavior edits", async () => {
    render(<TestHarness />);

    await screen.findByText("zakiSettingsSheet.title");
    expect(screen.getByText("zakiSettingsSheet.locked.note")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /zakiSettingsSheet.sections.core.title/i }));

    expect(screen.getByLabelText("zakiSettingsSheet.fields.responseStyle.title")).toBeDisabled();
    expect(screen.getByLabelText("zakiSettingsSheet.fields.joinBehavior.title")).toBeDisabled();
    expect(screen.getByLabelText("zakiSettingsSheet.fields.sessionWindow.title")).toBeDisabled();
    expect(screen.getByLabelText("zakiSettingsSheet.fields.proactiveUpdates.title")).toBeDisabled();
    expect(screen.getByLabelText("zakiSettingsSheet.fields.voiceReplies.title")).toBeDisabled();
    expect(screen.getByRole("button", { name: "settingsModal.footer.saveChanges" })).toBeDisabled();
    expect(updateBotSettings).not.toHaveBeenCalled();
  });

  it("shows channel controls as coming soon for end users", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await screen.findByText("zakiSettingsSheet.title");

    await user.click(screen.getByRole("button", { name: /zakiSettingsSheet.sections.workspace.title/i }));
    expect(screen.getAllByRole("button", { name: "zakiSettingsSheet.actions.comingSoon" })).toHaveLength(3);
    expect(screen.queryByPlaceholderText("zakiSettingsSheet.workspace.telegramToken")).not.toBeInTheDocument();
    expect(screen.queryByText("Open Slack")).not.toBeInTheDocument();
  });

  it("shows load-specific copy when settings fail to load for an unknown bot user", async () => {
    (fetchBotSettings as unknown as jest.Mock).mockResolvedValueOnce({
      response: { ok: false },
      data: {
        error: "settings_update_failed",
        message: "unknown_user_id",
      },
    });

    render(<TestHarness />);

    expect(await screen.findByText("zakiSettingsSheet.errors.botStateUnavailableUnknownUser")).toBeInTheDocument();
    expect(screen.queryByText("We could not save your ZAKI BOT settings.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "settingsModal.footer.saveChanges" })).toBeDisabled();
  });

  it("shows onboarding load copy for generic onboarding fetch failures", async () => {
    (fetchBotOnboarding as unknown as jest.Mock).mockResolvedValueOnce({
      response: { ok: false },
      data: {
        error: "unexpected_failure",
      },
    });

    render(<TestHarness />);

    expect(await screen.findByText("zakiSettingsSheet.errors.onboardingLoad")).toBeInTheDocument();
  });
});
