import { describe, expect, it } from "@jest/globals";
import {
  emptyLearningBookProgress,
  getLearningBookProgressEventBookId,
  learningBookProgressEventShouldRefresh,
  learningBookProgressHasActivity,
  reduceLearningBookProgressEvent,
} from "./learningBookProgress";

describe("learning book progress", () => {
  it("reduces upstream book events into ordered ZAKI progress state", () => {
    let progress = emptyLearningBookProgress();
    progress = reduceLearningBookProgressEvent(progress, {
      type: "progress",
      content: "Gathering sources",
      metadata: { book_id: "book-1" },
    });
    progress = reduceLearningBookProgressEvent(progress, {
      content: "proposal_ready",
      metadata: { book_id: "book-1" },
    });
    progress = reduceLearningBookProgressEvent(progress, {
      content: "exploration_ready",
      metadata: {
        book_id: "book-1",
        queries: ["one", "two"],
        coverage: { a: [1, 2], b: [3] },
      },
    });
    progress = reduceLearningBookProgressEvent(progress, {
      content: "spine_ready",
      metadata: {
        chapter_count: 4,
        concept_node_count: 9,
        concept_edge_count: 12,
      },
    });
    progress = reduceLearningBookProgressEvent(progress, {
      content: "page_compiled",
    });

    expect(progress.bookId).toBe("book-1");
    expect(progress.stages.ideation.state).toBe("completed");
    expect(progress.stages.exploration.state).toBe("completed");
    expect(progress.stages.synthesis.state).toBe("completed");
    expect(progress.stages.overview.state).toBe("completed");
    expect(progress.stages.compilation.state).toBe("running");
    expect(progress.exploration.queryCount).toBe(2);
    expect(progress.exploration.chunkCount).toBe(3);
    expect(progress.synthesis.chapterCount).toBe(4);
    expect(progress.compilation.pagesReady).toBe(1);
    expect(learningBookProgressHasActivity(progress)).toBe(true);
  });

  it("detects refresh-worthy events and book ids from metadata", () => {
    const event = {
      content: "block_ready",
      metadata: { book_id: "book-2" },
    };

    expect(getLearningBookProgressEventBookId(event)).toBe("book-2");
    expect(learningBookProgressEventShouldRefresh(event)).toBe(true);
    expect(
      learningBookProgressEventShouldRefresh({
        type: "progress",
        content: "still working",
      }),
    ).toBe(false);
  });
});
