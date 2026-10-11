import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './styles.css';

// StrictMode is what makes the bug visible in development:
// it runs every effect, its cleanup, and the effect again.
// Remove it to see that the box then shows one editor, but the
// unmount/mount button still leaks one editor per click.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
