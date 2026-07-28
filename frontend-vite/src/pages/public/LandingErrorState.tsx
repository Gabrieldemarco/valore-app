import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher';

interface Props {
  t: (key: string) => string;
  error: string;
}

export default function LandingErrorState({ t, error }: Props) {
  return (
    <div className="landing-view">
      <div className="fixed top-12 right-12 z-1000">
        <LanguageSwitcher />
      </div>
      <div className="error-page">
        <div className="error-code">{t('landing.errorCode')}</div>
        <h1>{t('landing.errorTitle')}</h1>
        <p>{error || t('landing.errorMessage')}</p>
        <Link to="/" className="btn btn-primary">{t('landing.errorBack')}</Link>
      </div>
    </div>
  );
}
