import { RichRenderer } from '../RichContent/RichRenderer.js';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxWidth: '80%',
  },
  label: {
    fontSize: 11,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bubble: {
    padding: '10px 14px',
    borderRadius: 12,
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
};

export function MessageBubble({ role, content, isStreaming }: Props) {
  const isUser = role === 'user';
  const isRich = content.trimStart().startsWith('{"__rich__"');

  if (isRich) {
    return (
      <div style={{ marginBottom: 12, width: '100%' }}>
        <span style={{ ...styles.label, display: 'block', marginBottom: 4 }}>Assistant</span>
        <RichRenderer text={content} />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
      }}
    >
      <div style={{ ...styles.wrapper, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <span style={styles.label}>{isUser ? 'You' : 'Assistant'}</span>
        <div
          style={{
            ...styles.bubble,
            background: isUser ? '#2563eb' : '#1e293b',
            color: '#f1f5f9',
          }}
        >
          <RichRenderer text={content} />
          {isStreaming && <span style={{ opacity: 0.5 }}>▍</span>}
        </div>
      </div>
    </div>
  );
}
