import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface PublicFooterProps {
  appointmentsCount: number;
}

export default function PublicFooter({ appointmentsCount }: PublicFooterProps) {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <p>{t('publicIndex.footerCopyright')}</p>
        <p className="text-muted-sm" style={{ fontSize: 15, opacity: 0.85, marginBottom: 20, lineHeight: 1.6 }}>
        {t('publicIndex.footerCTA')}
      </p>
      <div className="fs-14 font-600 mb-16 text-primary">
        {t('publicIndex.appointmentsCounter', { count: appointmentsCount })}
      </div>
      <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 16, opacity: 0.8, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
        <Link to="/terms#terms" className="no-underline text-muted font-500">{t('publicIndex.termsLink')}</Link>
        <span style={{ color: 'rgba(197, 168, 128, 0.2)' }}>|</span>
        <Link to="/terms#privacy" className="no-underline text-muted font-500">{t('publicIndex.privacyLink')}</Link>
        <span style={{ color: 'rgba(197, 168, 128, 0.2)' }}>|</span>
        <Link to="/terms#cancellations" className="no-underline text-muted font-500">{t('publicIndex.cancellationPolicyLink')}</Link>
      </div>
    </footer>
  );
}
