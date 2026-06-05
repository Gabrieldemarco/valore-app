# Deploy Checklist — Veloré

## Estado de implementación

- [x] Add env validation
- [x] Implement DB migrations
- [x] Improve tests & CI
- [x] Harden security
- [x] Add logging & monitoring
- [x] Backups & restore tests
- [x] API docs & swagger examples
- [x] Optimize DB queries/indexes
- [x] Create safe deploy checklist
- [x] Add CI notifications (Slack + Email)
- [x] Add non-blocking env warnings for staging/dev

Pasos mínimos para desplegar sin riesgo.

1. Backup
   - Ejecutar `pg_dump` y guardar el archivo fuera del host.

2. Verificar entorno
   - Confirmar `DATABASE_URL` apunta a staging o producción.
   - Ejecutar desde `backend`: `npm run check-env` (o `NODE_ENV=production node scripts/check-env.js`).

3. Ejecutar migraciones en staging
   - `cd backend && npm run migrate`
   - Revisar logs y corregir errores.

4. Smoke tests en staging
   - Verificar `/api/health`, login staff, crear turno rápido.
   - Confirmar que `/api-docs` y `/api-docs.json` están accesibles y protegidos cuando se habilita Swagger.
   - Si `METRICS_ENABLED=true`, confirmar que `/metrics` y `/monitoring/summary` funcionan y están protegidos en staging/producción.

5. Backup previo al prod
   - Generar backup final antes de migrar en producción.

6. Migración en producción
   - `cd backend && npm run migrate`
   - Observar logs durante 10–30 minutos.

7. Monitor y rollback
   - Verificar errores en Sentry/monitoreo, latencias, tasas 5xx.
   - Si falla, revertir mediante restore del backup y notificar al equipo.

Notas de seguridad
- Aplicar migraciones en pasos (añadir columnas NULLABLE, backfill, luego NOT NULL).
- No ejecutar migraciones automáticas en producción sin revisión.
