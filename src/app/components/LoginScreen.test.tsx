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
  claimAnonymousSpacesWork,
} from "@/lib/api";
import { upsertAnonymousWorkItem } from "@/lib/anonymousWork";
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
  claimAnonymousSpacesWork: jest.fn(),
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

    (claimAnonymousSpacesWork as unknown as jest.Mock).mockResolvedValue({
      response: { ok: true },
      data: {
        success: true,
        route: "/spaces/signed-space/threads/thread-1",
        imported: false,
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
    // No consent CHECKBOX on login (email login does not create an account)...
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    // ...but "Continue with Google" from this screen CAN create a brand-new
    // account, so the clickwrap notice must be present here to attest to.
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "https://chatzaki.com/terms?from=google"
    );

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
    await user.type(screen.getByPlaceholderText("Email address"), "signup@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "Password123");

    // Signup mode shows both attestations: the checkbox (email signup) and the
    // clickwrap under "Continue with Google". Both must link the same policies.
    const hrefsFor = (name: string) =>
      screen.getAllByRole("link", { name }).map((link) => link.getAttribute("href"));

    expect(hrefsFor("Terms")).toEqual(
      expect.arrayContaining([
        "https://chatzaki.com/terms?from=signup",
        "https://chatzaki.com/terms?from=google",
      ])
    );
    expect(hrefsFor("Privacy Notice")).toEqual(
      expect.arrayContaining([
        "https://chatzaki.com/privacy?from=signup",
        "https://chatzaki.com/privacy?from=google",
      ])
    );
    expect(hrefsFor("Security & Compliance")).toEqual(
      expect.arrayContaining([
        "https://chatzaki.com/compliance?from=signup",
        "https://chatzaki.com/compliance?from=google",
      ])
    );

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
        legalConsentAccepted: true,
        legalPolicyVersion: policyVersion,
      });
    });
  });

  it("carries explicit v4 consent through Google signup and blocks an unchecked start", async () => {
    const user = userEvent.setup();
    (buildGoogleOAuthStartUrl as unknown as jest.Mock).mockReturnValue("#google-signup");
    renderLoginScreen();
    await waitFor(() => expect(fetchGoogleOAuthStatus).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "New here? Create an account" }));
    await user.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(buildGoogleOAuthStartUrl).not.toHaveBeenCalled();
    expect(
      screen.getByText("Please accept Terms, Privacy & Compliance to create an account.")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(buildGoogleOAuthStartUrl).toHaveBeenCalledWith("/", {
      legalConsentAccepted: true,
      legalPolicyVersion: policyVersion,
    });
  });

  // Regression: "Continue with Google" from the LOGIN screen creates a brand-new
  // account for a first-time user. Consent used to be sent only in signup mode,
  // so those accounts were persisted with no legal_consent record at all.
  it("carries consent through Google from LOGIN mode, not just signup mode", async () => {
    const user = userEvent.setup();
    (buildGoogleOAuthStartUrl as unknown as jest.Mock).mockReturnValue("#google-login");
    renderLoginScreen();
    await waitFor(() => expect(fetchGoogleOAuthStatus).toHaveBeenCalled());

    // Login mode — no consent checkbox exists here, so the clickwrap notice
    // beside the button is the attestation.
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.getByText(/By continuing with Google you agree to the/)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(buildGoogleOAuthStartUrl).toHaveBeenCalledWith("/", {
      legalConsentAccepted: true,
      legalPolicyVersion: policyVersion,
    });
  });

  it("explains a Google signup refused for want of an age check", async () => {
    window.history.replaceState({}, "", "/?auth=login&error=age_verification_required");
    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    const message = await screen.findByText(/We can't verify your age right now/);
    expect(message).toBeInTheDocument();
    // WP-M: the old copy sent people to the email form "so we can collect your
    // date of birth". That form no longer collects one, so it must not be offered
    // as a workaround — that would be a loop with no exit.
    expect(document.body.textContent).not.toMatch(/date of birth/i);
  });

  it("explains a Google signup refused for want of consent", async () => {
    window.history.replaceState({}, "", "/?auth=login&error=google_consent_required");
    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    expect(
      await screen.findByText(/Please accept Terms, Privacy & Compliance, then continue/)
    ).toBeInTheDocument();
  });

  // ── WP-B10 (f): an OAuth `?error=` must ALWAYS land on friendly copy ──────────────
  //
  // #87 mapped the four signup-refusal codes, but the backend also emits
  // `google_oauth_missing_code` (which is what CANCELLING Google produced),
  // `google_oauth_unconfigured`, and `google_oauth_cancelled`. Those fell through the
  // map, so the user landed on a BLANK login form with no message at all.
  it.each([
    ["google_oauth_cancelled", /Google sign-in was cancelled/i],
    ["google_oauth_missing_code", /Google sign-in didn't complete/i],
    ["google_oauth_unconfigured", /Google sign-in isn't available right now/i],
    ["google_oauth_start_failed", /Google sign-in isn't available right now/i],
    ["google_oauth_failed", /Google sign-in failed/i],
  ])("maps ?error=%s to friendly copy with a recovery action", async (code, pattern) => {
    window.history.replaceState({}, "", `/?auth=login&error=${code}`);
    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    const message = await screen.findByText(pattern);
    expect(message).toBeInTheDocument();
    // Every one of these offers a way forward, not just a dead end.
    expect(message.textContent).toMatch(/try again|email and password/i);
  });

  it("never leaves an UNKNOWN oauth error silent — the blank-form bug", async () => {
    window.history.replaceState({}, "", "/?auth=login&error=some_unmapped_backend_code");
    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    // Falls back to friendly copy rather than rendering nothing...
    const message = await screen.findByText(/Google sign-in failed/i);
    expect(message).toBeInTheDocument();
    // ...and never echoes the raw machine code at the user.
    expect(document.body.textContent).not.toContain("some_unmapped_backend_code");
  });

  // ── WP-M: DOB collection is GONE ────────────────────────────────────────────────
  //
  // The age gate is off in every environment, so the birthdate the signup form used
  // to collect was stored and never enforced. GDPR Art. 5(1)(c) makes an unused
  // sensitive field a liability in itself, so the field, its validation and its
  // payload key are removed. Minimum age is now a ToS attestation.
  describe("WP-M: the signup form no longer collects a date of birth", () => {
    async function openSignup() {
      const user = userEvent.setup();
      renderLoginScreen();
      await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());
      await user.click(screen.getByRole("button", { name: "New here? Create an account" }));
      return user;
    }

    it("renders NO date-of-birth field on the signup form", async () => {
      await openSignup();

      expect(screen.queryByLabelText("Date of birth")).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText("YYYY-MM-DD")).not.toBeInTheDocument();
      expect(document.querySelector("#signup-bday")).toBeNull();
      expect(document.querySelector('[autocomplete="bday"]')).toBeNull();
      expect(document.querySelector('[name="bday"]')).toBeNull();
    });

    it("(a) submits a signup with NO dateOfBirth anywhere in the payload", async () => {
      const user = await openSignup();

      await user.type(screen.getByPlaceholderText("Full name"), "User Name");
      await user.type(screen.getByPlaceholderText("Email address"), "signup@example.com");
      await user.type(screen.getByPlaceholderText("Password"), "Password123");
      await user.type(screen.getByPlaceholderText("Confirm password"), "Password123");
      await user.click(screen.getByRole("checkbox"));
      await user.click(screen.getByRole("button", { name: "Create account" }));

      await waitFor(() => expect(requestPublicSignup).toHaveBeenCalled());

      const payload = (requestPublicSignup as jest.Mock).mock.calls[0][0];
      expect(payload).not.toHaveProperty("dateOfBirth");
      expect(Object.keys(payload)).toEqual(
        expect.not.arrayContaining(["dateOfBirth", "dob", "bday", "birthDate"])
      );

      // ...and nothing date-shaped smuggled in under another key. `legalPolicyVersion`
      // ("2026-07-12.v4") is date-shaped by design, so it is excluded from the sweep.
      const { legalPolicyVersion: _policyVersion, ...rest } = payload;
      expect(JSON.stringify(rest)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it("enables Create account with no birthdate — the DOB is not a gate any more", async () => {
      const user = await openSignup();

      await user.type(screen.getByPlaceholderText("Full name"), "User Name");
      await user.type(screen.getByPlaceholderText("Email address"), "signup@example.com");
      await user.type(screen.getByPlaceholderText("Password"), "Password123");
      await user.type(screen.getByPlaceholderText("Confirm password"), "Password123");

      // Consent is still the thing that gates the button — that is #87's invariant.
      const createButton = screen.getByRole("button", { name: "Create account" });
      expect(createButton).toBeDisabled();
      await user.click(screen.getByRole("checkbox"));
      expect(createButton).toBeEnabled();
    });

    it("keeps a minimum-age statement: the ToS attestation line", async () => {
      await openSignup();

      // The age language must not vanish silently along with the field.
      const attestation = screen.getByTestId("signup-age-attestation");
      expect(attestation).toBeInTheDocument();
      expect(attestation).toHaveTextContent(
        "By continuing you confirm you meet the minimum age in our Terms."
      );
    });

    it("still refuses to submit without the consent attestation (#87 intact)", async () => {
      const user = await openSignup();

      await user.type(screen.getByPlaceholderText("Full name"), "User Name");
      await user.type(screen.getByPlaceholderText("Email address"), "signup@example.com");
      await user.type(screen.getByPlaceholderText("Password"), "Password123");
      await user.type(screen.getByPlaceholderText("Confirm password"), "Password123");
      await user.click(screen.getByRole("button", { name: "Create account" }));

      expect(requestPublicSignup).not.toHaveBeenCalled();
    });
  });

  it("blocks signup when confirmation password does not match", async () => {
    const user = userEvent.setup();
    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "New here? Create an account" }));
    await user.type(screen.getByPlaceholderText("Full name"), "User Name");
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

  it("hides legacy adapter auth errors behind service-down copy", async () => {
    const user = userEvent.setup();
    const legacyAdapterError = [
      "Local login failed because the configured",
      "NOVA",
      "TYP TLS certificate has expired.",
    ].join(" ").replace(["NOVA", "TYP"].join(" "), ["NOVA", "TYP"].join("."));
    (requestLogin as unknown as jest.Mock).mockResolvedValueOnce({
      response: { ok: false, status: 503 },
      data: {
        error: legacyAdapterError,
      },
    });

    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText("Email address"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText(
        "Login service is temporarily unavailable. Please try again in a moment."
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

  it("infers protected direct routes as the post-login return target", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/agent");

    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    expect(screen.queryByText("Return saved.")).not.toBeInTheDocument();
    expect(screen.queryByText(/After authentication/i)).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Email address"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(setToken).toHaveBeenCalledWith("token-123");
    });
    await waitFor(() => {
      expect(window.location.pathname).toBe("/agent");
    });
  });

  it("hands the pending Spaces intent to the shared post-auth claim instead of consuming it", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      {},
      "",
      "/?auth=login&next=%2Fspaces%2Fzaky%2Fthreads%2Fanon-abc"
    );
    const savedWork = upsertAnonymousWorkItem({
      productId: "spaces",
      taskKind: "chat",
      prompt: "Keep building this launch memo",
      title: "Launch memo",
      route: "/spaces/zaky/threads/anon-abc",
      threadId: "anon-abc",
      meterRemaining: 19,
      status: "succeeded",
    });
    window.localStorage.setItem(
      PENDING_INTENT_KEY,
      JSON.stringify({
        productId: "spaces",
        taskKind: "chat",
        prompt: "Keep building this launch memo",
        source: "dashboard",
        returnTo: "/spaces/zaky/threads/anon-abc",
        anonymousWorkId: savedWork?.id,
        createdAt: new Date().toISOString(),
      })
    );

    renderLoginScreen();
    await waitFor(() => expect(fetchLegalConsentStatus).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText("Email address"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/spaces/zaky/threads/anon-abc");
    });

    // The claim belongs to App's post-auth effect, which BOTH credential login
    // and the Google OAuth return reach. Doing it here is what left Google
    // sign-ups with their work silently dropped.
    expect(claimAnonymousSpacesWork).not.toHaveBeenCalled();

    // And the intent SURVIVES the redirect. Clearing it here is precisely what
    // made ChatArea's replay find an empty slot, so the visitor landed in a
    // thread with neither an import nor a replay.
    expect(window.localStorage.getItem(PENDING_INTENT_KEY)).not.toBeNull();
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

    expect(screen.queryByText("Return saved.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Continue with Google/ }));

    // Consent rides along even from LOGIN mode — this click can create a
    // brand-new account, and that account must never exist without a consent row.
    expect(buildGoogleOAuthStartUrl).toHaveBeenCalledWith(
      "/settings#settings-memory-data",
      {
        legalConsentAccepted: true,
        legalPolicyVersion: policyVersion,
      }
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
