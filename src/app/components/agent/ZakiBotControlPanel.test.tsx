import "@testing-library/jest-dom";
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ZakiBotControlPanel } from "./ZakiBotControlPanel";
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

jest.mock("@/lib/api", () => ({
  connectBotTelegram: jest.fn(),
  disconnectBotTelegram: jest.fn(),
  fetchBotOnboarding: jest.fn(),
  fetchBotSettings: jest.fn(),
  fetchBotUsage: jest.fn(),
  provisionBot: jest.fn(),
  updateBotOnboarding: jest.fn(),
  updateBotSettings: jest.fn(),
}));

describe("ZakiBotControlPanel", () => {
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

  it("renders onboarding setup, settings, channels, and usage states", async () => {
    render(<ZakiBotControlPanel isOpen onClose={jest.fn()} />);

    expect(await screen.findByText("Personal intelligence settings")).toBeInTheDocument();
    expect(
      await screen.findByText(/Finish channels to complete your bot setup\./i)
    ).toBeInTheDocument();
    expect(screen.getByText("Telegram: connected")).toBeInTheDocument();
    expect(screen.getByLabelText(/Assistant mode/i)).toHaveValue("balanced");
    expect(screen.getByText(/Current status: connected/i)).toBeInTheDocument();
    expect(screen.getByText("Requests / day")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("saves the product settings schema without raw config fields", async () => {
    const user = userEvent.setup();
    render(<ZakiBotControlPanel isOpen onClose={jest.fn()} />);

    await screen.findByText("Personal intelligence settings");

    await user.selectOptions(screen.getByLabelText(/Assistant mode/i), "deep");
    await user.selectOptions(screen.getByLabelText(/Group activation/i), "always");
    await user.clear(screen.getByLabelText(/Session timeout \(minutes\)/i));
    await user.type(screen.getByLabelText(/Session timeout \(minutes\)/i), "45");
    await user.click(screen.getByLabelText(/Proactive updates/i));
    await user.click(screen.getByLabelText(/Voice replies/i));
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() => {
      expect(updateBotSettings).toHaveBeenCalledWith({
        assistant_mode: "deep",
        group_activation: "always",
        proactive_updates: false,
        voice_replies: true,
        session_timeout_minutes: 45,
      });
    });
  });

  it("maps invalid telegram token errors to stable user copy", async () => {
    const user = userEvent.setup();
    (connectBotTelegram as unknown as jest.Mock).mockResolvedValueOnce({
      response: { ok: false },
      data: { error: "invalid_telegram_token" },
    });

    render(<ZakiBotControlPanel isOpen onClose={jest.fn()} />);
    await screen.findByText("Personal intelligence settings");

    await user.type(screen.getByPlaceholderText("Telegram bot token"), "bad-token");
    await user.click(screen.getByRole("button", { name: "Connect Telegram" }));

    expect(await screen.findByText("The Telegram token is invalid. Check it and try again.")).toBeInTheDocument();
  });

  it("shows usage unavailable state cleanly", async () => {
    (fetchBotUsage as unknown as jest.Mock).mockResolvedValueOnce({
      response: { ok: false },
      data: { error: "usage_unavailable" },
    });

    render(<ZakiBotControlPanel isOpen onClose={jest.fn()} />);

    expect(await screen.findByText(/Usage is temporarily unavailable/i)).toBeInTheDocument();
  });

  it("falls back to later setup step arrays when instructions is empty", async () => {
    (fetchBotOnboarding as unknown as jest.Mock).mockResolvedValueOnce({
      response: { ok: true },
      data: {
        completed: false,
        completed_at_s: null,
        setup: {
          channels: {
            slack: {
              instructions: [],
              steps: ["Open Slack", "Install the app", "Authorize access"],
            },
          },
        },
      },
    });

    render(<ZakiBotControlPanel isOpen onClose={jest.fn()} />);

    expect(await screen.findByText("Install the app")).toBeInTheDocument();
  });
});
