export type LearningBookStageId =
  | "ideation"
  | "exploration"
  | "synthesis"
  | "critique"
  | "overview"
  | "compilation";

export type LearningBookStageState = "pending" | "running" | "completed" | "error";

export type LearningBookProgressEvent = {
  type?: string;
  content?: unknown;
  metadata?: Record<string, unknown>;
  stage?: string;
  [key: string]: unknown;
};

export type LearningBookStageView = {
  id: LearningBookStageId;
  label: string;
  description: string;
  state: LearningBookStageState;
  detail?: string;
  startedAt?: number;
  endedAt?: number;
};

export type LearningBookProgress = {
  bookId: string | null;
  stages: Record<LearningBookStageId, LearningBookStageView>;
  ordered: LearningBookStageId[];
  exploration: {
    queryCount: number;
    chunkCount: number;
    candidateConcepts: number;
    summary: string;
  };
  synthesis: {
    rounds: number;
    chapterCount: number;
    conceptNodes: number;
    conceptEdges: number;
    lastVerdict: string;
  };
  critique: {
    rounds: number;
    issues: number;
  };
  compilation: {
    pagesPlanned: number;
    pagesReady: number;
    blocksReady: number;
    blocksError: number;
  };
  message: string;
  updatedAt: number;
};

export const LEARNING_BOOK_STAGE_ORDER: LearningBookStageId[] = [
  "ideation",
  "exploration",
  "synthesis",
  "critique",
  "overview",
  "compilation",
];

const STAGE_COPY: Record<
  LearningBookStageId,
  { label: string; description: string }
> = {
  ideation: {
    label: "Ideation",
    description: "Drafting the book proposal.",
  },
  exploration: {
    label: "Source sweep",
    description: "Retrieving supporting source material.",
  },
  synthesis: {
    label: "Synthesis",
    description: "Building the chapter structure.",
  },
  critique: {
    label: "Critique",
    description: "Reviewing and tightening the outline.",
  },
  overview: {
    label: "Overview",
    description: "Preparing the overview chapter.",
  },
  compilation: {
    label: "Compilation",
    description: "Generating pages and learning blocks.",
  },
};

export function emptyLearningBookProgress(): LearningBookProgress {
  const stages = Object.fromEntries(
    LEARNING_BOOK_STAGE_ORDER.map((id) => [
      id,
      {
        id,
        label: STAGE_COPY[id].label,
        description: STAGE_COPY[id].description,
        state: "pending" as LearningBookStageState,
      },
    ]),
  ) as Record<LearningBookStageId, LearningBookStageView>;

  return {
    bookId: null,
    stages,
    ordered: LEARNING_BOOK_STAGE_ORDER,
    exploration: {
      queryCount: 0,
      chunkCount: 0,
      candidateConcepts: 0,
      summary: "",
    },
    synthesis: {
      rounds: 0,
      chapterCount: 0,
      conceptNodes: 0,
      conceptEdges: 0,
      lastVerdict: "",
    },
    critique: { rounds: 0, issues: 0 },
    compilation: {
      pagesPlanned: 0,
      pagesReady: 0,
      blocksReady: 0,
      blocksError: 0,
    },
    message: "",
    updatedAt: 0,
  };
}

function patchStage(
  state: LearningBookProgress,
  id: LearningBookStageId,
  patch: Partial<LearningBookStageView>,
) {
  return {
    ...state,
    stages: {
      ...state.stages,
      [id]: { ...state.stages[id], ...patch },
    },
  };
}

function startStage(state: LearningBookProgress, id: LearningBookStageId) {
  let next = state;
  for (const stageId of LEARNING_BOOK_STAGE_ORDER) {
    if (stageId === id) break;
    const stage = next.stages[stageId];
    if (stage.state === "pending" || stage.state === "running") {
      next = patchStage(next, stageId, {
        state: "completed",
        endedAt: Date.now(),
      });
    }
  }
  return patchStage(next, id, {
    state: "running",
    startedAt: next.stages[id].startedAt ?? Date.now(),
  });
}

function completeStage(state: LearningBookProgress, id: LearningBookStageId) {
  return patchStage(state, id, { state: "completed", endedAt: Date.now() });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return 0;
}

function asString(value: unknown): string {
  return value == null ? "" : String(value);
}

export function getLearningBookProgressEventBookId(event: LearningBookProgressEvent) {
  const metadata = asRecord(event.metadata);
  return (
    asString(metadata.book_id) ||
    asString(metadata.bookId) ||
    asString(event.book_id) ||
    asString(event.bookId)
  );
}

export function getLearningBookProgressEventKind(event: LearningBookProgressEvent) {
  const metadata = asRecord(event.metadata);
  return asString(event.content) || asString(metadata.kind) || asString(event.kind);
}

export function learningBookProgressEventShouldRefresh(event: LearningBookProgressEvent) {
  return new Set([
    "proposal_ready",
    "exploration_ready",
    "spine_ready",
    "page_planned",
    "page_compiled",
    "page_ready",
    "block_ready",
    "block_error",
    "overview_ready",
    "compilation_complete",
  ]).has(getLearningBookProgressEventKind(event));
}

