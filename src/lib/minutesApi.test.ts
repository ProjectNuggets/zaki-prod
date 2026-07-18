import { backendAuthRequest } from "@/lib/api";
import { listMinutes, readMinutesItem, searchMinutes } from "./minutesApi";

jest.mock("@/lib/api", () => ({ backendAuthRequest: jest.fn() }));

const request = backendAuthRequest as jest.MockedFunction<typeof backendAuthRequest>;

function ok(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

describe("Minutes browser API", () => {
  beforeEach(() => request.mockReset());

  it("uses only the fixed authenticated Minutes BFF routes", async () => {
    request
      .mockResolvedValueOnce(ok({ items: [], truncated: false }))
      .mockResolvedValueOnce(ok({ item: { id: "summary:41" }, truncated: false }))
      .mockResolvedValueOnce(ok({ items: [], truncated: false }));

    await listMinutes({ limit: 50 });
    await readMinutesItem("summary:41", "full");
    await searchMinutes("launch review", 20);

    expect(request.mock.calls).toEqual([
      ["/api/minutes/index?limit=50", { method: "GET" }],
      ["/api/minutes/items/summary%3A41?variant=full", { method: "GET" }],
      ["/api/minutes/search", { method: "POST", body: JSON.stringify({ query: "launch review", limit: 20 }) }],
    ]);
  });
});
