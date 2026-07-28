import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LegalSection from './legal/LegalSection';
import TermsConditions from './legal/TermsConditions';
import PrivacyPolicy from './legal/PrivacyPolicy';
import CancellationsPolicy from './legal/CancellationsPolicy';
import '../../styles/terms.css';

type TabId = 'terms' | 'privacy' | 'cancellations';

function getInitialTab(): TabId {
  if (typeof window === 'undefined') return 'terms';
  const hash = window.location.hash.slice(1) as TabId;
  if (['terms', 'privacy', 'cancellations'].includes(hash)) return hash;
  return 'terms';
}

const SECTION_TITLE: Record<TabId, string> = {
  terms: 'Términos y Condiciones',
  privacy: 'Política de Privacidad',
  cancellations: 'Política de Cancelaciones',
};

const SECTION_DATE = 'Última actualización: 18 de mayo de 2026';

function TermsContent({ id }: { id: TabId }) {
  return (
    <LegalSection title={SECTION_TITLE[id]} date={SECTION_DATE}>
      {id === 'terms' ? <TermsConditions /> : id === 'privacy' ? <PrivacyPolicy /> : <CancellationsPolicy />}
    </LegalSection>
  );
}

export default function Terms() {
  const { t } = useTranslation();
  const termsT = (key: string, fallback: string) => t(key, fallback);
  const TABS: { id: TabId; label: string }[] = [
    { id: 'terms', label: termsT('terms.tabTerms', 'Términos y Condiciones') },
    { id: 'privacy', label: termsT('terms.tabPrivacy', 'Política de Privacidad') },
    { id: 'cancellations', label: termsT('terms.tabCancellations', 'Política de Cancelaciones') },
  ];
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash.slice(1) as TabId;
    if (['terms', 'privacy', 'cancellations'].includes(hash)) {
      setActiveTab(hash); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [location.hash]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1) as TabId;
      if (['terms', 'privacy', 'cancellations'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const switchTab = (id: TabId) => {
    setActiveTab(id);
    window.location.hash = id; // eslint-disable-line react-hooks/immutability
  };

  return (
    <div className="terms-page">
      <div className="terms-container">
        <aside className="terms-sidebar">
          <div className="terms-sidebar-title">{t('terms.sidebarTitle')}</div>
          <nav className="terms-nav">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`terms-nav-btn${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => switchTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="mt-32 pl-8">
            <Link to="/" className="text-muted fs-13 no-underline">
              {t('terms.backLink')}
            </Link>
          </div>
        </aside>

        <main className="terms-main">
          <TermsContent id={activeTab} />
        </main>
      </div>

      <div className="terms-footer">
        {t('terms.footer', '© {{year}} Velsoie. Todos los derechos reservados.', { year: new Date().getFullYear() })}
      </div>
    </div>
  );
}
