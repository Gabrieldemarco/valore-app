import { useTranslation } from 'react-i18next';
import ScrollReveal from '../../components/ScrollReveal';

interface LandingFooterSectionProps {
  businessName: string;
  businessAddress: string | null;
  businessPhone: string | null;
  social: Record<string, string>;
  hasSocial: boolean;
}

export default function LandingFooterSection({ businessName, businessAddress, businessPhone, social, hasSocial }: LandingFooterSectionProps) {
  const { t } = useTranslation();
  return (
    <ScrollReveal>
      <footer className="footer">
        <div className="footer-content">
          <p><strong>{businessName}</strong></p>
          {businessAddress && <p>{businessAddress}</p>}
          {businessPhone && <p>Tel: {businessPhone}</p>}
          {hasSocial && (
            <div className="footer-socials">
              {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="footer-social-link">📷</a>}
              {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="footer-social-link">📘</a>}
              {social.whatsapp && <a href={`https://wa.me/${social.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="footer-social-link">💬</a>}
              {social.tiktok && <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="footer-social-link">🎵</a>}
              {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="footer-social-link">🐦</a>}
            </div>
          )}
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} - {t('landing.footerRights')}
          </p>
        </div>
      </footer>
    </ScrollReveal>
  );
}
