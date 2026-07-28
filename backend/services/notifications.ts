
// services/notifications.js
/**
 * @typedef {Object} Tenant
 * @property {number} id
 * @property {string} slug
 * @property {string} business_name
 * @property {string} [brand_primary_color]
 * @property {string} [business_address]
 * @property {string} [business_phone]
 * @property {string} [notification_email]
 */

import createEmailTransporter from './email';
import { sendWhatsApp } from './twilio';
import logger from './logger';
import { getLocale } from '../utils/locale';
import { getTemplate } from '../utils/templates';

/**
 * @param {Object} appointment
 * @param {string} [appointment.client_email]
 * @param {string} appointment.client_name
 * @param {string} appointment.appointment_date
 * @param {string} appointment.service
 * @param {string} [appointment.staff_name]
 * @param {Tenant} tenant
 * @returns {Promise<{success: boolean, messageId?: string, skipped?: string, simulated?: boolean, error?: string}>}
 */
async function sendClientConfirmation(appointment, tenant) {
  if (!appointment.client_email) return { success: true, skipped: 'No email provided' };

  const date = new Date(appointment.appointment_date);
  const locale = getLocale();
  const tmpl = getTemplate('appointmentConfirmation', locale);
  if (!tmpl) return { success: false, error: `Missing template for locale: ${locale}` };

  const data = {
    client_name: appointment.client_name,
    business_name: tenant.business_name,
    date: date.toLocaleDateString(locale),
    time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    service: appointment.service,
    staff_name: appointment.staff_name,
    business_address: tenant.business_address,
    business_phone: tenant.business_phone,
    brand_primary_color: tenant.brand_primary_color,
    management_link: appointment.management_link,
  };

  const html = tmpl.emailHtml(data);

  try {
    // ✅ CORREGIDO: Usar SMTP_USER en lugar de EMAIL_USER
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.info('📧 [SIMULADO] Email a:', appointment.client_email);
      logger.info('⚠️ Configurar SMTP_USER y SMTP_PASS en .env para enviar emails reales');
      return { success: true, simulated: true };
    }

    const transporter = createEmailTransporter();

    const info = await transporter.sendMail({
      from: `"${tenant.business_name}" <${process.env.SMTP_USER}>`,
      to: appointment.client_email,
      subject: tmpl.emailSubject(data),
      html
    });

    logger.info('✅ Email enviado:', info.messageId);
  } catch (error: any) {
    logger.error('❌ Error enviando email:', error.message);
  }

  // WhatsApp al cliente
  if (appointment.client_phone) {
    const clientBody = tmpl.whatsappBody(data);
    await sendWhatsApp(appointment.client_phone, clientBody);
  }

  return { success: true };
}

// ========== NOTIFICAR AL STAFF ==========
/**
 * @param {Object} appointment
 * @param {string} appointment.client_name
 * @param {string} appointment.appointment_date
 * @param {string} appointment.service
 * @param {string} [appointment.staff_name]
 * @param {string} appointment.client_phone
 * @param {string} [appointment.client_email]
 * @param {string} [appointment.notes]
 * @param {Tenant} tenant
 * @returns {Promise<{success: boolean, messageId?: string, skipped?: string, simulated?: boolean, error?: string}>}
 */
async function notifyStaff(appointment, tenant) {
  const recipients: string[] = [];
  if (tenant.notification_email) recipients.push(tenant.notification_email);
  if (appointment.staff_email && appointment.staff_email !== tenant.notification_email) {
    recipients.push(appointment.staff_email);
  }
  if (recipients.length === 0) return { success: true, skipped: 'No recipients configured' };

  const date = new Date(appointment.appointment_date);
  const locale = getLocale();
  const tmpl = getTemplate('staffNewAppointment', locale);
  if (!tmpl) return { success: false, error: `Missing template for locale: ${locale}` };

  const data = {
    client_name: appointment.client_name,
    business_name: tenant.business_name,
    date: date.toLocaleDateString(locale),
    time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    service: appointment.service,
    staff_name: appointment.staff_name,
    client_phone: appointment.client_phone,
    client_email: appointment.client_email,
    notes: appointment.notes,
  };

  const html = tmpl.emailHtml(data);

  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.info('📧 [SIMULADO] Alerta a staff:', recipients.join(', '));
      logger.info('⚠️ Configurar SMTP_USER y SMTP_PASS en .env para enviar emails reales');
      return { success: true, simulated: true };
    }

    const transporter = createEmailTransporter();

    for (const recipient of recipients) {
      try {
        const info = await transporter.sendMail({
          from: `"Sistema Turnos" <${process.env.SMTP_USER}>`,
          to: recipient,
          subject: tmpl.emailSubject(data),
          html
        });
        logger.info('✅ Alerta enviada a:', recipient, info.messageId);
      } catch (err: any) {
        logger.error('❌ Error alertando a', recipient, err.message);
      }
    }
  } catch (error: any) {
    logger.error('❌ Error configurando transporte:', error.message);
  }

  // WhatsApp al staff (solo al número general del negocio)
  if (tenant.notification_whatsapp) {
    const staffBody = tmpl.whatsappBody(data);
    await sendWhatsApp(tenant.notification_whatsapp, staffBody);
  }

  sendPushToTenant(tenant.id, {
    title: tmpl.pushTitle(data),
    body: tmpl.pushBody(data),
    url: '/staff/dashboard',
  });

  return { success: true };
}

// ========== ENVIAR CREDENCIALES A NUEVO STAFF ==========
async function sendStaffCredentials(staff: { name: string; email: string }, tempPassword: string, tenant: { business_name: string }) {
  const loginUrl = `${process.env.BASE_URL || 'https://app.velsoie.com.uy'}/staff/login`;
  const locale = getLocale();
  const tmpl = getTemplate('staffCredentials', locale);
  if (!tmpl) return { success: false, error: `Missing template for locale: ${locale}` };

  const data = {
    staff_name: staff.name,
    business_name: tenant.business_name,
    tempPassword,
    loginUrl,
  };

  const html = tmpl.emailHtml(data);

  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.info('📧 [SIMULADO] Credenciales enviadas a:', staff.email);
      logger.info('⚠️ Configurar SMTP_USER y SMTP_PASS en .env para enviar emails reales');
      return { success: true, simulated: true };
    }
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: `"${tenant.business_name}" <${process.env.SMTP_USER}>`,
      to: staff.email,
      subject: tmpl.emailSubject(data),
      html
    });
    logger.info('✅ Credenciales enviadas a:', staff.email);
    return { success: true };
  } catch (error: any) {
    logger.error('❌ Error enviando credenciales a', staff.email, error.message);
    return { success: false, error: error.message };
  }
}

// ========== EXPORTAR ==========
async function sendPushToTenant(tenantId, payload) {
  try {
    const { sendPushToTenant: sendPush } = await import('./web-push');
    await sendPush(tenantId, payload);
  } catch (err) {
    /* push es adicional, no crítico */
  }
}

export { sendClientConfirmation, notifyStaff, sendStaffCredentials, createEmailTransporter };
