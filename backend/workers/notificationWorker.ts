import { Worker, Job } from 'bullmq';
import { connection, NotificationData } from '../services/notificationQueue';
import { createEmailTransporterWithGoogle } from '../services/email';
import { sendWhatsApp } from '../services/twilio';
import { sendPushToTenant, sendPushNotification } from '../services/web-push';
import logger from '../services/logger';

async function processEmail(data: NotificationData) {
  const { to, subject, html, text, tenantId, smtpEmail, smtpPass, data: extra } = data;

  const fromEmail = smtpEmail || process.env.SMTP_USER;
  const pass = smtpPass || process.env.SMTP_PASS;

  const transporter = await createEmailTransporterWithGoogle(fromEmail, pass, tenantId);
  if (!transporter) {
    logger.info('📧 [SIMULADO] Email a:', to);
    logger.info('⚠️ Configurar SMTP_USER y SMTP_PASS en .env para enviar emails reales');
    return { simulated: true };
  }

  await transporter.sendMail({
    from: extra?.business_name ? `"${String(extra.business_name)}" <${fromEmail}>` : fromEmail,
    to,
    subject,
    html,
    text,
  });

  logger.info('✅ Email enviado a:', to);
  return { sent: true, to };
}

async function processWhatsApp(data: NotificationData) {
  const { to, body } = data;
  if (!to || !body) return { skipped: 'No phone or body' };

  const result = await sendWhatsApp(to, body);
  if (result.simulated) {
    return { simulated: true };
  }
  if (!result.success && !result.simulated) {
    throw new Error(`WhatsApp falló: ${result.error || 'unknown'}`);
  }
  return { sent: true, to };
}

async function processPush(data: NotificationData) {
  const { tenantId, data: extra } = data;
  if (!tenantId) return { skipped: 'No tenantId' };

  const payload = {
    title: String(extra?.title || 'Notificación'),
    body: String(extra?.body || ''),
    url: extra?.url as string | undefined,
  };

  await sendPushToTenant(tenantId, payload);
  return { sent: true, tenantId };
}

async function processSMS(data: NotificationData) {
  logger.info('📱 [SIMULADO] SMS a:', data.to);
  logger.info('⚠️ Configurar Twilio para enviar SMS reales');
  return { simulated: true };
}

const worker = new Worker(
  'notifications',
  async (job: Job) => {
    const data: NotificationData = job.data;
    logger.info('🔔 Procesando notificación', {
      type: data.type,
      to: data.to,
      jobId: job.id,
    });

    switch (data.type) {
      case 'email':
        return processEmail(data);
      case 'whatsapp':
        return processWhatsApp(data);
      case 'push':
        return processPush(data);
      case 'sms':
        return processSMS(data);
      default:
        throw new Error(`Unknown notification type: ${data.type}`);
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

worker.on('failed', (job, err) => {
  logger.error('❌ Notificación fallida', {
    jobId: job?.id,
    type: job?.data?.type,
    to: job?.data?.to,
    error: err.message,
    attempts: job?.attemptsMade,
  });
});

worker.on('completed', (job) => {
  logger.info('✅ Notificación completada', {
    jobId: job.id,
    type: job.data.type,
  });
});

worker.on('error', (err) => {
  logger.error('Worker error:', err);
});

logger.info('🔔 Worker de notificaciones iniciado (concurrency: 5)');

export default worker;
