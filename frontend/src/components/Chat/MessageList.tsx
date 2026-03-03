import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble.js';
import type { ChatMessage } from '../../types.js';

interface Props {
  messages: ChatMessage[];
  streamingContent?: string;
}

export function MessageList({ messages, streamingContent }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
      {messages.map((msg, i) => (
        <MessageBubble key={i} role={msg.role} content={msg.content} />
      ))}
      {streamingContent !== undefined && (
        <MessageBubble role="assistant" content={streamingContent} isStreaming />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
