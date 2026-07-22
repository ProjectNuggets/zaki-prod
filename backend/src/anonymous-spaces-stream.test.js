import { describe, expect, it, jest } from "@jest/globals";
import { EventEmitter } from "node:events";
import {
  bindAnonymousSpacesClientAbort,
  buildAnonymousSpacesStreamFailure,
  streamAnonymousSpacesReply,
} from "./anonymous-spaces-stream.js";

function fragmentedSseResponse(parts) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const part of parts) controller.enqueue(encoder.encode(part));
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } }
  );
}

describe("anonymous Spaces provider streaming", () => {
  it("never marks an anonymous provider failure replay-safe while quota is per request", () => {
    expect(
      buildAnonymousSpacesStreamFailure(
        Object.assign(new Error("provider overloaded"), { status: 503 })
      )
    ).toEqual({
      code: "anonymous_chat_error",
      message: "provider overloaded",
      retryable: false,
    });
    expect(
      buildAnonymousSpacesStreamFailure(
        Object.assign(new Error("invalid provider key"), { status: 401 })
      ).retryable
    ).toBe(false);
  });

  it("captures a client abort that happened before provider stream setup", () => {
    const request = new EventEmitter();
    request.aborted = true;
    const response = new EventEmitter();
    response.destroyed = false;
    const controller = new AbortController();

    const dispose = bindAnonymousSpacesClientAbort({ request, response, controller });

    expect(controller.signal.aborted).toBe(true);
    dispose();
  });

  it("forwards native Together deltas as they arrive and returns the complete reply", async () => {
    const fetchImpl = jest.fn(async () =>
      fragmentedSseResponse([
        'data: {"choices":[{"delta":{"content":"Hel',
        'lo"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        "data: [DONE]\n\n",
      ])
    );
    const deltas = [];

    const result = await streamAnonymousSpacesReply({
      fetchImpl,
      apiKey: "test-key",
      model: "test-model",
      message: "Say hello",
      timeoutMs: 1000,
      onDelta: (delta) => deltas.push(delta),
    });

    expect(result).toEqual({ text: "Hello world" });
    expect(deltas).toEqual(["Hello", " world"]);
    const [, request] = fetchImpl.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual(
      expect.objectContaining({ stream: true, model: "test-model" })
    );
    expect(request.headers.Accept).toBe("text/event-stream");
  });

  it("parses CRLF event boundaries split across provider chunks", async () => {
    const fetchImpl = jest.fn(async () =>
      fragmentedSseResponse([
        'data: {"choices":[{"delta":{"content":"Split"}}]}\r',
        '\n\r',
        '\ndata: [DONE]\r\n\r\n',
      ])
    );

    await expect(
      streamAnonymousSpacesReply({
        fetchImpl,
        apiKey: "test-key",
        model: "test-model",
        message: "Hello",
        timeoutMs: 1000,
      })
    ).resolves.toEqual({ text: "Split" });
  });

  it("aborts the provider stream and exposes the partial text when the caller stops", async () => {
    const caller = new AbortController();
    let providerSignal;
    const encoder = new TextEncoder();
    const fetchImpl = jest.fn(async (_url, request) => {
      providerSignal = request.signal;
      let reads = 0;
      return {
        ok: true,
        status: 200,
        body: {
          getReader() {
            return {
              read() {
                reads += 1;
                if (reads === 1) {
                  return Promise.resolve({
                    done: false,
                    value: encoder.encode(
                      'data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n'
                    ),
                  });
                }
                return Promise.reject(
                  request.signal.reason || new DOMException("Stopped", "AbortError")
                );
              },
            };
          },
        },
      };
    });

    const promise = streamAnonymousSpacesReply({
      fetchImpl,
      apiKey: "test-key",
      model: "test-model",
      message: "Start",
      signal: caller.signal,
      timeoutMs: 1000,
      onDelta: () => caller.abort(),
    });

    await expect(promise).rejects.toMatchObject({
      name: "AbortError",
      partialText: "Partial",
    });
    expect(providerSignal.aborted).toBe(true);
  });

  it("surfaces a provider HTTP failure without manufacturing an answer", async () => {
    const fetchImpl = jest.fn(async () =>
      new Response(JSON.stringify({ error: { message: "provider overloaded" } }), {
        status: 503,
        headers: { "content-type": "application/json" },
      })
    );

    await expect(
      streamAnonymousSpacesReply({
        fetchImpl,
        apiKey: "test-key",
        model: "test-model",
        message: "Hello",
        timeoutMs: 1000,
      })
    ).rejects.toMatchObject({ message: "provider overloaded", status: 503 });
  });
});
