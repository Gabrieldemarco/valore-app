import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function LandingNoSlugState() {
  const { t } = useTranslation();
  return (
    <div className="landing-view">
      <div className="fixed top-12 right-12 z-100">
        <LanguageSwitcher />
      </div>
      <div className="error-page">
        <div className="error-code">{t('landing.errorCode404')}</div>
        <h1>{t('landing.noSlugTitle')}</h1>
        <p>{t('landing.noSlugMessage')}</p>
        <Link to="/" className="btn btn-primary">{t('landing.noSlugBack')}</Link>
      </div>
    </div>
  );
}
