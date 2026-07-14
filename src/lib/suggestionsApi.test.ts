import { backendAuthRequest } from "@/lib/api";

import { fetchAgentSuggestions, transitionAgentSuggestion } from "./suggestionsApi";

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

describe("suggestionsApi", () => {
  beforeEach(() => backendAuthRequestMock.mockReset());

  it("normalizes only keyed shadow-fact suggestions", async () => {
    backendAuthRequestMock.mockResolvedValueOnce(
      jsonResponse({
        suggestions: [
          { key: "durable_fact/behavior/1", origin: "trace-miner", content: "Lead with outcomes" },
          { origin: "missing-key", content: "ignored" },
        ],
      }),
    );

    await expect(fetchAgentSuggestions()).resolves.toEqual([
      { key: "durable_fact/behavior/1", origin: "trace-miner", content: "Lead with outcomes" },
    ]);
    expect(backendAuthRequestMock).toHaveBeenCalledWith("/api/agent/suggestions", {
      method: "GET",
      redirectOnAuthFailure: false,
    });
  });

  it.each(["adopt", "dismiss"] as const)("sends only the suggestion key for %s", async (action) => {
    backendAuthRequestMock.mockResolvedValueOnce(jsonResponse({ status: `${action}ed` }));

    await transitionAgentSuggestion(action, "durable_fact/behavior/1");

    expect(backendAuthRequestMock).toHaveBeenCalledWith(`/api/agent/suggestions/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "durable_fact/behavior/1" }),
      redirectOnAuthFailure: false,
    });
  });
});
