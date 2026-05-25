import React from 'react';
import ReactDOM from 'react-dom/client';
import { Routes } from '@generouted/react-router';
import './lib/i18n';
import './styles/globals.css';
import { registerSW } from 'virtual:pwa-register';

// Register the PWA service worker (auto-updates)
registerSW({ immediate: true });

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Routes />
  </React.StrictMode>,
);
