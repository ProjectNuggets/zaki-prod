import type { LearningJson } from "@/lib/learningApi";

export type LearningBookCreatePayloadInput = {
  topic: string;
  language: string;
  selectedKnowledge: string[];
  selectedSessions: string[];
  selectedNotebooks: string[];
  selectedQuestions: Array<string | number>;
};

export function buildLearningBookCreatePayload({
  topic,
  language,
  selectedKnowledge,
  selectedSessions,
  selectedNotebooks,
  selectedQuestions,
}: LearningBookCreatePayloadInput): LearningJson {
  return {
    user_intent: topic.trim(),
    language: language || "en",
    knowledge_bases: selectedKnowledge.filter(Boolean),
    notebook_refs: selectedNotebooks.filter(Boolean).map((id) => ({
      notebook_id: id,
      record_ids: [],
    })),
    question_categories: [],
    question_entries: selectedQuestions
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id)),
    chat_session_id: selectedSessions[0] || "",
    chat_selections: selectedSessions.filter(Boolean).map((id) => ({
      session_id: id,
      message_ids: [],
    })),
  };
}
