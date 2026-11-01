// services/whatsapp-web.ts - WhatsApp Web (cuenta personal) para envío invisible
// La primera vez escaneá el QR (PM2 logs / qr.png). La sesión se persiste con LocalAuth.
import fs from 'fs';
import path from 'path';
import logger from './logger';

let client: any = null;
let ready = false;
let initializing = false;
let lastQr: string | null = null;

const SESSION_DIR = process.env.WA_SESSION_DIR || path.join(process.cwd(), '.wwebjs');
const QR_IMAGE_PATH = process.env.WA_QR_IMAGE_PATH || path.join(SESSION_DIR, 'qr.png');

export function isWhatsappWebEnabled() {
  return process.env.WHATSAPP_WEB_ENABLED === 'true';
}

export function getWhatsappStatus() {
  return {
    enabled: isWhatsappWebEnabled(),
    ready,
    initialized: !!client,
    sessionDir: SESSION_DIR,
    qrImage: QR_IMAGE_PATH,
    hasQr: !!lastQr,
  };
}

function toChatId(phone: string) {
  if (!phone) return '';
  let s = phone.replace(/[\s\-()+]+/g, '');
  if (s.startsWith('whatsapp:')) s = s.slice(9);
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('00')) s = s.slice(2);
  if (s.startsWith('598')) return s + '@c.us';
  if (s.startsWith('0')) return '598' + s.slice(1) + '@c.us';
  return '598' + s + '@c.us';
}

export async function initWhatsappClient() {
  if (initializing) {
    let waited = 0;
    while (initializing && waited < 10000) {
      await new Promise(r => setTimeout(r, 200));
      waited += 200;
    }
    return;
  }
  initializing = true;
  try {
    if (!isWhatsappWebEnabled()) {
      initializing = false;
      return;
    }
    if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('whatsapp-web.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const qrcode = require('qrcode');

    client = new mod.Client({
      authStrategy: new mod.LocalAuth({ dataPath: SESSION_DIR, clientId: 'velsoie' }),
      puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-cache',
          '--disable-gpu',
        ],
      },
    });

    client.on('qr', (qr: string) => {
      lastQr = qr;
      try {
        qrcode.toFile(QR_IMAGE_PATH, qr, (err: Error | null) => {
          if (err) logger.warn('No se pudo generar qr.png:', err.message);
        });
      } catch (e) {
        logger.warn('qrcode error:', String(e));
      }
      logger.info(`📱 [WhatsApp Web] Escaneá este QR desde tu WhatsApp (PM2 logs o ${QR_IMAGE_PATH})`);
      logger.info(`📱 [WhatsApp Web] Código QR: ${qr}`);
    });

    client.on('authenticated', () => {
      logger.info('📱 [WhatsApp Web] ✅ Autenticado. Sesión persistente guardada.');
      lastQr = null;
    });
    client.on('auth_failure', (msg: string) => {
      logger.error(`📱 [WhatsApp Web] ❌ Falló la autenticación: ${msg}`);
    });
    client.on('ready', () => {
      ready = true;
      logger.info('📱 [WhatsApp Web] ✅ Listo — notificaciones invisibles activas.');
    });
    client.on('disconnected', (reason: any) => {
      ready = false;
      logger.warn(`📱 [WhatsApp Web] ⚠️ Desconectado: ${reason}`);
    });

    await client.initialize();
  } catch (err: any) {
    logger.error(
      `📱 [WhatsApp Web] Error inicializando cliente (¿corriste 'npm install whatsapp-web.js'?): ${err.message}`
    );
    client = null;
  } finally {
    initializing = false;
  }
}

export async function sendWhatsAppWeb(to: string, body: string) {
  if (!isWhatsappWebEnabled()) return { success: false, skipped: 'whatsapp-web disabled' };
  await initWhatsappClient();

  const deadline = Date.now() + 5000;
  while (!ready && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 250));
  }

  if (!client || !ready) {
    return { success: true, simulated: true, reason: 'client not ready (escané el QR?)' };
  }

  const chatId = toChatId(to);
  if (!chatId) return { success: true, skipped: 'No phone provided' };

  try {
    const r = await client.sendMessage(chatId, body);
    return { success: true, id: r?.id?.id };
  } catch (err: any) {
    logger.error('📱 [WhatsApp Web] Error enviando:', err.message);
    return { success: false, error: err.message };
  }
}
