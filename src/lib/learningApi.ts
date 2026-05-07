import { backendAuthRequest, buildApiUrl, getAuthToken, getFreshAuthToken } from "@/lib/api";

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
  const url = new URL(buildApiUrl(path), window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function openLearningSocket(path: string): WebSocket | null {
  const token = getAuthToken();
  return openLearningSocketWithToken(path, token);
}

function openLearningSocketWithToken(path: string, token: string | null): WebSocket | null {
  const url = learningWsUrl(path);
  if (!token || !url) return null;
  return new WebSocket(url, ["zaki.learning.v1", `zaki.jwt.${token}`]);
}

export async function openFreshLearningSocket(path: string): Promise<WebSocket | null> {
  const token = await getFreshAuthToken();
  return openLearningSocketWithToken(path, token);
}

export async function prepareLearningSocketAuth(): Promise<string | null> {
  return getFreshAuthToken();
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
  tutorAgentRecent: ["learning", "tutor-agents", "recent"] as const,
  tutorAgentSouls: ["learning", "tutor-agents", "souls"] as const,
  tutorAgentChannelsSchema: ["learning", "tutor-agents", "channels", "schema"] as const,
  solveSessions: ["learning", "solve", "sessions"] as const,
};

export function listLearningSessions(limit = 100, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return learningRequest<unknown>(`/api/learning/sessions?${params.toString()}`);
}

export function getLearningSession(sessionId: string) {
  return learningRequest<unknown>(`/api/learning/sessions/${encodeURIComponent(sessionId)}`);
}

export function listLearningKnowledge() {
  return learningRequest<unknown>("/api/learning/knowledge/list");
}

function learningUploadFileName(file: File) {
  const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return relativePath?.trim() || file.name;
}

export function createLearningKnowledge(name: string, files: FileList | File[]) {
  const formData = new FormData();
  formData.set("name", name);
  Array.from(files).forEach((file) => formData.append("files", file, learningUploadFileName(file)));
  return learningRequest<unknown>("/api/learning/knowledge/create", {
    method: "POST",
    formData,
  });
}

export function uploadLearningKnowledge(kbName: string, files: FileList | File[]) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file, learningUploadFileName(file)));
  return learningRequest<unknown>(
    `/api/learning/knowledge/${encodeURIComponent(kbName)}/upload`,
    { method: "POST", formData },
  );
}

export function uploadLearningKnowledgeArchive(kbName: string, files: FileList | File[]) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file, learningUploadFileName(file)));
  return learningRequest<unknown>(
    `/api/learning/knowledge/${encodeURIComponent(kbName)}/upload-archive`,
    { method: "POST", formData },
  );
}

export function reindexLearningKnowledge(kbName: string) {
  return learningRequest<unknown>(
    `/api/learning/knowledge/${encodeURIComponent(kbName)}/reindex`,
    {
      method: "POST",
      body: {},
    },
  );
}

export function deleteLearningKnowledge(kbName: string) {
  return learningRequest<unknown>(
    `/api/learning/knowledge/${encodeURIComponent(kbName)}`,
    { method: "DELETE" },
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

export function getLearningBookPage(bookId: string, pageId: string) {
  return learningRequest<unknown>(
    `/api/learning/books/${encodeURIComponent(bookId)}/pages/${encodeURIComponent(pageId)}`,
  );
}

export function createLearningBook(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books", {
    method: "POST",
    body: payload,
  });
}

export function deleteLearningBook(bookId: string) {
  return learningRequest<unknown>(`/api/learning/books/${encodeURIComponent(bookId)}`, {
    method: "DELETE",
  });
}

export function confirmLearningBookProposal(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books/confirm-proposal", {
    method: "POST",
    body: payload,
  });
}

export function confirmLearningBookSpine(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books/confirm-spine", {
    method: "POST",
    body: payload,
  });
}

export function compileLearningBookPage(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books/compile-page", {
    method: "POST",
    body: payload,
  });
}

export function regenerateLearningBookBlock(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books/regenerate-block", {
    method: "POST",
    body: payload,
  });
}

export function insertLearningBookBlock(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books/insert-block", {
    method: "POST",
    body: payload,
  });
}

export function deleteLearningBookBlock(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books/delete-block", {
    method: "POST",
    body: payload,
  });
}

export function moveLearningBookBlock(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books/move-block", {
    method: "POST",
    body: payload,
  });
}

export function changeLearningBookBlockType(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books/change-block-type", {
    method: "POST",
    body: payload,
  });
}

export function createLearningBookDeepDive(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books/deep-dive", {
    method: "POST",
    body: payload,
  });
}

export function recordLearningBookQuizAttempt(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books/quiz-attempt", {
    method: "POST",
    body: payload,
  });
}

export function createLearningBookSupplement(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books/supplement", {
    method: "POST",
    body: payload,
  });
}

export function setLearningBookPageChatSession(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books/page-chat-session", {
    method: "POST",
    body: payload,
  });
}

export function rebuildLearningBook(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/books/rebuild", {
    method: "POST",
    body: payload,
  });
}

export function getLearningBookHealth(bookId: string) {
  return learningRequest<unknown>(`/api/learning/books/${encodeURIComponent(bookId)}/health`);
}

