import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
];

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  return (
    <div className={className} style={{ display: 'inline-flex', gap: 2 }}>
      {LANGUAGES.map(lang => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          style={{
            background: i18n.language === lang.code ? 'var(--glass-bg)' : 'transparent',
            color: i18n.language === lang.code ? 'var(--primary)' : 'var(--text-muted)',
            border: '1px solid var(--glass-border)',
            borderRadius: 4,
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            lineHeight: '22px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--primary)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--glass-border)';
          }}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
