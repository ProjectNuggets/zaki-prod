import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginScreen } from "./LoginScreen";
import { useAuthStore } from "@/stores";
import {
  requestPublicSignup,
  requestLogin,
  requestPasswordReset,
  confirmPasswordReset,
  redeemAccessCode,
  fetchLegalConsentStatus,
} from "@/lib/api";

jest.mock("@/stores", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/lib/api", () => ({
  requestPublicSignup: jest.fn(),
  requestLogin: jest.fn(),
  requestPasswordReset: jest.fn(),
  confirmPasswordReset: jest.fn(),
  redeemAccessCode: jest.fn(),
  fetchLegalConsentStatus: jest.fn(),
}));

describe("LoginScreen legal consent", () => {
  const setToken = jest.fn();
  const policyVersion = "2027-01-01.v2";

  beforeEach(() => {
    jest.clearAllMocks();

    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      setToken,
    });

    (fetchLegalConsentStatus as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: { success: true, policyVersion },
    });

    (requestLogin as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: { valid: true, token: "token-123" },
    });

    (requestPublicSignup as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: { success: true, message: "Check your email to verify your account." },
    });

    (requestPasswordReset as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: { success: true, message: "If the account exists, a reset link has been sent." },
    });

    (confirmPasswordReset as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: { success: true, message: "Password updated. You can sign in now." },
    });

    (redeemAccessCode as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: { success: true },
    });
  });

  it("requires consent checkbox and sends consent payload on login", async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    expect(screen.queryByText(new RegExp(`policy\\s+${policyVersion}`))).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms, Privacy & Compliance" })).toHaveAttribute(
      "href",
      "/legal"
    );

    await user.type(screen.getByPlaceholderText("Email address"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");

    const signInButton = screen.getByRole("button", { name: "Sign in" });
    expect(signInButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(signInButton).toBeEnabled();

    await user.click(signInButton);

    await waitFor(() => {
      expect(requestLogin).toHaveBeenCalledWith({
        username: "user@example.com",
        password: "Password123",
        legalConsentAccepted: true,
        legalPolicyVersion: policyVersion,
      });
    });
    expect(setToken).toHaveBeenCalledWith("token-123");
  });

  it("requires consent checkbox and sends consent payload on signup", async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.click(screen.getByRole("button", { name: "New here? Create an account" }));

    await user.type(screen.getByPlaceholderText("Full name"), "User Name");
    await user.type(
      screen.getByLabelText("Date of birth"),
      "1995-01-15"
    );
    await user.type(screen.getByPlaceholderText("Email address"), "signup@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "Password123");

    const createButton = screen.getByRole("button", { name: "Create account" });
    expect(createButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(createButton).toBeEnabled();
    await user.click(createButton);

    await waitFor(() => {
      expect(requestPublicSignup).toHaveBeenCalledWith({
        email: "signup@example.com",
        password: "Password123",
        name: "User Name",
        dateOfBirth: "1995-01-15",
        legalConsentAccepted: true,
        legalPolicyVersion: policyVersion,
      });
    });
  });
});
