import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="page-wrapper">
      <div className="error-container">
        <h1>{t('app.notFound.title')}</h1>
        <p>{t('app.notFound.message')}</p>
        <Link to="/">{t('app.notFound.goHome')}</Link>
        <Link to="/staff/login">{t('app.notFound.staffAccess')}</Link>
      </div>
    </div>
  );
}
