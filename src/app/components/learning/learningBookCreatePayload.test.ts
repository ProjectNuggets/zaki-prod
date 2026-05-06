import { describe, expect, it } from "@jest/globals";
import { buildLearningBookCreatePayload } from "./learningBookCreatePayload";

describe("buildLearningBookCreatePayload", () => {
  it("builds the upstream-compatible hosted book create payload", () => {
    expect(
      buildLearningBookCreatePayload({
        topic: "  teach attention  ",
        language: "en",
        selectedKnowledge: ["kb-a", ""],
        selectedSessions: ["session-1", "session-2"],
        selectedNotebooks: ["notebook-1"],
        selectedQuestions: [101, "102", "bad"],
      }),
    ).toEqual({
      user_intent: "teach attention",
      language: "en",
      knowledge_bases: ["kb-a"],
      notebook_refs: [{ notebook_id: "notebook-1", record_ids: [] }],
      question_categories: [],
      question_entries: [101, 102],
      chat_session_id: "session-1",
      chat_selections: [
        { session_id: "session-1", message_ids: [] },
        { session_id: "session-2", message_ids: [] },
      ],
    });
  });

  it("defaults language and keeps empty source fields explicit", () => {
    expect(
      buildLearningBookCreatePayload({
        topic: "vectors",
        language: "",
        selectedKnowledge: [],
        selectedSessions: [],
        selectedNotebooks: [],
        selectedQuestions: [],
      }),
    ).toMatchObject({
      language: "en",
      knowledge_bases: [],
      notebook_refs: [],
      question_categories: [],
      question_entries: [],
      chat_session_id: "",
      chat_selections: [],
    });
  });
});
