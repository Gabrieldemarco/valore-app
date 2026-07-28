import { THEME_PRESETS, BRAND_DEFAULTS } from '../../../styles/themeColors';
export { THEME_PRESETS, BRAND_DEFAULTS };

export function generateBrandingCSS(data: {
  primary: string;
  secondary: string;
  fonts?: { primary?: string; secondary?: string };
  heroHeight?: number;
  heroWidth?: number;
  primaryTextColor?: string;
  secondaryTextColor?: string;
  bgColor?: string;
}): string {
  const primaryFont = data.fonts?.primary || 'system';
  const secondaryFont = data.fonts?.secondary || 'system';
  const heroHeight = data.heroHeight || 70;
  const heroWidth = data.heroWidth || 100;
  const primaryTextColor = data.primaryTextColor || 'var(--text-dark)';
  const secondaryTextColor = data.secondaryTextColor || 'var(--text-muted)';
  const bgColor = data.bgColor || 'var(--bg-gradient-end)';

  const fontImport = primaryFont !== 'system'
    ? `@import url('https://fonts.googleapis.com/css2?family=${primaryFont.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap');\n`
    : '';
  const secondaryFontImport = secondaryFont !== 'system' && secondaryFont !== primaryFont
    ? `@import url('https://fonts.googleapis.com/css2?family=${secondaryFont.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap');\n`
    : '';
  const primaryFontFamily = primaryFont !== 'system' ? `'${primaryFont}', serif` : 'inherit';
  const secondaryFontFamily = secondaryFont !== 'system' ? `'${secondaryFont}', sans-serif` : 'inherit';

  return `/* Velsoie Branding */
${fontImport}${secondaryFontImport}
.landing-view { background: ${bgColor} !important; color: ${primaryTextColor} !important; }
.landing-view .hero { height: auto !important; min-height: ${heroHeight}vh !important; width: ${heroWidth}% !important; margin: 0 auto !important; }
.landing-view h1, .landing-view h2, .landing-view h3, .landing-view h4, .landing-view h5, .landing-view h6 { color: ${primaryTextColor} !important; font-family: ${primaryFontFamily} !important; }
.landing-view .service-name, .landing-view .team-name { color: ${primaryTextColor} !important; }
.landing-view .service-desc, .landing-view .team-bio { color: ${secondaryTextColor} !important; }
.landing-view body, .landing-view p, .landing-view span, .landing-view div, .landing-view input, .landing-view textarea, .landing-view button { font-family: ${secondaryFontFamily} !important; }
/* End Velsoie Branding */`;
}

