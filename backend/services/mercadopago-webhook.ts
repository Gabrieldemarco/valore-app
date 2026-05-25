
// Validación de firma de webhooks Mercado Pago (x-signature)

import crypto from 'crypto';

const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * @param {string} header
 * @returns {{ ts: string, v1: string } | null}
 */
function parseXSignature(header) {
  if (!header || typeof header !== 'string') return null;

  let ts = null;
  let v1 = null;

  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 'ts') ts = value;
    if (key === 'v1') v1 = value;
  }

  if (!ts || !v1) return null;
  return { ts, v1 };
}

/**
 * @param {any} dataId
 * @returns {string}
 */
function normalizeDataId(dataId) {
  if (dataId == null || dataId === '') return '';
  const id = String(dataId);
  return /^[a-zA-Z0-9]+$/.test(id) ? id.toLowerCase() : id;
}

/**
 * @param {string} dataId
 * @param {string} [requestId]
 * @param {string} [ts]
 * @returns {string}
 */
function buildManifest(dataId, requestId, ts) {
  const parts = [];
  if (dataId !== '') parts.push(`id:${dataId}`);
  if (requestId) parts.push(`request-id:${requestId}`);
  if (ts) parts.push(`ts:${ts}`);
  return parts.length ? `${parts.join(';')};` : '';
}

/**
 * @param {string} manifest
 * @param {string} secret
 * @returns {string}
 */
function computeSignature(manifest, secret) {
  return crypto.createHmac('sha256', secret).update(manifest).digest('hex');
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeEqualHex(a, b) {
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/**
 * @param {import('express').Request} req
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
function verifyMercadoPagoWebhook(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      return { ok: false, status: 503, message: 'Webhook no configurado (MP_WEBHOOK_SECRET)' };
    }
    return { ok: true, skipped: true };
  }

  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  const parsed = parseXSignature(xSignature);

  if (!parsed) {
    return { ok: false, status: 401, message: 'Firma x-signature inválida o ausente' };
  }

  const dataIdRaw =
    req.query['data.id'] ??
    req.query['data_id'] ??
    req.body?.data?.id ??
    '';
  const dataId = normalizeDataId(dataIdRaw);

  const manifest = buildManifest(dataId, xRequestId, parsed.ts);
  const expected = computeSignature(manifest, secret);

  if (!safeEqualHex(expected, parsed.v1)) {
    return { ok: false, status: 401, message: 'Firma de webhook no coincide' };
  }

  const tsMs = Number(parsed.ts) * 1000;
  if (Number.isFinite(tsMs)) {
    const age = Math.abs(Date.now() - tsMs);
    if (age > SIGNATURE_MAX_AGE_MS) {
      return { ok: false, status: 401, message: 'Notificación expirada (timestamp)' };
    }
  }

  return { ok: true };
}

/**
 * @param {import('express').Request} req
 * @returns {string | null}
 */
function extractPaymentId(req) {
  const payload = req.body || {};
  const fromQuery = req.query['data.id'] ?? String(req.query.id ?? '');
  const fromBody = payload?.data?.id ?? payload?.id;
  const id = fromQuery ?? fromBody;
  return id != null && id !== '' ? String(id) : null;
}

/**
 * @param {import('express').Request} req
 * @returns {boolean}
 */
function isPaymentNotification(req) {
  const type = req.body?.type ?? req.query?.type;
  const topic = req.query?.topic;
  if (type === 'payment' || topic === 'payment') return true;
  // IPN legacy: solo query ?topic=payment&id=...
  if (topic === 'payment' && (String(req.query.id ?? '') || req.query['data.id'])) return true;
  // Sin tipo explícito pero con id de pago (compatibilidad)
  if (!type && !topic && extractPaymentId(req)) return true;
  return false;
}

export {
  parseXSignature,
  buildManifest,
  computeSignature,
  verifyMercadoPagoWebhook,
  extractPaymentId,
  isPaymentNotification,
  SIGNATURE_MAX_AGE_MS,
};

