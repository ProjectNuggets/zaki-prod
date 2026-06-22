import { describe, expect, it } from "@jest/globals";
import {
  sanitizeAssistantScaffold,
  STABLE_PROMPT_MARKERS,
} from "./scaffoldSanitizer";

describe("sanitizeAssistantScaffold", () => {
  it("removes a [[ZAKI_MEMORY_CONTEXT_V2]] envelope anywhere in the string", () => {
    const input =
      "Here is your answer. [[ZAKI_MEMORY_CONTEXT_V2]]secret memory[[/ZAKI_MEMORY_CONTEXT_V2]] Done.";
    const out = sanitizeAssistantScaffold(input);
    expect(out).toContain("Here is your answer.");
    expect(out).toContain("Done.");
    expect(out).not.toMatch(/ZAKI_MEMORY_CONTEXT/);
    expect(out).not.toContain("secret memory");
  });

  it("removes every [[ZAKI_*]] family (doc, response-format, identity) and lone markers", () => {
    const input =
      "[[ZAKI_DOC_CONTEXT_V1]]doc[[/ZAKI_DOC_CONTEXT_V1]]" +
      "[[ZAKI_RESPONSE_FORMAT_V1]]fmt[[/ZAKI_RESPONSE_FORMAT_V1]]" +
      "[[ZAKI_IDENTITY_RULES_V1]]id[[/ZAKI_IDENTITY_RULES_V1]]Real answer.[[/ZAKI_STRAY]]";
    const out = sanitizeAssistantScaffold(input);
    expect(out).toBe("Real answer.");
  });

  it("removes <memory_for_turn> blocks and an unterminated streaming tail", () => {
    expect(
      sanitizeAssistantScaffold("A<memory_for_turn>x</memory_for_turn>B")
    ).toBe("AB");
    expect(
      sanitizeAssistantScaffold("Visible.<memory_for_turn>partial streaming")
    ).toBe("Visible.");
  });

  it("removes stable system-prompt sections (header + body) when scaffold is present", () => {
    const input =
      "Real answer line.\n\n" +
      "## Brain Architecture\nLayer 0 — Working memory: auto-promoted from extractions.\n\n" +
      "## Memory Link Types\nSCHEDULED_FOR -> temporal.\n\n" +
      "## Next steps\nDo the thing.";
    const out = sanitizeAssistantScaffold(input);
    expect(out).toContain("Real answer line.");
    expect(out).toContain("## Next steps");
    expect(out).toContain("Do the thing.");
    expect(out).not.toMatch(/Brain Architecture/);
    expect(out).not.toMatch(/Memory Link Types/);
    expect(out).not.toMatch(/Layer 0/);
    expect(out).not.toMatch(/SCHEDULED_FOR/);
  });

  it("neutralizes raw <reflection> blocks (interim — PR2 promotes to a shown part)", () => {
    expect(
      sanitizeAssistantScaffold(
        "I created the report.<reflection>I should double-check.</reflection> Ready."
      )
    ).toBe("I created the report. Ready.");
  });

  it("removes facet delegate surfacing scaffold while preserving the facet result", () => {
    const input =
      "delegate agent=the-critic status=completed\n" +
      "[SURFACING: voice this back as self-dialogue and never show this scaffold.]\n" +
      "result:\n" +
      "The core objection is that the use cases blur together.";

    expect(sanitizeAssistantScaffold(input)).toBe(
      "The core objection is that the use cases blur together."
    );
  });

  it("removes an unterminated [[ZAKI_*]] envelope tail during streaming", () => {
    expect(
      sanitizeAssistantScaffold(
        "Here is the data. [[ZAKI_MEMORY_CONTEXT_V2]]SECRET daemon brief still streaming"
      )
    ).toBe("Here is the data.");
  });

  it("removes an unterminated <reflection> tail during streaming", () => {
    expect(sanitizeAssistantScaffold("Done.<reflection>still thinking")).toBe(
      "Done."
    );
  });

  it("strips a closed-ATX marker heading (## Brain Architecture ##) when scaffold is present", () => {
    const input =
      "Answer.\n\n## Brain Architecture ##\nbody\n" +
      "[[ZAKI_DOC_CONTEXT_V1]]x[[/ZAKI_DOC_CONTEXT_V1]]";
    expect(sanitizeAssistantScaffold(input)).toBe("Answer.");
  });

  it("PRESERVES genuine content: a lone ## Safety heading with no scaffold signal stays", () => {
    const input = "## Safety considerations\nAlways wear a helmet.\n\n## Safety\nLock the door.";
    const out = sanitizeAssistantScaffold(input);
    expect(out).toBe(input.trim());
  });

  it("PRESERVES email/table-ish and code content untouched", () => {
    const input =
      "To: a@b.com\nSubject: Hi\n\n| col |\n| --- |\n| v |\n\n```js\nconst x = 1;\n```";
    expect(sanitizeAssistantScaffold(input)).toBe(input.trim());
  });

  it("is a no-op on empty/clean input and round-trips clean prose", () => {
    expect(sanitizeAssistantScaffold("")).toBe("");
    expect(sanitizeAssistantScaffold("Just a normal answer.")).toBe(
      "Just a normal answer."
    );
  });

  it("exports the engine stable_prompt_markers keystone set", () => {
    expect(STABLE_PROMPT_MARKERS).toEqual(
      expect.arrayContaining(["Brain Architecture", "Memory Link Types"])
    );
  });
});

