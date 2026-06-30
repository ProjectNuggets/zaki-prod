import { describe, it, expect } from "@jest/globals";
import { copyResponseHeaders } from "./upstream-headers.js";

function makeUpstream(headers) {
  return {
    headers: {
      forEach(cb) {
        for (const [key, value] of Object.entries(headers)) {
          cb(value, key);
        }
      },
    },
  };
}

function makeRes() {
  const recorded = {};
  return {
    setHeader(key, value) {
      recorded[key.toLowerCase()] = value;
    },
    recorded,
  };
}

describe("copyResponseHeaders", () => {
  it("does NOT copy set-cookie (lowercase)", () => {
    const upstream = makeUpstream({ "set-cookie": "session=abc; HttpOnly" });
    const res = makeRes();
    copyResponseHeaders(upstream, res);
    expect(res.recorded["set-cookie"]).toBeUndefined();
  });

  it("does NOT copy Set-Cookie (mixed-case)", () => {
    const upstream = makeUpstream({ "Set-Cookie": "session=xyz; Secure" });
    const res = makeRes();
    copyResponseHeaders(upstream, res);
    expect(res.recorded["set-cookie"]).toBeUndefined();
  });

  it("DOES copy content-type", () => {
    const upstream = makeUpstream({ "content-type": "application/json" });
    const res = makeRes();
    copyResponseHeaders(upstream, res);
    expect(res.recorded["content-type"]).toBe("application/json");
  });

  it("does NOT copy access-control-allow-origin (existing CORS guarantee preserved)", () => {
    const upstream = makeUpstream({ "access-control-allow-origin": "*" });
    const res = makeRes();
    copyResponseHeaders(upstream, res);
    expect(res.recorded["access-control-allow-origin"]).toBeUndefined();
  });
});
