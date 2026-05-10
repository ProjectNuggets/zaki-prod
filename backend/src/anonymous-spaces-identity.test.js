import { describe, expect, it } from "@jest/globals";
import {
  ANONYMOUS_SPACES_COOKIE_NAME,
  buildAnonymousSpacesCookie,
  resolveAnonymousSpacesId,
  verifyAnonymousSpacesCookie,
} from "./anonymous-spaces-identity.js";

const SECRET = "a".repeat(64);

function cookieValue(setCookie) {
  return setCookie.match(new RegExp(`${ANONYMOUS_SPACES_COOKIE_NAME}=([^;]+)`))?.[1] || "";
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
});
