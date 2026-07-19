import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@/lib/api", () => ({
  backendAuthRequest: jest.fn(),
  getBackendBase: jest.fn(),
}));

import { getBackendBase } from "@/lib/api";
import { designWorkbenchUrl } from "./designApi";

const session = { id: "sess_1", projectId: "proj_1", state: "READY", generation: 1 } as never;

describe("designWorkbenchUrl", () => {
  beforeEach(() => jest.mocked(getBackendBase).mockReset());

  // Regression: this used to return a RELATIVE path, which resolved against the APP origin. That
  // origin does not proxy /api, so the SPA catch-all returned index.html and the iframe rendered
  // the entire ZAKI dashboard inside the Design page, with no way back out.
  it("is absolute against the backend base, not relative to the app origin", () => {
    jest.mocked(getBackendBase).mockReturnValue("https://api-staging.chatzaki.ai");
    const url = designWorkbenchUrl(session, "test");
    expect(url.startsWith("https://api-staging.chatzaki.ai/api/design/workbench/projects/proj_1")).toBe(true);
  });

  it("does not double the /api prefix when the base already ends in /api", () => {
    jest.mocked(getBackendBase).mockReturnValue("https://api-staging.chatzaki.ai/api");
    expect(designWorkbenchUrl(session, "test")).not.toContain("/api/api/");
    expect(designWorkbenchUrl(session, "test")).toContain("/api/design/workbench/projects/proj_1");
  });

  it("carries the session identifiers the workbench route requires", () => {
    jest.mocked(getBackendBase).mockReturnValue("https://api-staging.chatzaki.ai");
    const url = designWorkbenchUrl(session, "my project");
    const q = new URL(url).searchParams;
    expect(q.get("sessionId")).toBe("sess_1");
    expect(q.get("projectId")).toBe("proj_1");
    expect(q.get("projectName")).toBe("my project");
  });

  it("falls back to the relative path when no base is configured", () => {
    jest.mocked(getBackendBase).mockReturnValue("");
    expect(designWorkbenchUrl(session, "test").startsWith("/api/design/workbench/")).toBe(true);
  });
});
