import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Register Service Worker for PWA (using dynamic BASE_URL)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // This resolves to '/sw.js' on Stable, and '/latest/sw.js' on Latest
    const swPath = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swPath).then(registration => {
      console.log('SW registered: ', registration);

      // Handle updates - prompt user to reload when a new worker is ready
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (window.confirm('A new version of CheckMate is available. Refresh to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}