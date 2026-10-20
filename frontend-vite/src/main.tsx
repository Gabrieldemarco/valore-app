import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global-premium.css';
import './styles/utilities.css';
import './i18n';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    let refreshing = false;

    // Check for updates immediately on load
    reg.update().catch(() => {});

    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      if (!newSW) return;

      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          if (!refreshing) {
            refreshing = true;
            // Show toast notification before reload
            if (document.readyState === 'complete') {
              const toast = document.createElement('div');
              toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1e293b;color:#fff;padding:16px 24px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.4);z-index:9999;font-family:system-ui;font-size:14px;display:flex;align-items:center;gap:12px;';
              toast.innerHTML = '🔄 Nueva versión disponible. Actualizando...';
              document.body.appendChild(toast);
              setTimeout(() => window.location.reload(), 1500);
            } else {
              window.location.reload();
            }
          }
        }
      });
    });

    // Periodic check for updates every 30 min
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);

    // Listen for controllerchange (SW took over)
    let controllerChangeHandled = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!controllerChangeHandled && navigator.serviceWorker.controller) {
        controllerChangeHandled = true;
        window.location.reload();
      }
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
