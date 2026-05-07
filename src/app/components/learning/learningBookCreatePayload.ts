import type { LearningJson } from "@/lib/learningApi";

export type LearningBookCreatePayloadInput = {
  topic: string;
  language: string;
  selectedKnowledge: string[];
  selectedSessions: Array<{ session_id: string; message_ids: number[] }>;
  selectedNotebooks: Array<{ notebook_id: string; record_ids: string[] }>;
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
    notebook_refs: selectedNotebooks
      .filter((selection) => selection.notebook_id)
      .map((selection) => ({
        notebook_id: selection.notebook_id,
        record_ids: Array.from(new Set(selection.record_ids.map(String).filter(Boolean))),
      })),
    question_categories: [],
    question_entries: selectedQuestions
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id)),
    chat_session_id: selectedSessions.find((selection) => selection.session_id)?.session_id || "",
    chat_selections: selectedSessions
      .filter((selection) => selection.session_id)
      .map((selection) => ({
        session_id: selection.session_id,
        message_ids: Array.from(new Set(selection.message_ids.map(Number).filter(Number.isFinite))),
      })),
  };
}
