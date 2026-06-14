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
});
