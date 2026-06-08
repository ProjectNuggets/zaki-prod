import {
  buildRefreshCookie,
  buildClearedRefreshCookie,
} from "./zaki-session-cookie.js";

describe("cookie Domain is env-driven (ZAKI_COOKIE_DOMAIN)", () => {
  const savedNodeEnv = process.env.NODE_ENV;
  const savedCookieDomain = process.env.ZAKI_COOKIE_DOMAIN;

  afterEach(() => {
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = savedNodeEnv;
    if (savedCookieDomain === undefined) delete process.env.ZAKI_COOKIE_DOMAIN;
    else process.env.ZAKI_COOKIE_DOMAIN = savedCookieDomain;
  });

  it("uses ZAKI_COOKIE_DOMAIN when set in production", () => {
    process.env.NODE_ENV = "production";
    process.env.ZAKI_COOKIE_DOMAIN = ".alis24.com";
    expect(buildRefreshCookie("t")).toContain("Domain=.alis24.com;");
    expect(buildClearedRefreshCookie()).toContain("Domain=.alis24.com;");
  });

  it("falls back to .chatzaki.com in production when ZAKI_COOKIE_DOMAIN is unset", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ZAKI_COOKIE_DOMAIN;
    expect(buildRefreshCookie("t")).toContain("Domain=.chatzaki.com;");
  });
});
