import { create } from "zustand";

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: { name: string; type: string; url: string }[];
  chatId?: number;
  memorySources?: { id: string; content: string; type: string }[];
}

interface ChatState {
  messagesByThread: Record<string, Message[]>;
  activeThreadId: string | null;
  isStreaming: boolean;
  streamingThreadId: string | null;
  isHistoryLoading: boolean;
  error: string | null;
}

interface ChatStore extends ChatState {
  // Actions
  setMessages: (threadId: string, messages: Message[]) => void;
  appendMessage: (threadId: string, message: Message) => void;
  updateMessageContent: (threadId: string, messageId: string, content: string) => void;
  setStreaming: (threadId: string | null) => void;
  clearThread: (threadId: string) => void;
  setActiveThread: (threadId: string | null) => void;
  setHistoryLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getMessages: (threadId: string) => Message[];
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messagesByThread: {},
  activeThreadId: null,
  isStreaming: false,
  streamingThreadId: null,
  isHistoryLoading: false,
  error: null,
  
  setMessages: (threadId, messages) => 
    set((state) => ({
      messagesByThread: { ...state.messagesByThread, [threadId]: messages },
    })),
  
  appendMessage: (threadId, message) =>
    set((state) => ({
      messagesByThread: {
        ...state.messagesByThread,
        [threadId]: [...(state.messagesByThread[threadId] || []), message],
      },
    })),
  
  updateMessageContent: (threadId, messageId, content) =>
    set((state) => {
      const messages = state.messagesByThread[threadId] || [];
      const updated = messages.map((msg) =>
        msg.id === messageId ? { ...msg, content } : msg
      );
      return {
        messagesByThread: { ...state.messagesByThread, [threadId]: updated },
      };
    }),
  
  setStreaming: (threadId) =>
    set({ isStreaming: !!threadId, streamingThreadId: threadId }),
  
  clearThread: (threadId) =>
    set((state) => {
      const { [threadId]: _, ...rest } = state.messagesByThread;
      return { messagesByThread: rest };
    }),
  
  setActiveThread: (threadId) => set({ activeThreadId: threadId }),
  setHistoryLoading: (isHistoryLoading) => set({ isHistoryLoading }),
  setError: (error) => set({ error }),
  getMessages: (threadId) => get().messagesByThread[threadId] || [],
}));