export function refreshLearningBookFingerprints(bookId: string) {
  return learningRequest<unknown>(
    `/api/learning/books/${encodeURIComponent(bookId)}/refresh-fingerprints`,
    { method: "POST" },
  );
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

export function updateLearningNotebook(notebookId: string, payload: LearningJson) {
  return learningRequest<unknown>(`/api/learning/notebooks/${encodeURIComponent(notebookId)}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteLearningNotebook(notebookId: string) {
  return learningRequest<unknown>(`/api/learning/notebooks/${encodeURIComponent(notebookId)}`, {
    method: "DELETE",
  });
}

export function addLearningNotebookRecord(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/notebooks/records", {
    method: "POST",
    body: payload,
  });
}

export function updateLearningNotebookRecord(
  notebookId: string,
  recordId: string,
  payload: LearningJson,
) {
  return learningRequest<unknown>(
    `/api/learning/notebooks/${encodeURIComponent(notebookId)}/records/${encodeURIComponent(recordId)}`,
    {
      method: "PUT",
      body: payload,
    },
  );
}

export function deleteLearningNotebookRecord(notebookId: string, recordId: string) {
  return learningRequest<unknown>(
    `/api/learning/notebooks/${encodeURIComponent(notebookId)}/records/${encodeURIComponent(recordId)}`,
    { method: "DELETE" },
  );
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

export function deleteLearningCoWriterDocument(documentId: string) {
  return learningRequest<unknown>(
    `/api/learning/co-writer/documents/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
    },
  );
}

export function runLearningCoWriterEdit(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/co-writer/edit", {
    method: "POST",
    body: payload,
  });
}

export function runLearningCoWriterAutoMark(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/co-writer/automark", {
    method: "POST",
    body: payload,
  });
}

export function listLearningQuestions() {
  return learningRequest<unknown>("/api/learning/questions/entries?limit=200");
}

export function getLearningQuestionEntry(entryId: string) {
  return learningRequest<unknown>(
    `/api/learning/questions/entries/${encodeURIComponent(entryId)}`,
  );
}

export function updateLearningQuestionEntry(entryId: string, payload: LearningJson) {
  return learningRequest<unknown>(
    `/api/learning/questions/entries/${encodeURIComponent(entryId)}`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export function deleteLearningQuestionEntry(entryId: string) {
  return learningRequest<unknown>(
    `/api/learning/questions/entries/${encodeURIComponent(entryId)}`,
    { method: "DELETE" },
  );
}

export function addLearningQuestionEntryCategory(entryId: string, categoryId: string | number) {
  return learningRequest<unknown>(
    `/api/learning/questions/entries/${encodeURIComponent(entryId)}/categories`,
    {
      method: "POST",
      body: { category_id: Number(categoryId) },
    },
  );
}

export function removeLearningQuestionEntryCategory(entryId: string, categoryId: string | number) {
  return learningRequest<unknown>(
    `/api/learning/questions/entries/${encodeURIComponent(entryId)}/categories/${encodeURIComponent(String(categoryId))}`,
    { method: "DELETE" },
  );
}

export function listLearningQuestionCategories() {
  return learningRequest<unknown>("/api/learning/questions/categories");
}

export function createLearningQuestionCategory(name: string) {
  return learningRequest<unknown>("/api/learning/questions/categories", {
    method: "POST",
    body: { name },
  });
}

export function renameLearningQuestionCategory(categoryId: string | number, name: string) {
  return learningRequest<unknown>(
    `/api/learning/questions/categories/${encodeURIComponent(String(categoryId))}`,
    {
      method: "PATCH",
      body: { name },
    },
  );
}

export function deleteLearningQuestionCategory(categoryId: string | number) {
  return learningRequest<unknown>(
    `/api/learning/questions/categories/${encodeURIComponent(String(categoryId))}`,
    { method: "DELETE" },
  );
}

export function listLearningSkills() {
  return learningRequest<unknown>("/api/learning/skills");
}

export function getLearningSkill(name: string) {
  return learningRequest<unknown>(`/api/learning/skills/${encodeURIComponent(name)}`);
}

export function createLearningSkill(payload: LearningJson) {
  return learningRequest<unknown>("/api/learning/skills", {
    method: "POST",
    body: payload,
  });
}

export function updateLearningSkill(name: string, payload: LearningJson) {
  return learningRequest<unknown>(`/api/learning/skills/${encodeURIComponent(name)}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteLearningSkill(name: string) {
  return learningRequest<unknown>(`/api/learning/skills/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
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

export function refreshLearningMemory(payload: LearningJson = {}) {
  return learningRequest<unknown>("/api/learning/memory/refresh", {
    method: "POST",
    body: payload,
  });
}

export function clearLearningMemory(file: "summary" | "profile") {
  return learningRequest<unknown>("/api/learning/memory/clear", {
    method: "POST",
    body: { file },
  });
}

export function listLearningTutorAgents() {
  return learningRequest<unknown>("/api/learning/tutor-agents");
}

export function listLearningTutorAgentRecent(limit = 3) {
  return learningRequest<unknown>(
    `/api/learning/tutor-agents/recent?limit=${encodeURIComponent(String(limit))}`,
  );
}

export function listLearningTutorAgentSouls() {
  return learningRequest<unknown>("/api/learning/tutor-agents/souls");
}

export function getLearningTutorAgentChannelsSchema() {
  return learningRequest<unknown>("/api/learning/tutor-agents/channels/schema");
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

export function stopLearningTutorAgent(agentId: string) {
  return learningRequest<unknown>(
    `/api/learning/tutor-agents/${encodeURIComponent(agentId)}`,
    { method: "DELETE" },
  );
}

export function destroyLearningTutorAgent(agentId: string) {
  return learningRequest<unknown>(
    `/api/learning/tutor-agents/${encodeURIComponent(agentId)}/destroy`,
    { method: "DELETE" },
  );
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
