
// services/twilio.js - Cliente Twilio para WhatsApp
import logger from './logger';

/**
 * @returns {import('twilio').Twilio|null}
 */
function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;    const twilio = require('twilio');
  return twilio(sid, token);
}

/**
 * @param {string} phone
 * @returns {string}
 */
function ensureWhatsAppPrefix(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-\(\)]+/g, '');
  if (cleaned.startsWith('whatsapp:')) return cleaned;
  return `whatsapp:${cleaned}`;
}

/**
 * @param {string} to - número de destino
 * @param {string} body - texto del mensaje
 * @returns {Promise<{success: boolean, sid?: string, simulated?: boolean, error?: string}>}
 */
async function sendWhatsApp(to, body) {
  if (!to) return { success: true, skipped: 'No phone provided' };

  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    console.log('💬 [SIMULADO] WhatsApp a:', to);
    console.log('⚠️ Configurar TWILIO_WHATSAPP_FROM en .env');
    return { success: true, simulated: true };
  }

  const client = getClient();
  if (!client) {
    console.log('💬 [SIMULADO] WhatsApp a:', to);
    console.log('⚠️ Configurar TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en .env');
    return { success: true, simulated: true };
  }

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
