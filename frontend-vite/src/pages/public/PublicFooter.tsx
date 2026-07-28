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
      <p style={{ fontSize: 15, opacity: 0.85, marginBottom: 20, lineHeight: 1.6 }}>
        {t('publicIndex.footerCTA')}
      </p>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--primary)' }}>
        {t('publicIndex.appointmentsCounter', { count: appointmentsCount })}
      </div>
      <div style={{ fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 16, opacity: 0.8, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
        <Link to="/terms#terms" style={{ color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none' }}>{t('publicIndex.termsLink')}</Link>
        <span style={{ color: 'rgba(197, 168, 128, 0.2)' }}>|</span>
        <Link to="/terms#privacy" style={{ color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none' }}>{t('publicIndex.privacyLink')}</Link>
        <span style={{ color: 'rgba(197, 168, 128, 0.2)' }}>|</span>
        <Link to="/terms#cancellations" style={{ color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none' }}>{t('publicIndex.cancellationPolicyLink')}</Link>
      </div>
    </footer>
  );
}