export function reduceLearningBookProgressEvent(
  state: LearningBookProgress,
  event: LearningBookProgressEvent,
): LearningBookProgress {
  const metadata = asRecord(event.metadata);
  const stage = asString(event.stage);
  const kind = getLearningBookProgressEventKind(event);
  const eventType = asString(event.type);
  let next: LearningBookProgress = { ...state, updatedAt: Date.now() };

  const eventBookId = getLearningBookProgressEventBookId(event);
  if (eventBookId && !next.bookId) {
    next = { ...next, bookId: eventBookId };
  }

  if (eventType === "stage_begin" && LEARNING_BOOK_STAGE_ORDER.includes(stage as LearningBookStageId)) {
    next = startStage(next, stage as LearningBookStageId);
  }
  if (eventType === "stage_end" && LEARNING_BOOK_STAGE_ORDER.includes(stage as LearningBookStageId)) {
    next = completeStage(next, stage as LearningBookStageId);
  }
  if (eventType === "progress" && typeof event.content === "string") {
    next = { ...next, message: event.content };
  }

  switch (kind) {
    case "proposal_ready":
      next = completeStage(startStage(next, "ideation"), "ideation");
      next = { ...next, message: "Proposal ready" };
      break;
    case "exploration_ready": {
      const queries = asNumber(metadata.queries);
      const coverage = asRecord(metadata.coverage);
      const chunks = Object.values(coverage).reduce<number>(
        (sum, value) => sum + asNumber(value),
        0,
      );
      next = completeStage(startStage(next, "exploration"), "exploration");
      next = {
        ...next,
        exploration: {
          queryCount: queries,
          chunkCount: chunks,
          candidateConcepts: asNumber(metadata.candidate_concepts),
          summary: asString(metadata.summary).slice(0, 220),
        },
        message: `Source sweep done - ${queries} queries, ${chunks} chunks`,
      };
      next = patchStage(next, "exploration", {
        detail: `${queries} queries / ${chunks} chunks`,
      });
      break;
    }
    case "spine_round": {
      const round = asString(metadata.round);
      const isCritique = round.startsWith("critique");
      const targetStage = isCritique ? "critique" : "synthesis";
      const issues = asNumber(metadata.issue_count);
      const chapters = asNumber(metadata.chapter_count);
      const verdict = asString(metadata.verdict);
      next = startStage(next, targetStage);
      if (isCritique) {
        const rounds = next.critique.rounds + 1;
        next = {
          ...next,
          critique: { rounds, issues },
        };
        next = patchStage(next, "critique", {
          detail: `${rounds} rounds / ${issues} issues`,
        });
      } else {
        const rounds = next.synthesis.rounds + 1;
        next = {
          ...next,
          synthesis: {
            ...next.synthesis,
            rounds,
            chapterCount: chapters || next.synthesis.chapterCount,
            lastVerdict: verdict,
          },
        };
        next = patchStage(next, "synthesis", {
          detail: `${rounds} rounds / ${next.synthesis.chapterCount || 0} chapters`,
        });
      }
      next = { ...next, message: `${round}${verdict ? ` / ${verdict}` : ""}` };
      break;
    }
    case "spine_ready": {
      const chapters = asNumber(metadata.chapter_count);
      const nodes = asNumber(metadata.concept_node_count);
      const edges = asNumber(metadata.concept_edge_count);
      next = completeStage(startStage(next, "synthesis"), "synthesis");
      next =
        next.critique.rounds > 0
          ? completeStage(next, "critique")
          : patchStage(next, "critique", { state: "completed" });
      next = {
        ...next,
        synthesis: {
          ...next.synthesis,
          chapterCount: chapters,
          conceptNodes: nodes,
          conceptEdges: edges,
        },
        message: `Spine ready - ${chapters} chapters / ${nodes} concepts`,
      };
      next = patchStage(next, "synthesis", {
        detail: `${chapters} chapters / ${nodes} concepts`,
      });
      break;
    }
    case "page_planning":
      next = startStage(next, "compilation");
      next = {
        ...next,
        compilation: {
          ...next.compilation,
          pagesPlanned: next.compilation.pagesPlanned + 1,
        },
      };
      break;
    case "page_planned":
      next = startStage(next, "compilation");
      break;
    case "block_ready":
      next = {
        ...next,
        compilation: {
          ...next.compilation,
          blocksReady: next.compilation.blocksReady + 1,
        },
      };
      break;
    case "block_error":
      next = {
        ...next,
        compilation: {
          ...next.compilation,
          blocksError: next.compilation.blocksError + 1,
        },
      };
      next = patchStage(next, "compilation", { state: "error" });
      break;
    case "page_compiled":
    case "page_ready":
      next = startStage(next, "compilation");
      next = {
        ...next,
        compilation: {
          ...next.compilation,
          pagesReady: next.compilation.pagesReady + 1,
        },
      };
      next = patchStage(next, "overview", { state: "completed", endedAt: Date.now() });
      next = patchStage(next, "compilation", {
        detail: `${next.compilation.pagesReady} pages / ${next.compilation.blocksReady} blocks`,
      });
      break;
    case "overview_ready":
      next = completeStage(startStage(next, "overview"), "overview");
      break;
    case "compilation_complete":
      next = completeStage(next, "compilation");
      next = { ...next, message: "Book compilation complete" };
      break;
    default:
      break;
  }

  if (eventType === "error") {
    const running = LEARNING_BOOK_STAGE_ORDER.find((id) => next.stages[id].state === "running");
    if (running) {
      next = patchStage(next, running, {
        state: "error",
        detail: asString(event.content) || "error",
      });
    }
  }

  return next;
}

export function learningBookProgressHasActivity(progress: LearningBookProgress) {
  return LEARNING_BOOK_STAGE_ORDER.some((id) => progress.stages[id].state !== "pending");
}

export function learningBookProgressIsComplete(progress: LearningBookProgress) {
  if (!learningBookProgressHasActivity(progress)) return false;
  return LEARNING_BOOK_STAGE_ORDER.every((id) => {
    const state = progress.stages[id].state;
    return state === "completed" || state === "error";
  });
}
