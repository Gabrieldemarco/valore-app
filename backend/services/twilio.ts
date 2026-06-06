
// services/twilio.ts - Cliente Twilio para WhatsApp
import logger from './logger';
import { queryOne } from '../database';

let cachedTwilioConfig: { account_sid: string; auth_token: string; from: string } | null = null;
let configCacheTime = 0;

async function loadTwilioConfig() {
  if (cachedTwilioConfig && Date.now() - configCacheTime < 60000) return cachedTwilioConfig;
  try {
    const row = await queryOne("SELECT value FROM app_config WHERE key = 'twilio'");
    if (row?.value) {
      const v = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      if (v.account_sid && v.auth_token && v.from) {
        cachedTwilioConfig = { account_sid: v.account_sid, auth_token: v.auth_token, from: v.from };
        configCacheTime = Date.now();
        return cachedTwilioConfig;
      }
    }
  } catch { /* fallback to env */ }
  return null;
}

function normalizePhone(phone: string) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-()]+/g, '');
  if (cleaned.startsWith('whatsapp:')) cleaned = cleaned.slice(9);
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('598')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) cleaned = `598${cleaned.slice(1)}`;
  else cleaned = `598${cleaned}`;
  return `+${cleaned}`;
}

function ensureWhatsAppPrefix(phone: string) {
  if (!phone) return '';
  const normalized = normalizePhone(phone);
  if (normalized.startsWith('whatsapp:')) return normalized;
  return `whatsapp:${normalized}`;
}

async function sendWhatsApp(to: string, body: string) {
  if (!to) return { success: true, skipped: 'No phone provided' };

  const twilioConfig = await loadTwilioConfig();
  const twilioSid = twilioConfig?.account_sid || process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = twilioConfig?.auth_token || process.env.TWILIO_AUTH_TOKEN;
  const from = twilioConfig?.from || process.env.TWILIO_WHATSAPP_FROM;

  if (!from) {
    console.log('💬 [SIMULADO] WhatsApp a:', to);
    console.log('⚠️ Configurar Twilio desde el panel de administración o en .env');
    return { success: true, simulated: true };
  }

  if (!twilioSid || !twilioToken) {
    console.log('💬 [SIMULADO] WhatsApp a:', to);
    console.log('⚠️ Configurar TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en .env');
    return { success: true, simulated: true };
  }

  const twilio = require('twilio');
  const client = twilio(twilioSid, twilioToken);

  try {
    const msg = await client.messages.create({
      from: ensureWhatsAppPrefix(from),
      body,
      to: ensureWhatsAppPrefix(to),
    });
    console.log('✅ WhatsApp enviado, SID:', msg.sid);
    return { success: true, sid: msg.sid };
  } catch (err: any) {
    logger.error('Error enviando WhatsApp', { error: err.message });
    return { success: false, error: err.message };
  }
}

export { sendWhatsApp, ensureWhatsAppPrefix };
