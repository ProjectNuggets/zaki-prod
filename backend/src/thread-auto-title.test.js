import { describe, expect, it, jest } from "@jest/globals";
import {
  DEFAULT_THREAD_LABEL,
  createThreadAutoTitleHandler,
  isDefaultThreadLabel,
  sanitizeGeneratedThreadTitle,
} from "./thread-auto-title.js";

function createMockRes() {
  return {
    statusCode: 200,
    jsonBody: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.jsonBody = payload;
      return this;
    },
  };
}

describe("thread auto-title", () => {
  it("treats placeholder labels as default", () => {
    expect(isDefaultThreadLabel("")).toBe(true);
    expect(isDefaultThreadLabel(DEFAULT_THREAD_LABEL)).toBe(true);
    expect(isDefaultThreadLabel("Thread")).toBe(true);
    expect(isDefaultThreadLabel("Travel plan")).toBe(false);
  });

  it("sanitizes generated titles", () => {
    expect(sanitizeGeneratedThreadTitle(' "Travel budget for Berlin." ')).toBe(
      "Travel budget for Berlin"
    );
    expect(sanitizeGeneratedThreadTitle("Conversation")).toBe("");
  });

  it("skips when the persisted thread is already named", async () => {
    const requireWorkspaceAccess = jest.fn(async () => ({ slug: "space-1" }));
    const novaAdminRequest = jest
      .fn(async () => ({
        ok: true,
        json: async () => ({
          workspace: {
            threads: [{ slug: "thread-1", name: "Custom title" }],
          },
        }),
      }));
    const chatFn = jest.fn();
    const handler = createThreadAutoTitleHandler({
      requireWorkspaceAccess,
      novaAdminRequest,
      chatFn,
    });
    const req = {
      params: { threadSlug: "thread-1" },
      body: { userMessage: "Hello", assistantMessage: "Hi there" },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(chatFn).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ status: "skipped", reason: "not_default_label" });
  });

  it("updates the thread when title generation succeeds", async () => {
    const requireWorkspaceAccess = jest.fn(async () => ({ slug: "space-1" }));
    const novaAdminRequest = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workspace: {
            threads: [{ slug: "thread-1", name: DEFAULT_THREAD_LABEL }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workspaces: [
            {
              slug: "space-1",
              threads: [{ slug: "thread-1", name: DEFAULT_THREAD_LABEL }],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          history: [
            { role: "user", content: "Help me budget a Berlin trip" },
            { role: "assistant", content: "Let's break down flights and hotel costs." },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          thread: { slug: "thread-1", name: "Travel budget for Berlin" },
        }),
      });
    const chatFn = jest.fn(async () => ({
      content: JSON.stringify({ title: "Travel budget for Berlin" }),
    }));
    const handler = createThreadAutoTitleHandler({
      requireWorkspaceAccess,
      novaAdminRequest,
      chatFn,
    });
    const req = {
      params: { threadSlug: "thread-1" },
      body: { userMessage: "Help me budget a Berlin trip", assistantMessage: "Let's break down flights and hotel costs." },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(chatFn).toHaveBeenCalled();
    expect(novaAdminRequest).toHaveBeenLastCalledWith(
      "/v1/workspace/space-1/thread/thread-1/update",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Travel budget for Berlin" }),
      })
    );
    expect(res.jsonBody).toEqual({
      status: "updated",
      thread: { slug: "thread-1", name: "Travel budget for Berlin" },
    });
  });

  it("handles workspace and update payloads that use id/label fields", async () => {
    const requireWorkspaceAccess = jest.fn(async () => ({ slug: "space-1" }));
    const novaAdminRequest = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workspace: {
            threads: [{ id: "thread-1", label: DEFAULT_THREAD_LABEL }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workspaces: [
            {
              slug: "space-1",
              threads: [{ id: "thread-1", label: DEFAULT_THREAD_LABEL }],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          history: [
            { role: "user", content: "Budget trip to Berlin" },
            { role: "assistant", content: "Here is a cheap 3-day plan." },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          thread: { id: "thread-1", label: "Berlin budget trip" },
        }),
      });
    const chatFn = jest.fn(async () => ({
      content: JSON.stringify({ title: "Berlin budget trip" }),
    }));
    const handler = createThreadAutoTitleHandler({
      requireWorkspaceAccess,
      novaAdminRequest,
      chatFn,
    });
    const req = {
      params: { threadSlug: "thread-1" },
      body: { userMessage: "Budget trip to Berlin", assistantMessage: "Here is a cheap 3-day plan." },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({
      status: "updated",
      thread: { slug: "thread-1", name: "Berlin budget trip" },
    });
  });

  it("handles upstream workspace arrays when locating the thread", async () => {
    const requireWorkspaceAccess = jest.fn(async () => ({ slug: "space-1" }));
    const novaAdminRequest = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workspace: [
            {
              threads: [{ slug: "thread-1", name: DEFAULT_THREAD_LABEL }],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workspaces: [
            {
              slug: "space-1",
              threads: [{ slug: "thread-1", name: DEFAULT_THREAD_LABEL }],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          history: [
            { role: "user", content: "Plan a Lisbon weekend" },
            { role: "assistant", content: "Here is a compact itinerary." },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          thread: { slug: "thread-1", name: "Lisbon weekend itinerary" },
        }),
      });
    const chatFn = jest.fn(async () => ({
      content: JSON.stringify({ title: "Lisbon weekend itinerary" }),
    }));
    const handler = createThreadAutoTitleHandler({
      requireWorkspaceAccess,
      novaAdminRequest,
      chatFn,
    });
    const req = {
      params: { threadSlug: "thread-1" },
      body: { userMessage: "Plan a Lisbon weekend", assistantMessage: "Here is a compact itinerary." },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.jsonBody).toEqual({
      status: "updated",
      thread: { slug: "thread-1", name: "Lisbon weekend itinerary" },
    });
  });

  it("returns generation_failed when the model output is unusable", async () => {
    const requireWorkspaceAccess = jest.fn(async () => ({ slug: "space-1" }));
    const novaAdminRequest = jest.fn(async () => ({
      ok: true,
      json: async () =>
        novaAdminRequest.mock.calls.length === 1
          ? {
              workspace: {
                threads: [{ slug: "thread-1", name: DEFAULT_THREAD_LABEL }],
              },
            }
          : {
              history: [
                { role: "user", content: "Hello" },
                { role: "assistant", content: "Hi there" },
              ],
            },
    }));
    const chatFn = jest.fn(async () => ({
      content: JSON.stringify({ title: "Conversation" }),
    }));
    const handler = createThreadAutoTitleHandler({
      requireWorkspaceAccess,
      novaAdminRequest,
      chatFn,
    });
    const req = {
      params: { threadSlug: "thread-1" },
      body: { userMessage: "Hello", assistantMessage: "Hi there" },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ status: "skipped", reason: "generation_failed" });
  });

  it("prefers the persisted first exchange from thread history over the current client exchange", async () => {
    const requireWorkspaceAccess = jest.fn(async () => ({ slug: "space-1" }));
    const novaAdminRequest = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workspace: {
            threads: [{ slug: "thread-1", name: DEFAULT_THREAD_LABEL }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workspaces: [
            {
              slug: "space-1",
              threads: [{ slug: "thread-1", name: DEFAULT_THREAD_LABEL }],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          history: [
            { role: "user", content: "Original first prompt" },
            { role: "assistant", content: "Original first reply" },
            { role: "user", content: "Later prompt" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          thread: { slug: "thread-1", name: "Original thread title" },
        }),
      });
    const chatFn = jest.fn(async () => ({
      content: JSON.stringify({ title: "Original thread title" }),
    }));
    const handler = createThreadAutoTitleHandler({
      requireWorkspaceAccess,
      novaAdminRequest,
      chatFn,
    });
    const req = {
      params: { threadSlug: "thread-1" },
      body: {
        userMessage: "Later prompt",
        assistantMessage: "Later reply",
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(chatFn).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("USER:\nOriginal first prompt"),
          }),
        ]),
      })
    );
  });
});
