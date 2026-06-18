import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { hasExplicitPricingIntent, LoginScreen } from "./LoginScreen";
import { useAuthStore } from "@/stores";
import {
  requestPublicSignup,
  requestLogin,
  requestPasswordReset,
  confirmPasswordReset,
  redeemAccessCode,
  fetchLegalConsentStatus,
  fetchGoogleOAuthStatus,
  fetchCurrentUser,
  fetchProfile,
  buildGoogleOAuthStartUrl,
} from "@/lib/api";
import { PENDING_INTENT_KEY } from "@/lib/pendingIntent";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

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
  fetchGoogleOAuthStatus: jest.fn(),
  fetchCurrentUser: jest.fn(),
  fetchProfile: jest.fn(),
  buildGoogleOAuthStartUrl: jest.fn(() => "http://localhost:8787/api/auth/google/start"),
}));

describe("LoginScreen legal consent", () => {
  const setToken = jest.fn();
  const setUser = jest.fn();
  const policyVersion = "2027-01-01.v2";

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, "", "/");
    window.sessionStorage.clear();
    window.localStorage.clear();

    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      setToken,
      setUser,
    });

    (fetchLegalConsentStatus as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: { success: true, policyVersion },
    });

    (fetchGoogleOAuthStatus as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: { success: true, enabled: true },
    });

    (fetchCurrentUser as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: {
        success: true,
        user: { id: "user-1", username: "user@example.com", fullName: null },
      },
    });

    (fetchProfile as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: {
        success: true,
        user: { username: "user@example.com", fullName: "User Name" },
      },
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

  const renderLoginScreen = () =>
    render(
      <BrowserRouter>
        <LoginScreen />
      </BrowserRouter>
    );

  it("shows verification success notice from redirect query params", async () => {
    window.history.replaceState({}, "", "/?auth=login&verified=success");
    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());
    expect(
      await screen.findByText("Email verified successfully. You can sign in now.")
    ).toBeInTheDocument();
  });

  it("opens signup mode from auth=signup query params", async () => {
    window.history.replaceState({}, "", "/pricing?auth=signup&plan=student&interval=yearly");
    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    expect(await screen.findByRole("heading", { name: "Create a ZAKI account" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("does not require consent checkbox on login and sends auth payload only", async () => {
    const user = userEvent.setup();
    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    expect(screen.queryByText(new RegExp(`policy\\s+${policyVersion}`))).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Terms, Privacy & Compliance" })).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Email address"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");

    const signInButton = screen.getByRole("button", { name: "Sign in" });
    expect(signInButton).toBeEnabled();
    await user.click(signInButton);

    await waitFor(() => {
      expect(requestLogin).toHaveBeenCalledWith({
        username: "user@example.com",
        password: "Password123",
      });
    });
    expect(setToken).toHaveBeenCalledWith("token-123");
    expect(setUser).toHaveBeenCalledWith({
      id: "user-1",
      username: "user@example.com",
      fullName: "User Name",
    });
  });

  it("requires consent checkbox and sends consent payload on signup", async () => {
    const user = userEvent.setup();
    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "New here? Create an account" }));

    await user.type(screen.getByPlaceholderText("Full name"), "User Name");
    await user.type(
      screen.getByLabelText("Date of birth"),
      "1995-01-15"
    );
    await user.type(screen.getByPlaceholderText("Email address"), "signup@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "Password123");

    const legalLink = screen.getByRole("link", { name: "Terms, Privacy & Compliance" });
    expect(legalLink).toHaveAttribute("href", "https://chatzaki.com/terms?from=signup");
    expect(legalLink).toHaveAttribute("target", "_blank");
    expect(legalLink).toHaveAttribute("rel", "noopener noreferrer");

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

  it("blocks signup when confirmation password does not match", async () => {
    const user = userEvent.setup();
    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "New here? Create an account" }));
    await user.type(screen.getByPlaceholderText("Full name"), "User Name");
    await user.type(screen.getByLabelText("Date of birth"), "1995-01-15");
    await user.type(screen.getByPlaceholderText("Email address"), "signup@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "Password456");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(requestPublicSignup).not.toHaveBeenCalled();
  });

  it("submits a reset-link request and shows the reset notice", async () => {
    const user = userEvent.setup();
    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Forgot password?" }));
    await user.type(screen.getByPlaceholderText("Email address"), "reset@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith("reset@example.com");
    });
    expect(
      await screen.findByText("If the account exists, a reset link has been sent.")
    ).toBeInTheDocument();
  });

  it("submits reset confirmation when a reset token is present", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/reset?token=reset-token-123");

    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText("New password"), "Password123");
    await user.type(screen.getByPlaceholderText("Confirm new password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => {
      expect(confirmPasswordReset).toHaveBeenCalledWith({
        token: "reset-token-123",
        password: "Password123",
      });
    });
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("redirects generic pricing-route auth back to home after login", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/pricing?auth=signup&source=website_nav");

    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Have an account? Sign in" }));
    await user.type(screen.getByPlaceholderText("Email address"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(setToken).toHaveBeenCalledWith("token-123");
    });
    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
  });

  it("shows upstream auth errors instead of generic credential copy", async () => {
    const user = userEvent.setup();
    (requestLogin as unknown as jest.Mock).mockResolvedValueOnce({
      response: { ok: false },
      data: {
        error:
          "Local login failed because the configured NOVA.TYP TLS certificate has expired.",
      },
    });

    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText("Email address"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText(
        "Local login failed because the configured NOVA.TYP TLS certificate has expired."
      )
    ).toBeInTheDocument();
  });

  it("returns to the requested Settings section after credential login", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      {},
      "",
      "/?auth=login&next=%2Fsettings%23settings-memory-data"
    );
    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({
        productId: "design",
        taskKind: "brief",
        prompt: "Old design intent",
        source: "dashboard",
        returnTo: "/products/design",
        anonymousWorkId: "work-stale",
        createdAt: new Date().toISOString(),
      })
    );

    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText("Email address"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(setToken).toHaveBeenCalledWith("token-123");
    });
    await waitFor(() => {
      expect(window.location.pathname).toBe("/settings");
      expect(window.location.hash).toBe("#settings-memory-data");
    });
    expect(window.localStorage.getItem(PENDING_INTENT_KEY)).toBeNull();
  });

  it("uses the same preserved-work target for Google OAuth", async () => {
    const user = userEvent.setup();
    (buildGoogleOAuthStartUrl as unknown as jest.Mock).mockReturnValueOnce("#google-start");
    window.history.replaceState(
      {},
      "",
      "/?auth=login&next=%2Fsettings%23settings-memory-data"
    );

    renderLoginScreen();
    await waitFor(() => expect(fetchGoogleOAuthStatus).toHaveBeenCalled());

    expect(await screen.findByText("Return saved.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Continue with Google/ }));

    expect(buildGoogleOAuthStartUrl).toHaveBeenCalledWith(
      "/settings#settings-memory-data"
    );
  });

  it("ignores stale pending intent on ordinary login and stays on the dashboard", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/?auth=login");
    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({
        productId: "spaces",
        taskKind: "chat",
        prompt: "Old chat intent",
        source: "dashboard",
        returnTo: "/spaces",
        anonymousWorkId: "work-stale",
        createdAt: new Date().toISOString(),
      })
    );

    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText("Email address"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(setToken).toHaveBeenCalledWith("token-123");
    });
    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
    expect(window.localStorage.getItem(PENDING_INTENT_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(PENDING_INTENT_KEY)).toBeNull();
  });

  it("keeps explicit pricing-intent auth on pricing after login", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/pricing?auth=signup&plan=personal&interval=monthly");

    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Have an account? Sign in" }));
    await user.type(screen.getByPlaceholderText("Email address"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(setToken).toHaveBeenCalledWith("token-123");
    });
    expect(window.location.pathname).toBe("/pricing");
    expect(window.location.search).toBe("?plan=personal&interval=monthly");
  });
});

describe("hasExplicitPricingIntent", () => {
  it("returns false for generic pricing auth routes", () => {
    expect(
      hasExplicitPricingIntent({
        pathname: "/pricing",
        searchParams: new URLSearchParams("auth=signup&source=website_nav"),
      })
    ).toBe(false);
  });

  it("returns true for plan-based pricing entry", () => {
    expect(
      hasExplicitPricingIntent({
        pathname: "/pricing",
        searchParams: new URLSearchParams("auth=signup&plan=student&interval=yearly"),
      })
    ).toBe(true);
  });
});
