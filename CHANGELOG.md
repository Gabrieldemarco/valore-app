# Changelog

## [Unreleased]

### Refactor
- Descomposición de componentes gigantes: Dashboard staff (2492→54 L), LandingEditor (1395→140 L), admin Dashboard (550→90 L), PublicIndex (804→581 L)
- LandingEditorProvider: 475→235 L (5 hooks extraídos)
- useDashboardCRUD: 422→43 L (6 sub-hooks)
- LandingBookingSection: 711→279 L (6 componentes)

### i18n
- Traducción completa es/en/pt: 220+ strings con t()
- PhoneInput (17 países), LanguageSwitcher, Register, LandingHero CATEGORY_LABELS
- Terms.tsx: tabs, nav, footer traducidos
- 13 calls toLocaleDateString('es-UY') → i18n.language

### Estilos
- Sistema de 15 variables CSS semánticas (success, info, danger, border, bg, etc.)
- 264 inline styles eliminados en top-9 archivos (BrandingTab 73→31, Dashboard cliente 68→6, AnalyticsTab 51→11, SettingsPanel 40→4, etc.)
- utilities.css: 80+ clases utility (table, flex, grid, spacing)
- 40+ hex colores → CSS variables en 22 archivos
- Light theme completo con [data-theme="light"]

### Landing Page
- Hero 100vh full-bleed con parallax + gradient overlay
- ScrollReveal (IntersectionObserver, 4 direcciones, 5 delays)
- Glass-morphism cards, masonry gallery, premium lightbox
- 9 keyframes CSS (fadeInUp, scaleIn, shimmer, float, pulse-glow, grain, etc.)

### PWA
- Service Worker (Workbox) con precaching
- Push notifications con VAPID
- Manifest standalone, install prompts, offline caching

### Limpieza
- apiCall.ts eliminado (0 imports)
- 5 componentes + 1 CSS de landing/old eliminados
- 5 fetch() → api.get/put/post centralizado
- 3 console.error → logger.error
- imageUtils.ts consolidado (9 imports)
- console.log eliminados
- types.tsx → types.ts (Rolldown compat)
- import type fixes

### Fixes
- BrandingTab presets → themeColors.ts
- RevenueChart colores → CHART_COLORS
- CalendarTab status colors → CSS variables
- Rolldown/Vite 8 compatibility
