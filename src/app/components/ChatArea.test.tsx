/**
 * ChatArea Component Tests
 * Frontend integration tests for ZAKI's main chat interface
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatArea } from "./ChatArea";
import { useChatStore } from "../../stores/chatStore";

// Mock the chat store
jest.mock("../../stores/chatStore");

describe("ChatArea Component", () => {
  const mockSendMessage = jest.fn();
  const mockStreamMessage = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useChatStore as jest.Mock).mockReturnValue({
      messages: [],
      isStreaming: false,
      error: null,
      sendMessage: mockSendMessage,
      streamMessage: mockStreamMessage,
      clearError: mockClearError,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ===========================================================================
  // Rendering
  // ===========================================================================

  describe("Rendering", () => {
    it("should render empty chat state", () => {
      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
      expect(screen.getByText("No messages yet")).toBeInTheDocument();
    });

    it("should render existing messages", () => {
      (useChatStore as jest.Mock).mockReturnValue({
        messages: [
          { id: "msg-1", role: "user", content: "Hello", timestamp: Date.now() },
          { id: "msg-2", role: "assistant", content: "Hi there!", timestamp: Date.now() },
        ],
        isStreaming: false,
        error: null,
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
      });

      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("Hi there!")).toBeInTheDocument();
    });

    it("should render streaming indicator", () => {
      (useChatStore as jest.Mock).mockReturnValue({
        messages: [{ id: "msg-1", role: "user", content: "Hello", timestamp: Date.now() }],
        isStreaming: true,
        error: null,
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
      });

      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByTestId("streaming-indicator")).toBeInTheDocument();
    });

    it("should render error message", () => {
      (useChatStore as jest.Mock).mockReturnValue({
        messages: [],
        isStreaming: false,
        error: "Failed to connect to server",
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
      });

      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByText("Failed to connect to server")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // User Input
  // ===========================================================================

  describe("User Input", () => {
    it("should update input value on type", async () => {
      const user = userEvent.setup();
      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      const input = screen.getByPlaceholderText("Type a message...");
      await user.type(input, "Hello ZAKI");
      
      expect(input).toHaveValue("Hello ZAKI");
    });

    it("should send message on Enter key", async () => {
      const user = userEvent.setup();
      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      const input = screen.getByPlaceholderText("Type a message...");
      await user.type(input, "Hello ZAKI");
      await user.keyboard("{Enter}");
      
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          workspaceId: "ws-1",
          threadId: "thread-1",
          content: "Hello ZAKI",
        });
      });
    });

    it("should not send empty message", async () => {
      const user = userEvent.setup();
      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      const input = screen.getByPlaceholderText("Type a message...");
      await user.type(input, "   ");
      await user.keyboard("{Enter}");
      
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it("should clear input after sending", async () => {
      const user = userEvent.setup();
      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      const input = screen.getByPlaceholderText("Type a message...");
      await user.type(input, "Hello ZAKI");
      await user.keyboard("{Enter}");
      
      await waitFor(() => {
        expect(input).toHaveValue("");
      });
    });

    it("should disable input while streaming", async () => {
      (useChatStore as jest.Mock).mockReturnValue({
        messages: [],
        isStreaming: true,
        error: null,
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
      });

      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      const input = screen.getByPlaceholderText("Type a message...");
      expect(input).toBeDisabled();
    });
  });

  // ===========================================================================
  // File Attachments
  // ===========================================================================

  describe("File Attachments", () => {
    it("should show file upload button", () => {
      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByRole("button", { name: /attach file/i })).toBeInTheDocument();
    });

    it("should handle file drop", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ files: [{ name: "test.pdf", url: "/uploads/test.pdf" }] }),
      });

      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      const dropZone = screen.getByTestId("chat-drop-zone");
      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      
      await act(async () => {
        fireEvent.drop(dropZone, {
          dataTransfer: {
            files: [file],
          },
        });
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/upload",
          expect.objectContaining({
            method: "POST",
            body: expect.any(FormData),
          })
        );
      });
    });

    it("should show uploaded file in message", async () => {
      (useChatStore as jest.Mock).mockReturnValue({
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "Check this file",
            attachments: [{ name: "document.pdf", type: "application/pdf", url: "/uploads/doc.pdf" }],
            timestamp: Date.now(),
          },
        ],
        isStreaming: false,
        error: null,
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
      });

      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByText("document.pdf")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /download/i })).toHaveAttribute("href", "/uploads/doc.pdf");
    });

    it("should reject files over 10MB", async () => {
      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      const dropZone = screen.getByTestId("chat-drop-zone");
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], "large.pdf", { type: "application/pdf" });
      
      await act(async () => {
        fireEvent.drop(dropZone, {
          dataTransfer: {
            files: [largeFile],
          },
        });
      });
      
      expect(await screen.findByText(/file too large/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Streaming
  // ===========================================================================

  describe("Streaming", () => {
    it("should show streaming message", () => {
      (useChatStore as jest.Mock).mockReturnValue({
        messages: [
          { id: "msg-1", role: "user", content: "Hello", timestamp: Date.now() },
          { id: "msg-2", role: "assistant", content: "Hi there, I'm thinking", timestamp: Date.now(), isStreaming: true },
        ],
        isStreaming: true,
        error: null,
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
      });

      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByText("Hi there, I'm thinking")).toBeInTheDocument();
      expect(screen.getByTestId("streaming-cursor")).toBeInTheDocument();
    });

    it("should append streamed content", async () => {
      const { rerender } = render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      // Initial empty state
      expect(screen.getByText("No messages yet")).toBeInTheDocument();
      
      // Simulate streaming update
      (useChatStore as jest.Mock).mockReturnValue({
        messages: [
          { id: "msg-1", role: "user", content: "Hello", timestamp: Date.now() },
          { id: "msg-2", role: "assistant", content: "Hi", timestamp: Date.now(), isStreaming: true },
        ],
        isStreaming: true,
        error: null,
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
      });
      
      rerender(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByText("Hi")).toBeInTheDocument();
      
      // Content grows
      (useChatStore as jest.Mock).mockReturnValue({
        messages: [
          { id: "msg-1", role: "user", content: "Hello", timestamp: Date.now() },
          { id: "msg-2", role: "assistant", content: "Hi there! How can I help?", timestamp: Date.now(), isStreaming: false },
        ],
        isStreaming: false,
        error: null,
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
      });
      
      rerender(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByText("Hi there! How can I help?")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe("Error Handling", () => {
    it("should show send error with retry button", () => {
      (useChatStore as jest.Mock).mockReturnValue({
        messages: [],
        isStreaming: false,
        error: "Network error: Failed to send message",
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
      });

      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByText("Network error: Failed to send message")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("should call clearError on dismiss", async () => {
      const user = userEvent.setup();
      
      (useChatStore as jest.Mock).mockReturnValue({
        messages: [],
        isStreaming: false,
        error: "Some error",
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
      });

      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      await user.click(screen.getByRole("button", { name: /dismiss/i }));
      
      expect(mockClearError).toHaveBeenCalled();
    });

    it("should show loading state during initial load", () => {
      (useChatStore as jest.Mock).mockReturnValue({
        messages: null, // Not loaded yet
        isStreaming: false,
        error: null,
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
        isLoading: true,
      });

      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Keyboard Shortcuts
  // ===========================================================================

  describe("Keyboard Shortcuts", () => {
    it("should send on Cmd+Enter", async () => {
      const user = userEvent.setup();
      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      const input = screen.getByPlaceholderText("Type a message...");
      await user.type(input, "Hello");
      await user.keyboard("{Meta>}{Enter}{/Meta}");
      
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalled();
      });
    });

    it("should insert newline on Shift+Enter", async () => {
      const user = userEvent.setup();
      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      const input = screen.getByPlaceholderText("Type a message...");
      await user.type(input, "Line 1");
      await user.keyboard("{Shift>}{Enter}{/Shift}");
      await user.type(input, "Line 2");
      
      expect(input).toHaveValue("Line 1\nLine 2");
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it("should escape to clear input", async () => {
      const user = userEvent.setup();
      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      const input = screen.getByPlaceholderText("Type a message...");
      await user.type(input, "Partial message");
      await user.keyboard("{Escape}");
      
      expect(input).toHaveValue("");
    });
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByRole("main", { name: /chat area/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /message input/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
    });

    it("should announce new messages", async () => {
      (useChatStore as jest.Mock).mockReturnValue({
        messages: [
          { id: "msg-1", role: "assistant", content: "New message", timestamp: Date.now() },
        ],
        isStreaming: false,
        error: null,
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
      });

      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByRole("log", { name: /message list/i })).toHaveAttribute("aria-live", "polite");
    });

    it("should trap focus in modal dialogs", async () => {
      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      // Open delete confirmation
      const menuButton = screen.getByRole("button", { name: /message options/i });
      await userEvent.click(menuButton);
      
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await userEvent.click(deleteButton);
      
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      
      // Focus should be trapped
      await userEvent.tab();
      expect(screen.getByRole("button", { name: /confirm/i })).toHaveFocus();
    });
  });

  // ===========================================================================
  // Memory Integration
  // ===========================================================================

  describe("Memory Integration", () => {
    it("should show memory indicator when memories used", async () => {
      (useChatStore as jest.Mock).mockReturnValue({
        messages: [
          { id: "msg-1", role: "assistant", content: "Response", timestamp: Date.now(), memoriesUsed: 3 },
        ],
        isStreaming: false,
        error: null,
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
      });

      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      expect(screen.getByText(/3 memories used/i)).toBeInTheDocument();
    });

    it("should open memory viewer on click", async () => {
      const user = userEvent.setup();
      
      (useChatStore as jest.Mock).mockReturnValue({
        messages: [
          { id: "msg-1", role: "assistant", content: "Response", timestamp: Date.now(), memoriesUsed: 3 },
        ],
        isStreaming: false,
        error: null,
        sendMessage: mockSendMessage,
        streamMessage: mockStreamMessage,
        clearError: mockClearError,
      });

      render(<ChatArea workspaceId="ws-1" threadId="thread-1" />);
      
      await user.click(screen.getByText(/3 memories used/i));
      
      expect(screen.getByRole("dialog", { name: /memories/i })).toBeInTheDocument();
    });
  });
});
