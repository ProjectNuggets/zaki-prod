import { isToolFireEvent, extractGeneratedFile } from "./agent-stream-signals.js";
test("detects tool-exec agentThought + fileDownload", () => {
  expect(isToolFireEvent({ type: "agentThought", thought: "@agent is executing `web-browsing` tool {}" })).toBe(true);
  expect(isToolFireEvent({ type: "agentThought", thought: "Using DuckDuckGo to search for \"x\"" })).toBe(true);
  expect(isToolFireEvent({ type: "agentThought", thought: "@agent: Scraping the content of https://x" })).toBe(true);
  expect(isToolFireEvent({ type: "fileDownload", fileDownload: { storageFilename: "text-1.csv" } })).toBe(true);
});
test("does NOT fire on plain thoughts or answer chunks", () => {
  expect(isToolFireEvent({ type: "agentThought", thought: "Let me think about this." })).toBe(false);
  expect(isToolFireEvent({ type: "textResponseChunk", textResponse: "hello" })).toBe(false);
  expect(isToolFireEvent(null)).toBe(false);
});
test("extracts a generated-file reference", () => {
  expect(extractGeneratedFile({ type: "fileDownload", fileDownload: { filename: "a.csv", storageFilename: "text-1.csv", fileSize: 10 } }))
    .toEqual({ filename: "a.csv", storageFilename: "text-1.csv", fileSize: 10 });
  expect(extractGeneratedFile({ type: "fileDownload", fileDownload: {} })).toBeNull();
  expect(extractGeneratedFile({ type: "agentThought", thought: "x" })).toBeNull();
});
