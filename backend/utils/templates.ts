export type Locale = string;

interface Templates {
  [key: string]: (data: Record<string, unknown>) => string;
}

const templates: Record<string, Record<string, Templates>> = {
  appointmentConfirmation: {
    'es-UY': {
      emailSubject: (d) => `✅ Turno confirmado - ${d.business_name}`,
      emailHtml: (d) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:${d.brand_primary_color || '#2563eb'}">✅ Turno Confirmado</h2>
      <p>Hola <strong>${d.client_name}</strong>,</p>
      <p>Tu turno en <strong>${d.business_name}</strong>:</p>
      <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0">
        <p><strong>📅 Fecha:</strong> ${d.date}</p>
        <p><strong>🕐 Hora:</strong> ${d.time}</p>
        <p><strong>✂️ Servicio:</strong> ${d.service}</p>
        ${d.staff_name ? `<p><strong>💈 Peluquero:</strong> ${d.staff_name}</p>` : ''}
      </div>
      <p>📍 ${d.business_address || ''}<br>📞 ${d.business_phone || ''}</p>
      ${d.management_link ? `<p style="margin-top:20px"><a href="${d.management_link}" style="background:${d.brand_primary_color || '#2563eb'};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Gestionar turno</a></p>
      <p style="font-size:13px;color:#6b7280">O copiá este enlace: <a href="${d.management_link}" style="color:${d.brand_primary_color || '#2563eb'}">${d.management_link}</a></p>` : ''}
      <p style="color:#6b7280;font-size:14px;margin-top:30px">💡 Llegá 5 minutos antes</p>
    </div>
  `,
      smsBody: (d) => {
        let body = `✅ Hola ${d.client_name}, tu turno en ${d.business_name} fue confirmado:\n📅 ${d.date}\n🕐 ${d.time}\n✂️ ${d.service}${d.staff_name ? `\n💈 ${d.staff_name}` : ''}\n📍 ${d.business_address || ''}`;
        if (d.management_link) {
          body += `\n\n🔗 Gestioná tu turno: ${d.management_link}`;
        }
        return body;
      },
      whatsappBody: (d) => {
        let body = `✅ Hola ${d.client_name}, tu turno en ${d.business_name} fue confirmado:\n📅 ${d.date}\n🕐 ${d.time}\n✂️ ${d.service}${d.staff_name ? `\n💈 ${d.staff_name}` : ''}\n📍 ${d.business_address || ''}`;
        if (d.management_link) {
          body += `\n\n🔗 Gestioná tu turno: ${d.management_link}`;
        }
        return body;
      },
    },
  },
  staffNewAppointment: {
    'es-UY': {
      emailSubject: (d) => `📅 Nuevo turno: ${d.client_name}`,
      emailHtml: (d) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#10b981">📅 Nuevo Turno Reservado</h2>
      <p><strong>${d.business_name}</strong></p>
      <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0">
        <p><strong>👤 Cliente:</strong> ${d.client_name}</p>
        <p><strong>📅 Fecha:</strong> ${d.date}</p>
        <p><strong>🕐 Hora:</strong> ${d.time}</p>
        <p><strong>✂️ Servicio:</strong> ${d.service}</p>
        ${d.staff_name ? `<p><strong>💈 Peluquero:</strong> ${d.staff_name}</p>` : ''}
        <p><strong>📞 Teléfono:</strong> ${d.client_phone}</p>
        ${d.client_email ? `<p><strong>📧 Email:</strong> ${d.client_email}</p>` : ''}
        ${d.notes ? `<p><strong>📝 Notas:</strong> ${d.notes}</p>` : ''}
      </div>
    </div>
  `,
      smsBody: (d) => `📅 Nuevo turno - ${d.business_name}\n👤 ${d.client_name}\n📅 ${d.date}\n🕐 ${d.time}\n✂️ ${d.service}${d.staff_name ? `\n💈 ${d.staff_name}` : ''}\n📞 ${d.client_phone}${d.notes ? `\n📝 ${d.notes}` : ''}`,
      whatsappBody: (d) => `📅 Nuevo turno - ${d.business_name}\n👤 ${d.client_name}\n📅 ${d.date}\n🕐 ${d.time}\n✂️ ${d.service}${d.staff_name ? `\n💈 ${d.staff_name}` : ''}\n📞 ${d.client_phone}${d.notes ? `\n📝 ${d.notes}` : ''}`,
      pushTitle: (d) => `📅 Nuevo turno - ${d.business_name}`,
      pushBody: (d) => `${d.client_name} - ${d.service} - ${d.date} ${d.time}`,
    },
  },
  staffCredentials: {
    'es-UY': {
      emailSubject: (d) => `👋 Bienvenido a ${d.business_name} - Tus credenciales`,
      emailHtml: (d) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#10b981">👋 Bienvenido a ${d.business_name}</h2>
      <p>Hola <strong>${d.staff_name}</strong>,</p>
      <p>Se ha creado tu cuenta de acceso al sistema de turnos.</p>
      <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0">
        <p><strong>🔑 Contraseña temporal:</strong> <code style="background:#e5e7eb;padding:4px 8px;border-radius:4px;font-size:16px">${d.tempPassword}</code></p>
        <p style="margin-top:16px"><a href="${d.loginUrl}" style="background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Iniciar sesión</a></p>
        <p style="margin-top:12px;font-size:13px;color:#6b7280">O copiá este enlace en tu navegador: <br><a href="${d.loginUrl}" style="color:#10b981">${d.loginUrl}</a></p>
      </div>
      <p style="color:#6b7280;font-size:13px">Te recomendamos cambiar la contraseña después de iniciar sesión.</p>
    </div>
  `,
    },
  },
};

export function getTemplate(type: string, locale: Locale = 'es-UY'): Templates | undefined {
  return templates[type]?.[locale];
}
