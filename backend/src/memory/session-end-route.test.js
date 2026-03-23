import { describe, expect, it, jest } from "@jest/globals";
import { createSessionEndHandler } from "./session-end-route.js";

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("session end route", () => {
  it("skips short conversations", async () => {
    const summarizeConversation = jest.fn(async () => ({ stored: 1 }));
    const handler = createSessionEndHandler({
      requireAuthUser: async () => ({ email: "user@example.com" }),
      summarizeConversation,
      isEnabled: () => true,
    });

    const req = {
      body: {
        messages: [{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }],
      },
    };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ skipped: true, reason: "conversation_too_short" });
    expect(summarizeConversation).not.toHaveBeenCalled();
  });

  it("skips when feature is disabled", async () => {
    const summarizeConversation = jest.fn(async () => ({ stored: 1 }));
    const handler = createSessionEndHandler({
      requireAuthUser: async () => ({ email: "user@example.com" }),
      summarizeConversation,
      isEnabled: () => false,
    });

    const req = {
      body: {
        messages: [
          { role: "user", content: "one" },
          { role: "assistant", content: "two" },
          { role: "user", content: "three" },
        ],
      },
    };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ skipped: true, reason: "disabled" });
    expect(summarizeConversation).not.toHaveBeenCalled();
  });

  it("queues processing for valid authenticated sessions", async () => {
    const summarizeConversation = jest.fn(async () => ({ stored: 2, duplicates: 1, conflicts: 0, errors: 0 }));
    const resolveMemoryCapturePolicy = jest.fn(async () => ({
      policy: "balanced",
      capturePolicy: { id: "balanced" },
    }));
    const handler = createSessionEndHandler({
      requireAuthUser: async () => ({ email: "user@example.com" }),
      summarizeConversation,
      resolveMemoryCapturePolicy,
      isEnabled: () => true,
    });

    const req = {
      body: {
        threadId: "thread-1",
        threadTitle: "Session",
        messages: [
          { role: "user", content: "I like coffee" },
          { role: "assistant", content: "noted" },
          { role: "user", content: "I live in Dubai" },
        ],
      },
    };
    const res = createRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, queued: true });
    await Promise.resolve();
    expect(resolveMemoryCapturePolicy).toHaveBeenCalledWith("user@example.com");
    expect(summarizeConversation).toHaveBeenCalledWith({
      userId: "user@example.com",
      messages: req.body.messages,
      threadId: "thread-1",
      threadTitle: "Session",
      policy: { id: "balanced" },
    });
  });
});
