import { backendAuthRequest, buildApiUrl, getAuthToken } from "@/lib/api";

export type LearningJson = Record<string, unknown>;

type LearningRequestOptions = {
  method?: string;
  body?: LearningJson;
  formData?: FormData;
};

async function parseLearningResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export async function learningRequest<T = unknown>(
  path: string,
  options: LearningRequestOptions = {},
): Promise<T> {
  const body =
    options.formData ??
    (options.body === undefined ? undefined : JSON.stringify(options.body));
  const response = await backendAuthRequest(path, {
    method: options.method ?? "GET",
    body,
  });
  const payload = await parseLearningResponse(response);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as LearningJson).message)
        : `Learning request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export function learningWsUrl(path: string): string | null {
  const token = getAuthToken();
  if (!token) return null;
  const url = new URL(buildApiUrl(path), window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function openLearningSocket(path: string): WebSocket | null {
  const token = getAuthToken();
  const url = learningWsUrl(path);
  if (!token || !url) return null;
  return new WebSocket(url, ["zaki.learning.v1", `zaki.jwt.${token}`]);
}

export const learningKeys = {
  health: ["learning", "health"] as const,
  knowledge: ["learning", "knowledge"] as const,
  books: ["learning", "books"] as const,
  notebooks: ["learning", "notebooks"] as const,
  coWriterDocuments: ["learning", "co-writer", "documents"] as const,
  questions: ["learning", "questions"] as const,
  skills: ["learning", "skills"] as const,
  memory: ["learning", "memory"] as const,
  sessions: ["learning", "sessions"] as const,
  tutorAgents: ["learning", "tutor-agents"] as const,
  solveSessions: ["learning", "solve", "sessions"] as const,
};

export function listLearningSessions(limit = 50, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return learningRequest<unknown>(`/api/learning/sessions?${params.toString()}`);
}

export function listLearningKnowledge() {
  return learningRequest<unknown>("/api/learning/knowledge/list");
}

export function createLearningKnowledge(name: string, files: FileList | File[]) {
  const formData = new FormData();
  formData.set("name", name);
  Array.from(files).forEach((file) => formData.append("files", file, file.name));
  return learningRequest<unknown>("/api/learning/knowledge/create", {
    method: "POST",
    formData,
  });
}

export function uploadLearningKnowledge(kbName: string, files: FileList | File[]) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file, file.name));
  return learningRequest<unknown>(
    `/api/learning/knowledge/${encodeURIComponent(kbName)}/upload`,
    { method: "POST", formData },
  );
}

export function listLearningBooks() {
  return learningRequest<unknown>("/api/learning/books");
}

export function getLearningBook(bookId: string) {
  return learningRequest<unknown>(`/api/learning/books/${encodeURIComponent(bookId)}`);
}

export function getLearningBookSpine(bookId: string) {
  return learningRequest<unknown>(`/api/learning/books/${encodeURIComponent(bookId)}/spine`);
}

export function createLearningBook(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books", {
    method: "POST",
    body: payload,
  });
}

export function listLearningNotebooks() {
  return learningRequest<unknown>("/api/learning/notebooks");
}

export function getLearningNotebook(notebookId: string) {
  return learningRequest<unknown>(`/api/learning/notebooks/${encodeURIComponent(notebookId)}`);
}

export function createLearningNotebook(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/notebooks", {
    method: "POST",
    body: payload,
  });
}

export function listLearningCoWriterDocuments() {
  return learningRequest<unknown>("/api/learning/co-writer/documents");
}

export function getLearningCoWriterDocument(documentId: string) {
  return learningRequest<unknown>(
    `/api/learning/co-writer/documents/${encodeURIComponent(documentId)}`,
  );
}

export function createLearningCoWriterDocument(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/co-writer/documents", {
    method: "POST",
    body: payload,
  });
}

export function updateLearningCoWriterDocument(documentId: string, payload: LearningJson) {
  return learningRequest<unknown>(
    `/api/learning/co-writer/documents/${encodeURIComponent(documentId)}`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export function runLearningCoWriterEdit(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/co-writer/edit", {
    method: "POST",
    body: payload,
  });
}

export function listLearningQuestions() {
  return learningRequest<unknown>("/api/learning/questions/entries?limit=20");
}

export function getLearningQuestionEntry(entryId: string) {
  return learningRequest<unknown>(
    `/api/learning/questions/entries/${encodeURIComponent(entryId)}`,
  );
}

export function listLearningSkills() {
  return learningRequest<unknown>("/api/learning/skills");
}

export function getLearningMemory() {
  return learningRequest<unknown>("/api/learning/memory");
}

export function updateLearningMemory(file: "summary" | "profile", content: string) {
  return learningRequest<unknown>("/api/learning/memory", {
    method: "PUT",
    body: { file, content },
  });
}

export function listLearningTutorAgents() {
  return learningRequest<unknown>("/api/learning/tutor-agents");
}

export function getLearningTutorAgent(agentId: string) {
  return learningRequest<unknown>(`/api/learning/tutor-agents/${encodeURIComponent(agentId)}`);
}

export function getLearningTutorAgentHistory(agentId: string) {
  return learningRequest<unknown>(
    `/api/learning/tutor-agents/${encodeURIComponent(agentId)}/history`,
  );
}

export function createLearningTutorAgent(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/tutor-agents", {
    method: "POST",
    body: payload,
  });
}

export function listLearningSolveSessions() {
  return learningRequest<unknown>("/api/learning/solve/sessions?limit=10");
}

export function getLearningSolveSession(sessionId: string) {
  return learningRequest<unknown>(
    `/api/learning/solve/sessions/${encodeURIComponent(sessionId)}`,
  );
}

export function listLearningKnowledgeFiles(kbName: string) {
  return learningRequest<unknown>(
    `/api/learning/knowledge/${encodeURIComponent(kbName)}/files`,
  );
}

export function analyzeLearningVision(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/vision/analyze", {
    method: "POST",
    body: payload,
  });
}
