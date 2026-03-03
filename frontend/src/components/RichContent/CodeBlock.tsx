import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';

interface Props {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (language) {
      ref.current.className = `language-${language}`;
    }
    hljs.highlightElement(ref.current);
  }, [code, language]);

  return (
    <pre style={{ margin: 0, borderRadius: 6, overflow: 'auto' }}>
      <code ref={ref}>{code}</code>
    </pre>
  );
}
