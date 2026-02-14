/**
 * Shared type definitions for ZAKI
 */

export interface Thread {
  id: string;
  label: string;
  pinned?: boolean;
}

export interface Space {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  instructions?: string;
  pinnedFiles?: PinnedFile[];
  pinned?: boolean;
  fixed?: boolean;
  threads?: Thread[];
}

export interface PinnedFile {
  name: string;
  type: string;
  size: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: MessageAttachment[];
  chatId?: number;
}

export interface MessageAttachment {
  name: string;
  type: string;
  url: string;
}

export interface LibraryResult {
  id: string;
  text: string;
  score?: number;
  metadata?: Record<string, string>;
}

export interface User {
  id?: string | number;
  username?: string;
  email?: string;
  fullName?: string | null;
  role?: string;
}
