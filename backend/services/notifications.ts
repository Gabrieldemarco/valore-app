
// services/notifications.ts - Notificaciones multicanal con queue
import createEmailTransporter from './email';
import { enqueueNotification } from './notificationQueue';
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
  const smtpUser = tenant.smtp_email || process.env.SMTP_USER;
  const smtpPass = tenant.smtp_password || process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    return { success: true, simulated: true };
  }

  await enqueueNotification({
    type: 'email',
    to: appointment.client_email,
    subject: tmpl.emailSubject(data),
    html,
    tenantId: tenant.id,
    smtpEmail: smtpUser,
    smtpPass,
    priority: 'normal',
    data: { business_name: tenant.business_name },
  });

  if (appointment.client_phone) {
    const clientBody = tmpl.whatsappBody(data);
    await enqueueNotification({
      type: 'whatsapp',
      to: appointment.client_phone,
      body: clientBody,
      priority: 'high',
    });
  }

  return { success: true, enqueued: true };
}

// ========== NOTIFICAR AL STAFF ==========
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
  const subject = tmpl.emailSubject(data);
  const smtpUser = tenant.smtp_email || process.env.SMTP_USER;
  const smtpPass = tenant.smtp_password || process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    return { success: true, simulated: true };
  }

  for (const recipient of recipients) {
    await enqueueNotification({
      type: 'email',
      to: recipient,
      subject,
      html,
      tenantId: tenant.id,
      smtpEmail: smtpUser,
      smtpPass,
      priority: 'normal',
      data: { business_name: 'Sistema Turnos' },
    });
  }

  if (tenant.notification_whatsapp) {
    const staffBody = tmpl.whatsappBody(data);
    await enqueueNotification({
      type: 'whatsapp',
      to: tenant.notification_whatsapp,
      body: staffBody,
      priority: 'high',
    });
  }

  enqueueNotification({
    type: 'push',
    to: '',
    tenantId: tenant.id,
    data: {
      title: tmpl.pushTitle(data),
      body: tmpl.pushBody(data),
      url: '/staff/dashboard',
    },
    priority: 'low',
  });

  return { success: true, enqueued: true };
}

// ========== ENVIAR CREDENCIALES A NUEVO STAFF ==========
async function sendStaffCredentials(staff: { name: string; email: string }, tempPassword: string, tenant: { business_name: string; smtp_email?: string; smtp_password?: string; id?: number }) {
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
  const smtpUser = tenant.smtp_email || process.env.SMTP_USER;
  const smtpPass = tenant.smtp_password || process.env.SMTP_PASS;

  await enqueueNotification({
    type: 'email',
    to: staff.email,
    subject: tmpl.emailSubject(data),
    html,
    tenantId: tenant.id,
    smtpEmail: smtpUser,
    smtpPass,
    priority: 'normal',
    data: { business_name: tenant.business_name },
  });

  return { success: true, enqueued: true };
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
