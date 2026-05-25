
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

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:${tenant.brand_primary_color || '#2563eb'}">✅ Turno Confirmado</h2>
      <p>Hola <strong>${appointment.client_name}</strong>,</p>
      <p>Tu turno en <strong>${tenant.business_name}</strong>:</p>
      <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0">
        <p><strong>📅 Fecha:</strong> ${date.toLocaleDateString('es-UY')}</p>
        <p><strong>🕐 Hora:</strong> ${date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}</p>
        <p><strong>✂️ Servicio:</strong> ${appointment.service}</p>
        ${appointment.staff_name ? `<p><strong>💈 Peluquero:</strong> ${appointment.staff_name}</p>` : ''}
      </div>
      <p>📍 ${tenant.business_address || ''}<br>📞 ${tenant.business_phone || ''}</p>
      <p style="color:#6b7280;font-size:14px;margin-top:30px">💡 Llegá 5 minutos antes</p>
    </div>
  `;

  try {
    // ✅ CORREGIDO: Usar SMTP_USER en lugar de EMAIL_USER
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('📧 [SIMULADO] Email a:', appointment.client_email);
      console.log('⚠️ Configurar SMTP_USER y SMTP_PASS en .env para enviar emails reales');
      return { success: true, simulated: true };
    }

    const transporter = createEmailTransporter();

    const info = await transporter.sendMail({
      from: `"${tenant.business_name}" <${process.env.SMTP_USER}>`,
      to: appointment.client_email,
      subject: `✅ Turno confirmado - ${tenant.business_name}`,
      html
    });

    console.log('✅ Email enviado:', info.messageId);
  } catch (error: any) {
    logger.error('❌ Error enviando email:', error.message);
  }

  // WhatsApp al cliente
  if (appointment.client_phone) {
    const clientBody = `✅ Hola ${appointment.client_name}, tu turno en ${tenant.business_name} fue confirmado:\n📅 ${date.toLocaleDateString('es-UY')}\n🕐 ${date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}\n✂️ ${appointment.service}${appointment.staff_name ? `\n💈 ${appointment.staff_name}` : ''}\n📍 ${tenant.business_address || ''}`;
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
  const recipient = tenant.notification_email;
  if (!recipient) return { success: true, skipped: 'No notification email configured' };

  const date = new Date(appointment.appointment_date);

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#10b981">📅 Nuevo Turno Reservado</h2>
      <p><strong>${tenant.business_name}</strong></p>
      <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0">
        <p><strong>👤 Cliente:</strong> ${appointment.client_name}</p>
        <p><strong>📅 Fecha:</strong> ${date.toLocaleDateString('es-UY')}</p>
        <p><strong>🕐 Hora:</strong> ${date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}</p>
        <p><strong>✂️ Servicio:</strong> ${appointment.service}</p>
        ${appointment.staff_name ? `<p><strong>💈 Peluquero:</strong> ${appointment.staff_name}</p>` : ''}
        <p><strong>📞 Teléfono:</strong> ${appointment.client_phone}</p>
        ${appointment.client_email ? `<p><strong>📧 Email:</strong> ${appointment.client_email}</p>` : ''}
        ${appointment.notes ? `<p><strong>📝 Notas:</strong> ${appointment.notes}</p>` : ''}
      </div>
    </div>
  `;

  try {
    // ✅ CORREGIDO: Usar SMTP_USER en lugar de EMAIL_USER
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('📧 [SIMULADO] Alerta a staff:', recipient);
      console.log('⚠️ Configurar SMTP_USER y SMTP_PASS en .env para enviar emails reales');
      return { success: true, simulated: true };
    }

    const transporter = createEmailTransporter();

    const info = await transporter.sendMail({
      from: `"Sistema Turnos" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject: `📅 Nuevo turno: ${appointment.client_name}`,
      html
    });

    console.log('✅ Alerta a staff enviada:', info.messageId);
  } catch (error: any) {
    logger.error('❌ Error alertando staff:', error.message);
  }

  // WhatsApp al staff
  if (tenant.notification_whatsapp) {
    const staffBody = `📅 Nuevo turno - ${tenant.business_name}\n👤 ${appointment.client_name}\n📅 ${date.toLocaleDateString('es-UY')}\n🕐 ${date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}\n✂️ ${appointment.service}${appointment.staff_name ? `\n💈 ${appointment.staff_name}` : ''}\n📞 ${appointment.client_phone}${appointment.notes ? `\n📝 ${appointment.notes}` : ''}`;
    await sendWhatsApp(tenant.notification_whatsapp, staffBody);
  }

  return { success: true };
}

// ========== EXPORTAR ==========
export { sendClientConfirmation, notifyStaff, createEmailTransporter };
