import { describe, expect, it } from "@jest/globals";
import {
  ANONYMOUS_METER_COOKIE_NAME,
  ANONYMOUS_SPACES_COOKIE_NAME,
  buildAnonymousMeterCookie,
  buildAnonymousSpacesCookie,
  resolveAnonymousMeterId,
  resolveAnonymousSpacesId,
  verifyAnonymousSpacesCookie,
} from "./anonymous-spaces-identity.js";

const SECRET = "a".repeat(64);

function cookieValue(setCookie) {
  return setCookie.match(new RegExp(`${ANONYMOUS_SPACES_COOKIE_NAME}=([^;]+)`))?.[1] || "";
}

function meterCookieValue(setCookie) {
  return setCookie.match(new RegExp(`${ANONYMOUS_METER_COOKIE_NAME}=([^;]+)`))?.[1] || "";
}

describe("anonymous Spaces identity", () => {
  it("verifies a signed anonymous identity cookie", () => {
    const setCookie = buildAnonymousSpacesCookie("anon-user-1", SECRET, 1_000);
    expect(verifyAnonymousSpacesCookie(decodeURIComponent(cookieValue(setCookie)), SECRET, 2_000))
      .toBe("anon-user-1");
  });

  it("rejects tampered anonymous identity cookies", () => {
    const setCookie = buildAnonymousSpacesCookie("anon-user-1", SECRET, 1_000);
    const parts = decodeURIComponent(cookieValue(setCookie)).split(".");
    const tampered = `${parts[0]}.${parts[1]}.tampered`;
    expect(verifyAnonymousSpacesCookie(tampered, SECRET, 2_000)).toBeNull();
  });

  it("sets a new server-signed cookie instead of trusting caller-provided ids", () => {
    const headers = {};
    const res = {
      setHeader(name, value) {
        headers[name] = value;
      },
    };
    const id = resolveAnonymousSpacesId(
      { headers: { "x-zaki-anonymous-id": "caller-controlled" } },
      res,
      SECRET,
      1_000
    );

    expect(id).not.toBe("caller-controlled");
    expect(headers["Set-Cookie"]).toContain(`${ANONYMOUS_SPACES_COOKIE_NAME}=`);
  });

  it("sets a durable anonymous meter cookie across api routes", () => {
    const headers = {};
    const res = {
      setHeader(name, value) {
        headers[name] = value;
      },
    };
    const id = resolveAnonymousMeterId({ headers: {} }, res, SECRET, 1_000);

    expect(id).toBeTruthy();
    expect(headers["Set-Cookie"]).toContain(`${ANONYMOUS_METER_COOKIE_NAME}=`);
    expect(headers["Set-Cookie"]).toContain("Path=/api;");
    expect(
      verifyAnonymousSpacesCookie(
        decodeURIComponent(meterCookieValue(headers["Set-Cookie"])),
        SECRET,
        2_000
      )
    ).toBe(id);
  });

  it("appends anonymous meter and spaces cookies without overwriting", () => {
    const headers = {};
    const res = {
      getHeader(name) {
        return headers[name];
      },
      setHeader(name, value) {
        headers[name] = value;
      },
    };

    resolveAnonymousMeterId({ headers: {} }, res, SECRET, 1_000);
    resolveAnonymousSpacesId({ headers: {} }, res, SECRET, 1_000);

    expect(headers["Set-Cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${ANONYMOUS_METER_COOKIE_NAME}=`),
        expect.stringContaining(`${ANONYMOUS_SPACES_COOKIE_NAME}=`),
      ])
    );
  });

  it("builds meter cookies with the central api path", () => {
    const setCookie = buildAnonymousMeterCookie("anon-meter-1", SECRET, 1_000);
    expect(setCookie).toContain(`${ANONYMOUS_METER_COOKIE_NAME}=`);
    expect(setCookie).toContain("Path=/api;");
  });
});
