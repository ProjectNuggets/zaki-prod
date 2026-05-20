import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { backendAuthRequest } from "@/lib/api";
import {
  fireHireApplication,
  hireRequest,
  ingestHireGithub,
  ingestHireResume,
  readHireLeadForm,
} from "./hireApi";

jest.mock("@/lib/api", () => ({
  backendAuthRequest: jest.fn(),
}));

const backendAuthRequestMock = backendAuthRequest as jest.MockedFunction<typeof backendAuthRequest>;

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as Response;
}

describe("hireApi", () => {
  beforeEach(() => {
    backendAuthRequestMock.mockReset();
  });

  it("rejects non-Hire and path-traversal API paths before fetch", async () => {
    await expect(hireRequest("https://evil.test/api/hire/leads")).rejects.toThrow(
      "Invalid Hire API path.",
    );
    await expect(hireRequest("/api/hire/../settings")).rejects.toThrow(
      "Invalid Hire API path.",
    );
    expect(backendAuthRequestMock).not.toHaveBeenCalled();
  });

  it("sends explicit action consent for auto-apply", async () => {
    backendAuthRequestMock.mockResolvedValueOnce(jsonResponse({ status: "firing" }));

    await fireHireApplication("job_123");

    expect(backendAuthRequestMock).toHaveBeenCalledWith(
      "/api/hire/fire/job_123",
      expect.objectContaining({
        method: "POST",
        headers: { "X-Zaki-Hire-Consent": "auto_apply" },
        body: expect.stringContaining('"action":"auto_apply"'),
      }),
    );
  });

  it("sends lead-specific form-read consent", async () => {
    backendAuthRequestMock.mockResolvedValueOnce(jsonResponse({ fields: [] }));

    await readHireLeadForm("job_123", "https://jobs.example/apply");

    expect(backendAuthRequestMock).toHaveBeenCalledWith(
      "/api/hire/leads/job_123/form/read",
      expect.objectContaining({
        method: "POST",
        headers: { "X-Zaki-Hire-Consent": "form_read" },
        body: expect.stringContaining('"url":"https://jobs.example/apply"'),
      }),
    );
  });

  it("keeps resume ingestion as multipart form data", async () => {
    backendAuthRequestMock.mockResolvedValueOnce(jsonResponse({ n: "Nova" }));
    const file = new File(["hello"], "resume.txt", { type: "text/plain" });

    await ingestHireResume({ raw: "resume body", file });

    const [, options] = backendAuthRequestMock.mock.calls[0];
    expect(options?.method).toBe("POST");
    expect(options?.body).toBeInstanceOf(FormData);
    expect((options?.body as FormData).get("raw")).toBe("resume body");
    expect((options?.body as FormData).has("file")).toBe(true);
  });

  it("does not send operator-owned GitHub tokens from the browser", async () => {
    backendAuthRequestMock.mockResolvedValueOnce(jsonResponse({ status: "ok" }));

    await ingestHireGithub({ username: "nova", maxRepos: 25 });

    expect(backendAuthRequestMock).toHaveBeenCalledWith(
      "/api/hire/ingest/github",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "nova", max_repos: 25 }),
      }),
    );
  });

  it("surfaces upstream error messages", async () => {
    backendAuthRequestMock.mockResolvedValueOnce(jsonResponse({ detail: "Scan already running" }, 409));

    await expect(hireRequest("/api/hire/scan", { method: "POST", body: {} })).rejects.toThrow(
      "Scan already running",
    );
  });
});
