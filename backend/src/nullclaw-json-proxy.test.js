import { describe, expect, test } from "@jest/globals";
import {
  NullclawJsonProxyError,
  assertJsonProxyContentLength,
  parseRequiredJson,
  readResponseTextWithLimit,
} from "./nullclaw-json-proxy.js";

function responseFromChunks(chunks, headers = {}) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(Buffer.from(chunk));
        }
        controller.close();
      },
    }),
    { headers }
  );
}

describe("nullclaw json proxy helpers", () => {
  test("reads a complete JSON response across chunks", async () => {
    const response = responseFromChunks(["{\"nodes\":", "[],\"edges\":[]}"], {
      "content-length": "22",
    });

    await expect(readResponseTextWithLimit(response, 1024)).resolves.toBe(
      "{\"nodes\":[],\"edges\":[]}"
    );
  });

  test("rejects declared bodies larger than the cap before reading", () => {
    expect(() => assertJsonProxyContentLength({ "content-length": "2048" }, 1024)).toThrow(
      NullclawJsonProxyError
    );
  });

  test("rejects streamed bodies larger than the cap", async () => {
    const response = responseFromChunks(["12345", "67890"]);

    await expect(readResponseTextWithLimit(response, 8)).rejects.toMatchObject({
      code: "upstream_response_too_large",
    });
  });

  test("parseRequiredJson throws instead of hiding invalid JSON", () => {
    expect(() => parseRequiredJson("{\"nodes\":[", "brain/graph")).toThrow(
      NullclawJsonProxyError
    );
  });
});
