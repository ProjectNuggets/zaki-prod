import { describe, expect, jest, test } from "@jest/globals";
import { reconcileWorkerProjects } from "./design-worker-reconcile.js";

const SESSION = {
  sessionId: "design-session-1",
  projectId: "design-seed",
  userId: "154",
  tenantId: "default",
  generation: 3,
};

function jsonResponse(body, status = 200) {
  return { status, json: async () => body, body: { cancel: async () => undefined } };
}

describe("reconcileWorkerProjects", () => {
  test("creates only the projects the worker is missing, honoring registry ids", async () => {
    const dbQuery = jest.fn().mockResolvedValue({
      rows: [
        { project_id: "design-a", name: "Alpha" },
        { project_id: "design-b", name: "Bravo" }, // worker already has this one
        { project_id: "design-c", name: "Charlie" },
      ],
    });
    const proxy = jest
      .fn()
      // GET /api/projects -> worker currently has only design-b
      .mockResolvedValueOnce(jsonResponse({ projects: [{ id: "design-b", name: "Bravo" }] }))
      // POST creates for the two missing ones
      .mockResolvedValueOnce(jsonResponse({ project: { id: "design-a" } }, 201))
      .mockResolvedValueOnce(jsonResponse({ project: { id: "design-c" } }, 201));

    const result = await reconcileWorkerProjects({
      controller: { proxy },
      dbQuery,
      session: SESSION,
      requestId: "req_1",
    });

    expect(result).toEqual({ seeded: 2, present: 1, skipped: false });
    const creates = proxy.mock.calls.filter(([c]) => c.method === "POST");
    expect(creates.map(([c]) => JSON.parse(c.body).id).sort()).toEqual(["design-a", "design-c"]);
    // Never re-creates one the worker already has.
    expect(creates.some(([c]) => JSON.parse(c.body).id === "design-b")).toBe(false);
    // Seeds carry the registry name and the session's expected generation.
    expect(JSON.parse(creates[0][0].body).name).toBe("Alpha");
    expect(creates[0][0].expectedGeneration).toBe(3);
  });

  test("skips (does not blind-create) when the worker list cannot be read", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [{ project_id: "design-a", name: "Alpha" }] });
    const proxy = jest.fn().mockResolvedValueOnce(jsonResponse("boom", 503));

    const result = await reconcileWorkerProjects({
      controller: { proxy },
      dbQuery,
      session: SESSION,
      requestId: "req_2",
    });

    expect(result).toEqual({ seeded: 0, present: 0, skipped: true });
    expect(proxy.mock.calls.filter(([c]) => c.method === "POST")).toHaveLength(0);
  });

  test("does nothing when the user owns no live projects", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    const proxy = jest.fn();

    const result = await reconcileWorkerProjects({
      controller: { proxy },
      dbQuery,
      session: SESSION,
      requestId: "req_3",
    });

    expect(result).toEqual({ seeded: 0, present: 0, skipped: false });
    expect(proxy).not.toHaveBeenCalled();
  });
});
