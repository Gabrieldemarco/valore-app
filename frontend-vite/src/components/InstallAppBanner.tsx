import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useTranslation } from 'react-i18next';

export default function InstallAppBanner() {
  const { t } = useTranslation();
  const { show, promptEvent, install, dismiss, isIOS } = useInstallPrompt();

  if (!show) return null;

  if (isIOS && !promptEvent) {
    return (
      <div className="install-banner">
        <span className="install-banner-text">
          {t('common.installIOS', '📲 Instalá la app en tu iPhone: tocá Compartir ⎋ y luego "Agregar a pantalla de inicio"')}
        </span>
        <button className="install-banner-close" onClick={dismiss} aria-label={t('common.close', 'Cerrar')}>✕</button>
      </div>
    );
  }

  if (promptEvent) {
    return (
      <div className="install-banner">
        <span className="install-banner-text">{t('installApp.promptText', '📲 Instalá Velsoie para una experiencia más rápida')}</span>
        <div className="install-banner-actions">
          <button className="install-banner-btn" onClick={install}>{t('installApp.installButton', 'Instalar app')}</button>
          <button className="install-banner-close" onClick={dismiss} aria-label={t('common.close', 'Cerrar')}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="install-banner">
      <span className="install-banner-text">{t('common.installAndroid', '📲 Instalá Velsoie en tu celular — usá el menú del navegador: Instalar app o Agregar a pantalla de inicio')}</span>
      <button className="install-banner-close" onClick={dismiss} aria-label={t('common.close', 'Cerrar')}>✕</button>
    </div>
  );
}
