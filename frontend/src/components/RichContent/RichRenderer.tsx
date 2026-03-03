import { MapWidget } from './MapWidget.js';
import { CodeBlock } from './CodeBlock.js';

interface RichMap {
  __rich__: true;
  type: 'map';
  lat: number;
  lng: number;
  zoom: number;
  name: string;
}

type RichPayload = RichMap;

function tryParseRich(text: string): RichPayload | null {
  try {
    const obj = JSON.parse(text);
    if (obj && obj.__rich__ === true) return obj as RichPayload;
  } catch { /* not JSON */ }
  return null;
}

interface Props {
  text: string;
}

export function RichRenderer({ text }: Props) {
  const rich = tryParseRich(text.trim());

  if (rich?.type === 'map') {
    return <MapWidget lat={rich.lat} lng={rich.lng} zoom={rich.zoom} name={rich.name} />;
  }

  // Detect fenced code blocks ```lang\n...\n```
  const codeMatch = text.match(/^```(\w*)\n([\s\S]*?)```$/m);
  if (codeMatch) {
    return <CodeBlock language={codeMatch[1] || undefined} code={codeMatch[2]} />;
  }

  // Plain text — preserve newlines
  return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
}
