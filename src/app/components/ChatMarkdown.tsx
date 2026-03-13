import { MessageContent } from "./chat/rendering/MessageContent";

export function ChatMarkdown({ content }: { content: string }) {
  return <MessageContent content={content} role="assistant" surface="chat" />;
}
