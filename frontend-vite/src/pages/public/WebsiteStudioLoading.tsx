import { useTranslation } from 'react-i18next';

export default function WebsiteStudioLoading() {
  const { t } = useTranslation();
  return (
    <div className="ws-loading">
      <div className="ws-loading-spinner">
        <div className="ws-spinner"></div>
        <p>{t('websiteStudio.publicLoading')}</p>
      </div>
    </div>
  );
}
