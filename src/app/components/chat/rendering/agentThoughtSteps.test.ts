import { agentThoughtToStep } from "./agentThoughtSteps";

test("maps tool-exec thoughts to labeled steps", () => {
  expect(agentThoughtToStep('Using DuckDuckGo to search for "x"')?.kind).toBe("search");
  expect(agentThoughtToStep("@agent: Scraping the content of https://x")?.kind).toBe("scrape");
  expect(agentThoughtToStep("@agent is executing `create-text-file` tool {}")?.kind).toBe("file");
  expect(agentThoughtToStep("@agent is executing `web-browsing` tool {}")?.kind).toBe("search");
  expect(agentThoughtToStep("@agent is executing `rag-memory` tool {}")?.kind).toBe("docs");
  const plain = agentThoughtToStep("Let me think about this");
  expect(plain?.kind).toBe("thought");
});

test("returns a friendly label, not the raw @agent text", () => {
  const s = agentThoughtToStep('Using DuckDuckGo to search for "weather"');
  expect(s?.label.toLowerCase()).toContain("search");
  expect(s?.label).not.toContain("@agent");
});

test("maps web-scraping tool execution to scrape", () => {
  expect(agentThoughtToStep("@agent is executing `web-scraping` tool {}")?.kind).toBe("scrape");
});

test("maps successful file creation to file", () => {
  expect(
    agentThoughtToStep('@agent: Successfully created text file "report.txt"')?.kind
  ).toBe("file");
});

test("maps document search to docs", () => {
  expect(agentThoughtToStep("Searching your documents for context")?.kind).toBe("docs");
});

test("strips leading @agent prefix from a plain thought label", () => {
  const s = agentThoughtToStep("@agent: Let me think about this");
  expect(s?.kind).toBe("thought");
  expect(s?.label).not.toContain("@agent");
  expect(s?.label.toLowerCase()).toContain("think");
});

test("returns null for empty / whitespace thoughts", () => {
  expect(agentThoughtToStep("")).toBeNull();
  expect(agentThoughtToStep("   ")).toBeNull();
});
