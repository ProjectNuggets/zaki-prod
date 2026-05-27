import { describe, expect, jest, test } from "@jest/globals";
import {
  extractDesignProjectFromPayload,
  markDesignProjectActive,
  markDesignProjectDeleted,
  markDesignProjectFailed,
  upsertDesignProjectProvisioning,
} from "./design-project-store.js";

describe("design project store", () => {
  test("extracts upstream project payloads", () => {
    expect(
      extractDesignProjectFromPayload({
        project: {
          id: "design-1",
          name: "Brand board",
          metadata: { zakiTenantId: "7" },
        },
      })
    ).toEqual({
      projectId: "design-1",
      name: "Brand board",
      metadata: { zakiTenantId: "7" },
    });
    expect(extractDesignProjectFromPayload({ project: { name: "No id" } })).toBeNull();
  });

  test("records provisioning ownership and owner role", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    await upsertDesignProjectProvisioning({
      dbQuery,
      userId: "42",
      projectId: "design-1",
      name: "Workspace",
      metadata: { zakiTenantId: "42" },
      requestId: "req-1",
    });

    expect(dbQuery).toHaveBeenCalledTimes(2);
    expect(dbQuery.mock.calls[0][1]).toEqual([
      "design-1",
      42,
      "Workspace",
      JSON.stringify({ zakiTenantId: "42" }),
      "req-1",
    ]);
    expect(dbQuery.mock.calls[1][1]).toEqual(["design-1", 42, "owner"]);
  });

  test("marks active and deleted projects", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    await markDesignProjectActive({
      dbQuery,
      userId: 42,
      project: { id: "design-1", name: "Active", metadata: {} },
      requestId: "req-2",
    });
    await markDesignProjectDeleted({
      dbQuery,
      userId: 42,
      projectId: "design-1",
      requestId: "req-3",
    });

    expect(dbQuery).toHaveBeenCalledTimes(3);
    expect(dbQuery.mock.calls[0][1]).toEqual([
      "design-1",
      42,
      "Active",
      "{}",
      "req-2",
    ]);
    expect(dbQuery.mock.calls[2][1]).toEqual(["design-1", 42, "req-3"]);
  });

  test("marks failed provisioning projects", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    await markDesignProjectFailed({
      dbQuery,
      userId: 42,
      projectId: "design-1",
      requestId: "req-4",
    });

    expect(dbQuery).toHaveBeenCalledTimes(1);
    expect(dbQuery.mock.calls[0][0]).toContain("status = 'failed'");
    expect(dbQuery.mock.calls[0][1]).toEqual(["design-1", 42, "req-4"]);
  });
});
