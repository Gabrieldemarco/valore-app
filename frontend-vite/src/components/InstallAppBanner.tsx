import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallAppBanner() {
  const { showPrompt, install, dismiss, isIOS } = useInstallPrompt();

  if (!showPrompt && !isIOS) return null;

  return (
    <div className="install-banner">
      {isIOS ? (
        <>
          <span className="install-banner-text">
            📲 Instalá la app — tocá <strong>Compartir</strong> <span className="ios-icon">⎋</span> y luego <strong>"Agregar a pantalla de inicio"</strong>
          </span>
          <button className="install-banner-close" onClick={dismiss} aria-label="Cerrar">✕</button>
        </>
      ) : (
        <>
          <span className="install-banner-text">📲 Instalá Veloré para una experiencia más rápida</span>
          <div className="install-banner-actions">
            <button className="install-banner-btn" onClick={install}>Instalar app</button>
            <button className="install-banner-close" onClick={dismiss} aria-label="Cerrar">✕</button>
          </div>
        </>
      )}
    </div>
  );
}
