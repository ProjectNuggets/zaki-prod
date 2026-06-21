import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { apiRequest } from "@/lib/api";
import { SpacesLoadError, fetchSpaces } from "./useSpaces";

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

describe("fetchSpaces", () => {
  beforeEach(() => {
    (apiRequest as jest.Mock).mockReset();
  });

  it("throws a named SpacesLoadError for normalized adapter outages", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      json: jest.fn(async () => ({
        success: false,
        error: "Spaces is temporarily unavailable. Please try again.",
        code: "spaces_upstream_unavailable",
        status: 502,
      })),
    });

    await expect(fetchSpaces()).rejects.toMatchObject({
      name: "SpacesLoadError",
      message: "Spaces is temporarily unavailable. Please try again.",
      code: "spaces_upstream_unavailable",
      status: 502,
    } satisfies Partial<SpacesLoadError>);
  });
});
