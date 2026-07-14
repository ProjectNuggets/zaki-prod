const backendAuthRequest = jest.fn();

jest.mock("@/lib/api", () => ({ backendAuthRequest }));

import {
  designWorkbenchUrl,
  ensureDesignSession,
  getDesignSession,
  stopDesignSession,
} from "./designApi";

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => name.toLowerCase() === "content-type" ? "application/json" : null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("Design hosted lifecycle API", () => {
  beforeEach(() => backendAuthRequest.mockReset());

  it("uses the canonical ensure, status, and stop endpoints", async () => {
    backendAuthRequest.mockResolvedValue(jsonResponse({
      session: { id: "sess_01", projectId: "project_01", state: "READY", generation: 1 },
    }));

    await ensureDesignSession("project_01");
    expect(backendAuthRequest).toHaveBeenLastCalledWith("/api/design/sessions", expect.objectContaining({
      method: "POST", body: JSON.stringify({ projectId: "project_01" }),
    }));
    await getDesignSession("sess_01", "project_01");
    expect(backendAuthRequest).toHaveBeenLastCalledWith(
      "/api/design/sessions/sess_01?projectId=project_01",
      expect.objectContaining({ method: "GET" }),
    );
    await stopDesignSession("sess_01", "project_01");
    expect(backendAuthRequest).toHaveBeenLastCalledWith(
      "/api/design/sessions/sess_01/stop",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ projectId: "project_01" }) }),
    );
  });

  it("builds a same-origin authenticated workbench URL", () => {
    expect(designWorkbenchUrl(
      { id: "sess_01", projectId: "project_01", state: "READY", generation: 1 },
      "Brand & web",
    )).toBe(
      "/api/design/workbench/projects/project_01?sessionId=sess_01&projectId=project_01&projectName=Brand+%26+web",
    );
  });
});
