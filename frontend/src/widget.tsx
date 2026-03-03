import { createRoot } from 'react-dom/client';
import { ChatWindow } from './components/Chat/ChatWindow.js';
import 'leaflet/dist/leaflet.css';
import 'highlight.js/styles/github-dark.css';

class McpChatElement extends HTMLElement {
  private reactRoot: ReturnType<typeof createRoot> | null = null;

  connectedCallback() {
    const container = document.createElement('div');
    container.style.cssText = 'height:100%;display:flex;flex-direction:column;';
    this.appendChild(container);

    const apiUrl = this.getAttribute('api-url') ?? undefined;
    const wsUrl = this.getAttribute('ws-url') ?? undefined;

    this.reactRoot = createRoot(container);
    this.reactRoot.render(<ChatWindow apiUrl={apiUrl} wsUrl={wsUrl} />);
  }

  disconnectedCallback() {
    this.reactRoot?.unmount();
    this.reactRoot = null;
  }
}

if (!customElements.get('mcp-chat')) {
  customElements.define('mcp-chat', McpChatElement);
}
