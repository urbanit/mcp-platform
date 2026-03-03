import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatWindow } from './components/Chat/ChatWindow.js';
import 'highlight.js/styles/github-dark.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ChatWindow />
    </StrictMode>,
  );
}
