import r2wc from '@r2wc/react-to-web-component';
import { ChatWindow } from './components/Chat/ChatWindow.js';
import 'leaflet/dist/leaflet.css';
import 'highlight.js/styles/github-dark.css';

const McpChatElement = r2wc(ChatWindow, {
  props: {
    apiUrl: 'string',
    wsUrl: 'string',
  },
});

customElements.define('mcp-chat', McpChatElement);
