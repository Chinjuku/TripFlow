import React from 'react';
import ReactDOM from 'react-dom/client';
import { Routes } from '@generouted/react-router';
import './lib/i18n';
import './styles/globals.css';
import { registerSW } from 'virtual:pwa-register';

// Register the PWA service worker (auto-updates)
registerSW({ immediate: true });

// The anti-flash inline script (index.html) paints html's background to avoid
// a white flash before this CSS bundle loads. Now that the stylesheet is in,
// `--background` drives the colour - clear the inline override so it doesn't
// shadow runtime theme switches.
document.documentElement.style.backgroundColor = '';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Routes />
  </React.StrictMode>,
);