export function generatePresetCSS(preset: string, _primary: string, _secondary: string): string {
  if (preset === 'barber') {
    return `/* 🧡 ESTILO BARBERIA CLASICA: Split Hero & Lista de Precios */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
:root { --font-heading: 'Playfair Display', serif; }
h1, h2, h3, h4, h5, h6, .navbar-brand { font-family: var(--font-heading) !important; letter-spacing: 1px; font-weight: 800; }
.glass-panel, .service-card, .team-card, .btn, .glass-input, .slot-btn { border-radius: 4px !important; box-shadow: none !important; border: 1px solid rgba(217, 119, 6, 0.2) !important; }
.team-photo, .service-image { border-radius: 4px !important; }
.landing-view { display: flex !important; flex-direction: column !important; }
.landing-view > section { order: 99 !important; }
footer { order: 100 !important; }
#hero { order: 1 !important; }
#servicios { order: 2 !important; }
#equipo { order: 3 !important; }
#galeria { order: 4 !important; }
#reservar { order: 5 !important; }
@media (min-width: 769px) {
  .hero { display: grid !important; grid-template-columns: 1.2fr 0.8fr !important; height: 70vh !important; min-height: 550px !important; padding: 0 !important; text-align: left !important; }
  .hero::before { display: none !important; }
  .hero-image { position: relative !important; width: 100% !important; height: 100% !important; opacity: 0.95 !important; grid-column: 2 !important; grid-row: 1 !important; }
  .hero-content { position: relative !important; max-width: 100% !important; padding: 60px 5% !important; grid-column: 1 !important; grid-row: 1 !important; display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: flex-start !important; }
}
.services-grid { display: flex !important; flex-direction: column !important; gap: 16px !important; }
.service-card { flex-direction: row !important; height: 130px !important; background: rgba(255,255,255,0.02) !important; }
.service-image { width: 160px !important; height: 100% !important; }
.service-content { padding: 16px 24px !important; }
@media (max-width: 768px) { .service-card { flex-direction: column !important; height: auto !important; } .service-image { width: 100% !important; height: 180px !important; } }`;
  }
  if (preset === 'zen') {
    return `/* 💚 ESTILO SPA & WELLNESS: Ultra-Suave & Conversión Inmediata */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
:root { --font-heading: 'Plus Jakarta Sans', sans-serif; }
* { font-family: 'Plus Jakarta Sans', sans-serif !important; }
.glass-panel, .service-card, .team-card { border-radius: 28px !important; border: 1px solid rgba(16, 185, 129, 0.15) !important; }
.btn, .glass-input, .slot-btn { border-radius: 50px !important; }
.team-photo, .service-image { border-radius: 24px !important; }
.landing-view { display: flex !important; flex-direction: column !important; }
.landing-view > section { order: 99 !important; }
footer { order: 100 !important; }
#hero { order: 1 !important; }
#reservar { order: 2 !important; }
#servicios { order: 3 !important; }
#equipo { order: 4 !important; }
#galeria { order: 5 !important; }
.booking-section { padding: 50px 20px !important; }
.booking-form { max-width: 750px !important; margin: 0 auto !important; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important; background: rgba(255, 255, 255, 0.04) !important; }`;
  }
  if (preset === 'light') {
    return `/* ☀️ ESTILO CLARO: Fondo Blanco & Diseño Limpio */
.landing-view { background: var(--text-white) !important; color: var(--text-dark) !important; }
.landing-view .hero { background: var(--text-white) !important; }
.landing-view .glass-panel { background: rgba(255, 255, 255, 0.9) !important; border: 1px solid rgba(0, 0, 0, 0.1) !important; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important; }
.landing-view .service-card { background: rgba(255, 255, 255, 0.95) !important; border: 1px solid rgba(0, 0, 0, 0.1) !important; color: var(--text-dark) !important; }
.landing-view .team-card { background: rgba(255, 255, 255, 0.95) !important; border: 1px solid rgba(0, 0, 0, 0.1) !important; color: var(--text-dark) !important; }
.landing-view .btn-primary { background: linear-gradient(135deg, var(--primary), var(--accent)) !important; color: var(--text-white) !important; }
.landing-view .glass-input { background: rgba(255, 255, 255, 0.9) !important; border: 1px solid rgba(0, 0, 0, 0.15) !important; color: var(--text-dark) !important; }
.landing-view .slot-btn { background: rgba(255, 255, 255, 0.9) !important; border: 1px solid rgba(0, 0, 0, 0.15) !important; color: var(--text-dark) !important; }
.landing-view .slot-btn.selected { background: linear-gradient(135deg, var(--primary), var(--accent)) !important; color: var(--text-white) !important; }
.landing-view h1, .landing-view h2, .landing-view h3, .landing-view h4, .landing-view h5, .landing-view h6 { color: var(--text-dark) !important; }
.landing-view .service-name, .landing-view .team-name { color: var(--text-dark) !important; }
.landing-view .service-desc, .landing-view .team-bio { color: var(--text-muted) !important; }
.landing-view .booking-section { background: var(--bg-warm) !important; }
.landing-view .booking-form { background: rgba(255, 255, 255, 0.95) !important; border: 1px solid rgba(0, 0, 0, 0.1) !important; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1) !important; }
.landing-view footer { background: var(--bg-warm) !important; color: var(--text-dark) !important; border-top: 1px solid rgba(0, 0, 0, 0.1) !important; }`;
  }
  // default / velvet
  return `/* Custom Background & Hero Height */
.landing-view { background: var(--bg-gradient-end) !important; }
.landing-view .hero { min-height: 70vh !important; }`;
}
