
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

  const manageLink = appointment.management_link
    ? `<p style="margin-top:20px"><a href="${appointment.management_link}" style="background:${tenant.brand_primary_color || '#2563eb'};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Gestionar turno</a></p>
       <p style="font-size:13px;color:#6b7280">O copiá este enlace: <a href="${appointment.management_link}" style="color:${tenant.brand_primary_color || '#2563eb'}">${appointment.management_link}</a></p>`
    : '';

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
      ${manageLink}
      <p style="color:#6b7280;font-size:14px;margin-top:30px">💡 Llegá 5 minutos antes</p>
    </div>
  `;

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
      subject: `✅ Turno confirmado - ${tenant.business_name}`,
      html
    });

    logger.info('✅ Email enviado:', info.messageId);
  } catch (error: any) {
    logger.error('❌ Error enviando email:', error.message);
  }

  // WhatsApp al cliente
  if (appointment.client_phone) {
    let clientBody = `✅ Hola ${appointment.client_name}, tu turno en ${tenant.business_name} fue confirmado:\n📅 ${date.toLocaleDateString('es-UY')}\n🕐 ${date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}\n✂️ ${appointment.service}${appointment.staff_name ? `\n💈 ${appointment.staff_name}` : ''}\n📍 ${tenant.business_address || ''}`;
    if (appointment.management_link) {
      clientBody += `\n\n🔗 Gestioná tu turno: ${appointment.management_link}`;
    }
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
  const recipients = [];
  if (tenant.notification_email) recipients.push(tenant.notification_email);
  if (appointment.staff_email && appointment.staff_email !== tenant.notification_email) {
    recipients.push(appointment.staff_email);
  }
  if (recipients.length === 0) return { success: true, skipped: 'No recipients configured' };

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
          subject: `📅 Nuevo turno: ${appointment.client_name}`,
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
    const staffBody = `📅 Nuevo turno - ${tenant.business_name}\n👤 ${appointment.client_name}\n📅 ${date.toLocaleDateString('es-UY')}\n🕐 ${date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}\n✂️ ${appointment.service}${appointment.staff_name ? `\n💈 ${appointment.staff_name}` : ''}\n📞 ${appointment.client_phone}${appointment.notes ? `\n📝 ${appointment.notes}` : ''}`;
    await sendWhatsApp(tenant.notification_whatsapp, staffBody);
  }

  sendPushToTenant(tenant.id, {
    title: `📅 Nuevo turno - ${tenant.business_name}`,
    body: `${appointment.client_name} - ${appointment.service} - ${date.toLocaleDateString('es-UY')} ${date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}`,
    url: '/staff/dashboard',
  });

  return { success: true };
}

// ========== ENVIAR CREDENCIALES A NUEVO STAFF ==========
async function sendStaffCredentials(staff: { name: string; email: string }, tempPassword: string, tenant: { business_name: string }) {
  const loginUrl = `${process.env.BASE_URL || 'https://app.velsoie.com.uy'}/staff/login`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#10b981">👋 Bienvenido a ${tenant.business_name}</h2>
      <p>Hola <strong>${staff.name}</strong>,</p>
      <p>Se ha creado tu cuenta de acceso al sistema de turnos.</p>
      <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0">
        <p><strong>🔑 Contraseña temporal:</strong> <code style="background:#e5e7eb;padding:4px 8px;border-radius:4px;font-size:16px">${tempPassword}</code></p>
        <p style="margin-top:16px"><a href="${loginUrl}" style="background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Iniciar sesión</a></p>
        <p style="margin-top:12px;font-size:13px;color:#6b7280">O copiá este enlace en tu navegador: <br><a href="${loginUrl}" style="color:#10b981">${loginUrl}</a></p>
      </div>
      <p style="color:#6b7280;font-size:13px">Te recomendamos cambiar la contraseña después de iniciar sesión.</p>
    </div>
  `;

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
      subject: `👋 Bienvenido a ${tenant.business_name} - Tus credenciales`,
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
