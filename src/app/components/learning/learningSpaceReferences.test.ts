import { describe, expect, it } from "@jest/globals";
import { buildLearningSpaceReferences } from "./learningSpaceReferences";

describe("buildLearningSpaceReferences", () => {
  it("builds the DeepTutor-compatible Space payload fields", () => {
    expect(
      buildLearningSpaceReferences({
        selectedHistorySessions: [{ id: "session-1" }, { id: "session-2" }],
        selectedBooks: [
          {
            id: "book-1",
            pages: [{ id: "page-1" }, { id: "page-1" }, { id: "page-2" }],
          },
          { id: "book-empty", pages: [] },
        ],
        selectedNotebooks: [
          {
            id: "notebook-1",
            records: [{ id: "record-1" }, { id: "record-1" }, { id: "record-2" }],
          },
        ],
        selectedQuestions: [{ id: 11 }, { id: 12 }],
        selectedSkills: ["latex", "", "socratic"],
        skillsAutoMode: false,
        selectedMemoryFiles: ["summary", "profile"],
      }),
    ).toEqual({
      history_references: ["session-1", "session-2"],
      book_references: [{ book_id: "book-1", page_ids: ["page-1", "page-2"] }],
      notebook_references: [
        { notebook_id: "notebook-1", record_ids: ["record-1", "record-2"] },
      ],
      question_notebook_references: [11, 12],
      skills: ["latex", "socratic"],
      memory_references: ["summary", "profile"],
    });
  });

  it("uses the upstream auto skills sentinel when auto mode is enabled", () => {
    expect(
      buildLearningSpaceReferences({
        selectedHistorySessions: [],
        selectedBooks: [],
        selectedNotebooks: [],
        selectedQuestions: [],
        selectedSkills: ["manual-skill"],
        skillsAutoMode: true,
        selectedMemoryFiles: [],
      }).skills,
    ).toEqual(["auto"]);
  });
});
