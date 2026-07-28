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
          {t('common.installIOS')}
        </span>
        <button className="install-banner-close" onClick={dismiss} aria-label={t('common.close')}>✕</button>
      </div>
    );
  }

  if (promptEvent) {
    return (
      <div className="install-banner">
        <span className="install-banner-text">{t('installApp.promptText')}</span>
        <div className="install-banner-actions">
          <button className="install-banner-btn" onClick={install}>{t('installApp.installButton')}</button>
          <button className="install-banner-close" onClick={dismiss} aria-label={t('common.close')}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="install-banner">
      <span className="install-banner-text">{t('common.installAndroid')}</span>
      <button className="install-banner-close" onClick={dismiss} aria-label={t('common.close')}>✕</button>
    </div>
  );
}
