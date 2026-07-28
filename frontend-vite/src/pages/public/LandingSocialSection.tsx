import { useTranslation } from 'react-i18next';
import ScrollReveal from '../../components/ScrollReveal';

interface LandingSocialSectionProps {
  social: Record<string, string>;
  hasSocial: boolean;
}

export default function LandingSocialSection({ social, hasSocial }: LandingSocialSectionProps) {
  const { t } = useTranslation();
  if (!hasSocial) return null;
  return (
    <ScrollReveal>
      <div className="section-divider" />
      <h2 className="section-title">{t('landing.socialTitle')}</h2>
      <div className="social-links">
        {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialInstagram')}</a>}
        {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialFacebook')}</a>}
        {social.whatsapp && <a href={`https://wa.me/${social.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialWhatsApp')}</a>}
        {social.tiktok && <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialTikTok')}</a>}
        {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="social-link">{t('landing.socialTwitter')}</a>}
      </div>
    </ScrollReveal>
  );
}