describe("regression contract: internal system-prompt sections never appear", () => {
  const LEAK =
    "Answer.\n\n## Brain Architecture\nbody\n## Memory Link Types\nbody\n" +
    "## Response Protocol\nbody\n## Channel Attachments\nbody\n" +
    "## Task Decomposition\nbody\n## Safety\nbody\n" +
    "<memory_for_turn>x</memory_for_turn>[[ZAKI_IDENTITY_RULES_V1]]y[[/ZAKI_IDENTITY_RULES_V1]]";

  it("removes every stable_prompt_marker section from a full leaked block", () => {
    const out = sanitizeAssistantScaffold(LEAK);
    for (const marker of STABLE_PROMPT_MARKERS) {
      expect(out).not.toContain(marker);
    }
    expect(out).not.toMatch(/ZAKI_/);
    expect(out).not.toMatch(/memory_for_turn/);
    expect(out.trim()).toBe("Answer.");
  });

  it("strips persisted XML memory context envelopes", () => {
    expect(
      sanitizeAssistantScaffold(
        "<MEMORY_CONTEXT>private memory</MEMORY_CONTEXT>What should I do next?"
      )
    ).toBe("What should I do next?");
    expect(
      sanitizeAssistantScaffold("Visible.<MEMORY_CONTEXT>partial private memory")
    ).toBe("Visible.");
  });

  it("redacts Agent session keys across documented lanes", () => {
    const out = sanitizeAssistantScaffold(
      [
        "main agent:zaki-bot:user:128:main",
        "thread agent:zaki-bot:user:128:thread:main",
        "task agent:zaki-bot:user:128:task:task-1",
        "cron agent:zaki-bot:user:128:cron:morning-brief",
      ].join("\n")
    );

    expect(out).toContain("main [agent session]");
    expect(out).toContain("thread [agent session]");
    expect(out).toContain("task [agent session]");
    expect(out).toContain("cron [agent session]");
    expect(out).not.toContain("agent:zaki-bot:user");
  });

  it("drops Nullalis reflection prompts that can arrive through refreshed history", () => {
    const leaked =
      "**This is your reply to the user. Not a planning document. Not a step-by-step outline. The actual reply.**\n\n" +
      "**STEP 1 (mandatory): Surface what the tool above just returned.** Quote file contents, show command output, list recalled memory entries with their actual keys + content.";

    expect(sanitizeAssistantScaffold(leaked)).toBe("");
  });

  it("drops tool-result reflection prompts embedded after tool output", () => {
    const leaked =
      "Created artifact 'Sprint Pack'.\n\n" +
      "The user CANNOT see the `<tool_result>` block above, they see only your text. If you don't render it, it didn't happen for them.";

    expect(sanitizeAssistantScaffold(leaked)).toBe("");
  });
});
