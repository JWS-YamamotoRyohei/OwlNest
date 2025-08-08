import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App';
import reportWebVitals from './reportWebVitals';

// Service Worker registration (optional for Vite)
// import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker registration
// Uncomment the following lines if you want to enable service worker
// serviceWorkerRegistration.register();

// Performance monitoring
reportWebVitals();
