import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallAppBanner() {
  const { show, promptEvent, install, dismiss, isIOS } = useInstallPrompt();

  if (!show) return null;

  if (isIOS && !promptEvent) {
    return (
      <div className="install-banner">
        <span className="install-banner-text">
          📲 Instalá la app en tu iPhone: tocá <strong>Compartir</strong> <span className="ios-icon">⎋</span> y luego <strong>"Agregar a pantalla de inicio"</strong>
        </span>
        <button className="install-banner-close" onClick={dismiss} aria-label="Cerrar">✕</button>
      </div>
    );
  }

  if (promptEvent) {
    return (
      <div className="install-banner">
        <span className="install-banner-text">📲 Instalá Veloré para una experiencia más rápida</span>
        <div className="install-banner-actions">
          <button className="install-banner-btn" onClick={install}>Instalar app</button>
          <button className="install-banner-close" onClick={dismiss} aria-label="Cerrar">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="install-banner">
      <span className="install-banner-text">📲 Instalá Veloré en tu celular — usá el menú del navegador: <strong>Instalar app</strong> o <strong>Agregar a pantalla de inicio</strong></span>
      <button className="install-banner-close" onClick={dismiss} aria-label="Cerrar">✕</button>
    </div>
  );
}
