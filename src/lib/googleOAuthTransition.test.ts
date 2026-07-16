import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  beginGoogleOAuthTransition,
  consumeGoogleOAuthTransition,
  GOOGLE_OAUTH_TRANSITION_QUERY,
  GOOGLE_OAUTH_TRANSITION_STORAGE_KEY,
} from "./googleOAuthTransition";

describe("Google OAuth transition proof", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("binds a same-tab account switch to a one-use signed callback route", () => {
    jest.spyOn(crypto, "randomUUID").mockReturnValue("oauth-switch-a-to-b");
    jest.spyOn(Date, "now").mockReturnValue(1_000);

    const callbackRoute = beginGoogleOAuthTransition(
      "/brain?auth=login&source=website_home_command#memory",
      "id:account-a"
    );

    expect(callbackRoute).toBe("/brain?zaki_oauth_transition=oauth-switch-a-to-b");
    expect(
      JSON.parse(window.sessionStorage.getItem(GOOGLE_OAUTH_TRANSITION_STORAGE_KEY) || "{}")
    ).toEqual({
      nonce: "oauth-switch-a-to-b",
      storagePrincipal: "id:account-a",
      returnTo: "/brain?source=website_home_command#memory",
      expiresAt: 601_000,
    });

    expect(
      consumeGoogleOAuthTransition(`?${GOOGLE_OAUTH_TRANSITION_QUERY}=oauth-switch-a-to-b`)
    ).toEqual({
      storagePrincipal: "id:account-a",
      returnTo: "/brain?source=website_home_command#memory",
    });
    expect(window.sessionStorage.getItem(GOOGLE_OAUTH_TRANSITION_STORAGE_KEY)).toBeNull();
    expect(
      consumeGoogleOAuthTransition(`?${GOOGLE_OAUTH_TRANSITION_QUERY}=oauth-switch-a-to-b`)
    ).toBeNull();
  });

  it("fails closed for an expired or mismatched callback without consuming a fresh proof", () => {
    window.sessionStorage.setItem(
      GOOGLE_OAUTH_TRANSITION_STORAGE_KEY,
      JSON.stringify({
        nonce: "fresh-nonce",
        storagePrincipal: "id:account-a",
        returnTo: "/brain",
        expiresAt: 2_000,
      })
    );
    const now = jest.spyOn(Date, "now").mockReturnValue(1_000);

    expect(
      consumeGoogleOAuthTransition(`?${GOOGLE_OAUTH_TRANSITION_QUERY}=different-nonce`)
    ).toBeNull();
    expect(window.sessionStorage.getItem(GOOGLE_OAUTH_TRANSITION_STORAGE_KEY)).not.toBeNull();

    now.mockReturnValue(2_000);
    expect(
      consumeGoogleOAuthTransition(`?${GOOGLE_OAUTH_TRANSITION_QUERY}=fresh-nonce`)
    ).toBeNull();
    expect(window.sessionStorage.getItem(GOOGLE_OAUTH_TRANSITION_STORAGE_KEY)).toBeNull();
  });

  it("keeps the callback local and stores the original safe destination separately", () => {
    jest.spyOn(crypto, "randomUUID").mockReturnValue("local-nonce");

    expect(beginGoogleOAuthTransition("https://evil.example/brain", "id:account-a")).toBe(
      "/?zaki_oauth_transition=local-nonce"
    );
    expect(
      JSON.parse(window.sessionStorage.getItem(GOOGLE_OAUTH_TRANSITION_STORAGE_KEY) || "{}")
    ).toMatchObject({ returnTo: "/" });
  });
});
