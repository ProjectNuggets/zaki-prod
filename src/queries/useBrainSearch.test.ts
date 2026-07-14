import type { BrainSearchResponse } from "@/lib/api";
import { sanitizeBrainSearchResponse } from "./useBrainSearch";

describe("sanitizeBrainSearchResponse", () => {
  it("removes assistant scaffold before mention and pin consumers receive results", () => {
    const response: BrainSearchResponse = {
      results: [
        {
          id: "memory-1",
          key: "stable-key",
          kind: "core",
          created_at: 1,
          session_id: null,
          summary: "Useful summary <memory_for_turn>private summary</memory_for_turn>",
          display_label: "Useful label [[ZAKI_MEMORY_CONTEXT_V2]]private label[[/ZAKI_MEMORY_CONTEXT_V2]]",
          community_name: "Useful theme <memory_context>private theme</memory_context>",
          source_snippet: "Useful source [[ZAKI_DOC_CONTEXT_V1]]private source[[/ZAKI_DOC_CONTEXT_V1]]",
          valid_to: null,
        },
      ],
    };

    expect(sanitizeBrainSearchResponse(response)).toEqual({
      results: [
        expect.objectContaining({
          id: "memory-1",
          key: "stable-key",
          summary: "Useful summary",
          display_label: "Useful label",
          community_name: "Useful theme",
          source_snippet: "Useful source",
        }),
      ],
    });
  });
});
