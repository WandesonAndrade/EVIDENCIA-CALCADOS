import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { purgeLegacyAuthKeys } from './lib/securityUtils';

// Remove stale Sincom/Moblink tokens from previous sessions
purgeLegacyAuthKeys();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
