import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { callNovaTypChat, parseJsonObjectFromText } from "./nova-chat.js";

describe("nova memory chat helper", () => {
  const originalBaseUrl = process.env.NOVA_TYP_BASE_URL;
  const originalApiKey = process.env.NOVA_TYP_API_KEY;
  const originalDefaultWorkspace = process.env.ZAKI_DEFAULT_WORKSPACE_SLUG;
  const originalMemoryWorkspace = process.env.ZAKI_MEMORY_WORKSPACE_SLUG;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NOVA_TYP_BASE_URL = "https://example.com";
    process.env.NOVA_TYP_API_KEY = "test-key";
    process.env.ZAKI_DEFAULT_WORKSPACE_SLUG = "zaky";
    delete process.env.ZAKI_MEMORY_WORKSPACE_SLUG;
    global.fetch = originalFetch;
  });

  afterEach(() => {
    process.env.NOVA_TYP_BASE_URL = originalBaseUrl;
    process.env.NOVA_TYP_API_KEY = originalApiKey;
    process.env.ZAKI_DEFAULT_WORKSPACE_SLUG = originalDefaultWorkspace;
    if (originalMemoryWorkspace === undefined) {
      delete process.env.ZAKI_MEMORY_WORKSPACE_SLUG;
    } else {
      process.env.ZAKI_MEMORY_WORKSPACE_SLUG = originalMemoryWorkspace;
    }
    global.fetch = originalFetch;
  });

  it("uses openai-compatible route when available", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "{\"ok\":true}" } }],
      }),
    });
    global.fetch = fetchMock;

    const result = await callNovaTypChat({
      messages: [{ role: "user", content: "hello" }],
      jsonMode: true,
      timeoutMs: 1000,
      label: "test-openai",
    });

    expect(result.transport).toBe("openai_compat");
    expect(result.content).toBe("{\"ok\":true}");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://example.com/api/v1/openai/chat/completions"
    );
  });

  it("falls back to workspace chat when openai-compatible route fails", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          textResponse: "{\"ok\":true}",
        }),
      });
    global.fetch = fetchMock;

    const result = await callNovaTypChat({
      messages: [{ role: "user", content: "hello" }],
      jsonMode: true,
      timeoutMs: 1000,
      label: "test-fallback",
    });

    expect(result.transport).toBe("workspace_chat");
    expect(result.content).toBe("{\"ok\":true}");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://example.com/api/v1/workspace/zaky/chat"
    );
  });

  it("parses json objects from fenced and wrapped text", () => {
    expect(parseJsonObjectFromText("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
    expect(parseJsonObjectFromText("Result:\n{\"b\":2}\nThanks")).toEqual({ b: 2 });
  });
});
