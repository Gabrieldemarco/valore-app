import { useTranslation } from 'react-i18next';

interface WebsiteStudioErrorProps {
  message: string;
}

export default function WebsiteStudioError({ message }: WebsiteStudioErrorProps) {
  const { t } = useTranslation();
  return (
    <div className="ws-error">
      <div className="ws-error-content">
        <h2>{t('websiteStudio.publicUnavailable')}</h2>
        <p>{message}</p>
      </div>
    </div>
  );
}
