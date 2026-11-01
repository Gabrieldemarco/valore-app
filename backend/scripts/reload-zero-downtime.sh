#!/usr/bin/env bash
set -euo pipefail

# Ejecutar desde backend/ en producción después de copiar el nuevo código.
# El backend maneja SIGTERM de forma graceful y PM2 espera hasta 10 segundos.
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

PORT_VALUE="${PORT:-3000}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT_VALUE}/api/health}"

echo "Aplicando migraciones pendientes..."
npm run migrate

echo "Recargando PM2 con las variables actuales de .env..."
pm2 reload ecosystem.config.js --only velsoie-backend --update-env

for attempt in $(seq 1 20); do
  if curl --fail --silent --show-error --max-time 3 -H 'x-forwarded-proto: https' "$HEALTH_URL" >/dev/null; then
    echo "Backend saludable después de la recarga: $HEALTH_URL"
    exit 0
  fi
  sleep 1
done

echo "El backend no respondió al health check: $HEALTH_URL" >&2
pm2 status velsoie-backend || true
exit 1
