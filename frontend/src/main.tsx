import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Intercept all fetch requests globally to inject the X-Session-ID header for multi-tenancy isolation
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('flow_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('flow_session_id', sessionId);
  }
  return sessionId;
};

const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const sessionId = getSessionId();
  const newInit = { ...init };
  const headers = new Headers(newInit.headers || {});
  headers.set('X-Session-ID', sessionId);
  newInit.headers = headers;
  return originalFetch(input, newInit);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
