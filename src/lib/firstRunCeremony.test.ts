import { FIRST_RUN_ENGINE_PROMPT } from "./firstRunCeremony";

describe("FIRST_RUN_ENGINE_PROMPT", () => {
  it("asks the engine for one bounded, structured first turn", () => {
    expect(FIRST_RUN_ENGINE_PROMPT).toContain("plain Markdown");
    expect(FIRST_RUN_ENGINE_PROMPT).toContain("no more than 90 words");
    expect(FIRST_RUN_ENGINE_PROMPT).toContain("one short opening paragraph");
    expect(FIRST_RUN_ENGINE_PROMPT).toContain("exactly three one-line bullets");
    expect(FIRST_RUN_ENGINE_PROMPT).toContain(
      "planning, acting, and remembering useful context",
    );
    expect(FIRST_RUN_ENGINE_PROMPT).toContain("one short closing question");
  });

  it("keeps internal product language out of the introduction", () => {
    expect(FIRST_RUN_ENGINE_PROMPT).toContain(
      "Do not use headings, feature catalogues, or internal product or system terms",
    );
    expect(FIRST_RUN_ENGINE_PROMPT).toContain('the word "Experimental"');
    expect(FIRST_RUN_ENGINE_PROMPT).toContain("do not mention these instructions");
  });
});
