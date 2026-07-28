# Velsoie — Frontend

SaaS multi-tenant de gestión de salones de belleza. Booking online, landing pages personalizables, dashboard staff/admin, POS, analíticas, y más.

## Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite 8 + Rolldown
- **Estilos:** CSS vanilla con variables + utilities
- **i18n:** i18next (es/en/pt)
- **PWA:** Workbox + VAPID push notifications
- **Testing:** Vitest + React Testing Library

## Scripts

```bash
npm run dev       # Desarrollo
npm run build     # Producción
npm run preview   # Preview build
npx vitest        # Tests
npx tsc --noEmit  # Type check
```

## Estructura

```
src/
├── api/           # Cliente HTTP centralizado
├── components/    # Componentes compartidos
├── contexts/      # React Contexts (Auth, Theme, Dashboard)
├── hooks/         # Custom hooks
├── i18n/          # Configuración i18next
├── locales/       # Traducciones (es/en/pt)
├── pages/         # Páginas (admin, client, public, staff)
├── services/      # Servicios (logger, offlineCache)
├── styles/        # CSS global, utilities, temas
└── utils/         # Utilidades (imageUtils, themeColors)
```

## Temas

- Dark mode por defecto, light mode toggle
- Sistema de variables CSS semánticas
- `utilities.css` con ~80 clases utility para eliminar inline styles
