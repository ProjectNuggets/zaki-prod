export type LearningSelectedHistory = {
  id: string;
};

export type LearningSelectedBook = {
  id: string;
  pages: Array<{ id: string }>;
};

export type LearningSelectedNotebook = {
  id: string;
  records: Array<{ id: string }>;
};

export type LearningSelectedQuestion = {
  id: number;
};

export type LearningMemoryFile = "summary" | "profile";

export function buildLearningSpaceReferences({
  selectedHistorySessions,
  selectedBooks,
  selectedNotebooks,
  selectedQuestions,
  selectedSkills,
  skillsAutoMode,
  selectedMemoryFiles,
}: {
  selectedHistorySessions: LearningSelectedHistory[];
  selectedBooks: LearningSelectedBook[];
  selectedNotebooks: LearningSelectedNotebook[];
  selectedQuestions: LearningSelectedQuestion[];
  selectedSkills: string[];
  skillsAutoMode: boolean;
  selectedMemoryFiles: LearningMemoryFile[];
}) {
  const bookReferences = selectedBooks
    .map((book) => ({
      book_id: book.id,
      page_ids: Array.from(new Set(book.pages.map((page) => page.id))).filter(Boolean),
    }))
    .filter((book) => book.book_id && book.page_ids.length > 0);

  const notebookReferences = selectedNotebooks
    .map((notebook) => ({
      notebook_id: notebook.id,
      record_ids: Array.from(new Set(notebook.records.map((record) => record.id))).filter(Boolean),
    }))
    .filter((notebook) => notebook.notebook_id && notebook.record_ids.length > 0);

  return {
    history_references: selectedHistorySessions.map((session) => session.id).filter(Boolean),
    book_references: bookReferences,
    notebook_references: notebookReferences,
    question_notebook_references: selectedQuestions.map((question) => question.id),
    skills: skillsAutoMode ? ["auto"] : selectedSkills.filter(Boolean),
    memory_references: selectedMemoryFiles,
  };
}
