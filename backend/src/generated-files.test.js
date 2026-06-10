import { recordGeneratedFiles, userOwnsGeneratedFile, isValidStorageFilename } from "./generated-files.js";

test("isValidStorageFilename refuses traversal / odd names", () => {
  expect(isValidStorageFilename("text-0cace141.csv")).toBe(true);
  expect(isValidStorageFilename("pptx-6a584634-47ee.pptx")).toBe(true);
  expect(isValidStorageFilename("../etc/passwd")).toBe(false);
  expect(isValidStorageFilename("a/b.csv")).toBe(false);
  expect(isValidStorageFilename("")).toBe(false);
});

test("recordGeneratedFiles inserts one row per file scoped to the user", async () => {
  const calls = [];
  const dbQuery = async (sql, params) => { calls.push({ sql, params }); return { rows: [] }; };
  await recordGeneratedFiles(dbQuery, { zakiUserId: "u1", workspaceSlug: "w", threadSlug: "t" },
    [{ storageFilename: "text-1.csv", filename: "a.csv", fileSize: 10 }, { storageFilename: "../bad", filename: "x", fileSize: 1 }]);
  expect(calls).toHaveLength(1); // the traversal one is skipped
  expect(calls[0].params).toEqual(expect.arrayContaining(["text-1.csv", "u1", "w", "t", "a.csv", 10]));
});

test("userOwnsGeneratedFile is true only for the owner", async () => {
  const dbQuery = async (_sql, params) => ({ rows: (params[0] === "text-1.csv" && params[1] === "u1") ? [{ storage_filename: "text-1.csv" }] : [] });
  expect(await userOwnsGeneratedFile(dbQuery, "text-1.csv", "u1")).toBe(true);
  expect(await userOwnsGeneratedFile(dbQuery, "text-1.csv", "u2")).toBe(false);
  expect(await userOwnsGeneratedFile(dbQuery, "../bad", "u1")).toBe(false); // invalid name short-circuits
});
