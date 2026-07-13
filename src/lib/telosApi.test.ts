import { backendAuthRequest } from "@/lib/api";

import { fetchTelos } from "./telosApi";

jest.mock("@/lib/api", () => ({
  backendAuthRequest: jest.fn(),
}));

const backendAuthRequestMock = backendAuthRequest as jest.MockedFunction<typeof backendAuthRequest>;

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("telosApi", () => {
  beforeEach(() => backendAuthRequestMock.mockReset());

  it("returns curated items and the BFF-exposed prompt status", async () => {
    backendAuthRequestMock.mockResolvedValueOnce(
      jsonResponse({
        telos_in_prompt: true,
        telos: [
          { key: "durable_fact/telos/goal/1", type: "goal", content: "Launch ZAKI" },
          { type: "goal", content: "missing key" },
        ],
      }),
    );

    await expect(fetchTelos()).resolves.toEqual({
      telosInPrompt: true,
      items: [{ key: "durable_fact/telos/goal/1", type: "goal", content: "Launch ZAKI" }],
    });
    expect(backendAuthRequestMock).toHaveBeenCalledWith("/api/agent/telos", {
      method: "GET",
      redirectOnAuthFailure: false,
    });
  });

  it("fails loudly when the BFF cannot report TELOS status", async () => {
    backendAuthRequestMock.mockResolvedValueOnce(jsonResponse({ error: "unavailable" }, 503));
    await expect(fetchTelos()).rejects.toThrow("telos_unavailable");
  });
});
