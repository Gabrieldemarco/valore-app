
// Módulo de facturación automática mensual + gestión de trial y suspensiones

import { query, queryOne } from './database';
import createEmailTransporter from './services/email';
import { sendWhatsApp } from './services/twilio';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import logger from './services/logger';

import { PLANS, MP_CURRENCY } from './services/payment-config';

/**
 * Suspende tenants free cuyo trial ya venció y les notifica por email.
 * @returns {Promise<{success: boolean, suspended?: number, error?: string}>}
 */
async function suspendExpiredFreeTrials() {
    console.log('🔍 [CRON] Buscando tenants free con trial vencido...');
    try {
        const result = await query(
            `SELECT id, slug, business_name, notification_email, trial_end_date
             FROM tenants
             WHERE plan = 'free'
               AND trial_end_date IS NOT NULL
               AND trial_end_date < NOW()
               AND status = 'active'`
        );
        const expiredTenants = result.rows || [];

        if (expiredTenants.length === 0) {
            console.log('✅ No hay tenants free con trial vencido');
            return { success: true, suspended: 0 };
        }

        console.log(`⚠️ Se suspenderán ${expiredTenants.length} tenants con trial vencido`);
        let suspendedCount = 0;
        const transporter = createEmailTransporter();

        for (const tenant of expiredTenants) {
            try {
                // Cambiar estado a 'suspended'
                await query(
                    `UPDATE tenants SET status = 'suspended', updated_at = NOW() WHERE id = $1`,
                    [tenant.id]
                );

                // Enviar email de notificación de suspensión
                if (tenant.notification_email) {
                    const daysOverdue = Math.ceil((Date.now() - new Date(tenant.trial_end_date).getTime()) / (1000 * 60 * 60 * 24));
                    await transporter.sendMail({
                        from: `"Veloré" <${process.env.SMTP_USER}>`,
                        to: tenant.notification_email,
                        subject: '⚠️ Tu cuenta ha sido suspendida',
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #1e293b;">
                                <h2 style="color: #ef4444;">⚠️ Cuenta suspendida</h2>
                                <p>Hola <strong>${tenant.business_name}</strong>,</p>
                                <p>Tu período de prueba gratuito finalizó hace <strong>${daysOverdue} días</strong>.</p>
                                <p>Tu cuenta ha sido suspendida. Para continuar usando nuestros servicios, contrata un plan desde tu panel de administración.</p>
                                <br>
                                <p>Equipo Veloré</p>
                            </div>
                        `,
                    });
                    console.log(`📧 Email de suspensión enviado a ${tenant.notification_email}`);
                }
                console.log(`🔒 Tenant ${tenant.business_name} (ID: ${tenant.id}) suspendido por trial expirado`);
                suspendedCount++;
            } catch (err: any) {
                logger.error(`❌ Error suspendiendo tenant ${tenant.business_name}:`, err.message);
            }
        }

        console.log(`✅ Suspensión completada. Total suspendidos: ${suspendedCount}`);
        return { success: true, suspended: suspendedCount };
    } catch (err: any) {
        logger.error('❌ Error en suspendExpiredFreeTrials:', err);
        return { success: false, error: err.message };
    }
}

// ========== 2. GENERAR FACTURAS MENSUALES (PLANES PAGOS) ==========
/**
 * Genera facturas mensuales para tenants con plan 'pro' o 'enterprise'.
 * @returns {Promise<{success: boolean, period?: string, invoiced?: number, errors?: number, results?: Array, error?: string, message?: string}>}
 */
async function generateMonthlyInvoices() {
    console.log('🧾 [CRON] Iniciando generación de facturas mensuales...');

    try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentYear = now.getFullYear();

        console.log(`📅 Período de facturación: ${currentMonth}/${currentYear}`);

        // Obtener tenants activos con planes pagos (excluyendo free y trial)
        const tenantsResult = await query(
            `SELECT id, slug, business_name, notification_email, plan, trial_end_date, billing_email
             FROM tenants 
             WHERE status = 'active' 
               AND plan IN ('pro', 'enterprise')
               AND (trial_end_date IS NULL OR trial_end_date < NOW())
             ORDER BY business_name`
        );
        const tenants = tenantsResult.rows || [];

        if (tenants.length === 0) {
            console.log('✅ No hay tenants elegibles para facturación');
            return { success: true, invoiced: 0, message: 'No hay tenants elegibles' };
        }

        let invoicedCount = 0;
        let errorCount = 0;
        const results = [];

        for (const tenant of tenants) {
            try {
                console.log(`\n🔍 Procesando: ${tenant.business_name} (${tenant.slug})`);

                // Verificar si ya tiene factura para este mes
                const existingInvoice = await queryOne(
                    `SELECT id FROM invoices 
                     WHERE tenant_id = $1 
                     AND EXTRACT(MONTH FROM issue_date) = $2 
                     AND EXTRACT(YEAR FROM issue_date) = $3`,
                    [tenant.id, currentMonth, currentYear]
                );

                if (existingInvoice) {
                    console.log(`⏭️ ${tenant.business_name}: Ya tiene factura para ${currentMonth}/${currentYear}`);
                    results.push({ tenant: tenant.business_name, status: 'skipped', reason: 'Ya facturado este mes' });
                    continue;
                }

                const planInfo = PLANS[tenant.plan];
                if (!planInfo || planInfo.price <= 0) {
                    console.log(`⚠️ ${tenant.business_name}: Plan sin precio definido (${tenant.plan})`);
                    results.push({ tenant: tenant.business_name, status: 'skipped', reason: 'Plan sin precio' });
                    continue;
                }

                // Generar número de factura único
                const invoiceCount = await queryOne(
                    'SELECT COUNT(*) as total FROM invoices WHERE tenant_id = $1',
                    [tenant.id]
                );
                const invoiceNumber = `INV-${currentYear}-${String(parseInt(invoiceCount.total) + 1).padStart(4, '0')}`;
                const dueDate = new Date(now);
                dueDate.setDate(dueDate.getDate() + 30);
                const description = `Suscripción mensual - Plan ${planInfo.name} - ${currentMonth}/${currentYear}`;

                const insertResult = await query(
                    `INSERT INTO invoices (
                        tenant_id, invoice_number, amount, description, due_date, status, issue_date
                    ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW()) RETURNING id`,
                    [tenant.id, invoiceNumber, planInfo.price, description, dueDate]
                );

                const invoiceId = insertResult.rows[0].id;
                console.log(`✅ ${tenant.business_name}: Factura #${invoiceNumber} creada (ID: ${invoiceId})`);

                // Enviar email de notificación
                const recipient = tenant.billing_email || tenant.notification_email;
                if (recipient) {
                    try {
                        const transporter = createEmailTransporter();
                        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                        const dashboardUrl = `${baseUrl}/admin/dashboard?tenant=${tenant.slug}`;

                        await transporter.sendMail({
                            from: `"Veloré Facturación" <${process.env.SMTP_USER}>`,
                            to: recipient,
                            subject: `📄 Nueva factura: ${invoiceNumber} - ${planInfo.name}`,
                            html: `
                                <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #1e293b;">
                                    <h2 style="color: #667eea;">📄 Factura Generada</h2>
                                    <p>Hola <strong>${tenant.business_name}</strong>,</p>
                                    <p>Se ha generado tu factura mensual correspondiente al período <strong>${currentMonth}/${currentYear}</strong>.</p>
                                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                                        <p><strong>Número:</strong> ${invoiceNumber}</p>
                                        <p><strong>Plan:</strong> ${planInfo.name}</p>
                                        <p><strong>Monto:</strong> $${planInfo.price.toLocaleString('es-AR')}</p>
                                        <p><strong>Emisión:</strong> ${now.toLocaleDateString('es-AR')}</p>
                                        <p><strong>Vencimiento:</strong> ${dueDate.toLocaleDateString('es-AR')}</p>
                                        <p><strong>Estado:</strong> <span style="color: #f59e0b;">Pendiente de pago</span></p>
                                    </div>
                                    <p>Podés ver el detalle y realizar el pago desde tu panel de administración:</p>
                                    <p style="text-align: center; margin: 25px 0;">
                                        <a href="${dashboardUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Ir al Panel de Administración →</a>
                                    </p>
                                    <p style="font-size: 12px; color: #94a3b8;">Este es un mensaje automático generado por Veloré.</p>
                                </div>
                            `,
                        });
                        console.log(`📧 Email enviado a ${recipient}`);
                    } catch (emailErr: any) {
                        logger.error(`❌ Error enviando email a ${tenant.business_name}:`, emailErr.message);
                    }
                }

                invoicedCount++;
                results.push({ tenant: tenant.business_name, status: 'success', invoiceNumber, amount: planInfo.price });
            } catch (tenantErr: any) {
                errorCount++;
                logger.error(`❌ Error procesando ${tenant.business_name}:`, tenantErr.message);
                results.push({ tenant: tenant.business_name, status: 'error', error: tenantErr.message });
            }
        }

        console.log('\n📊 === RESUMEN DE FACTURACIÓN ===');
        console.log(`✅ Facturas creadas: ${invoicedCount}`);
        console.log(`❌ Errores: ${errorCount}`);
        console.log(`⏭️ Omitidos: ${results.filter(r => r.status === 'skipped').length}`);
        console.log('===============================\n');

        return { success: true, period: `${currentMonth}/${currentYear}`, invoiced: invoicedCount, errors: errorCount, results };
    } catch (err: any) {
        logger.error('💥 ERROR CRÍTICO en generateMonthlyInvoices:', err);
        return { success: false, error: err.message };
    }
}

// ========== 3. RECORDATORIOS DE PAGO (3 días antes del vencimiento) ==========
/**
 * Envía recordatorios de pago para facturas próximas a vencer.
 * @returns {Promise<{success: boolean, reminded?: number, error?: string}>}
 */
async function sendPaymentReminders() {
    console.log('🔔 [CRON] Enviando recordatorios de pago...');

    try {
        const now = new Date();
        const reminderDays = 3;

        const pendingResult = await query(
            `SELECT i.id, i.invoice_number, i.amount, i.due_date,
                    t.business_name, t.slug, t.billing_email, t.notification_email
             FROM invoices i
             JOIN tenants t ON i.tenant_id = t.id
             WHERE i.status = 'pending'
               AND t.status = 'active'
               AND i.due_date BETWEEN NOW() AND NOW() + INTERVAL '${reminderDays} days'
             ORDER BY i.due_date ASC`
        );
        const pendingInvoices = pendingResult.rows || [];

        if (pendingInvoices.length === 0) {
            console.log('✅ No hay facturas por vencer en los próximos días');
            return { success: true, reminded: 0 };
        }

        console.log(`📧 Enviando ${pendingInvoices.length} recordatorios de pago...`);
        let sentCount = 0;
        const transporter = createEmailTransporter();
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        for (const inv of pendingInvoices) {
            const recipient = inv.billing_email || inv.notification_email;
            if (!recipient) continue;

            const daysLeft = Math.ceil((new Date(inv.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const dashboardUrl = `${baseUrl}/admin/dashboard?tenant=${inv.slug}`;

            await transporter.sendMail({
                from: `"Veloré Facturación" <${process.env.SMTP_USER}>`,
                to: recipient,
                subject: `⏰ Recordatorio: Factura ${inv.invoice_number} vence en ${daysLeft} días`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #1e293b;">
                        <h2 style="color: #f59e0b;">⏰ Recordatorio de Pago</h2>
                        <p>Hola <strong>${inv.business_name}</strong>,</p>
                        <p>Te recordamos que tu factura <strong>${inv.invoice_number}</strong> vence en <strong>${daysLeft} días</strong>.</p>
                        <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                            <p><strong>Monto:</strong> $${parseFloat(inv.amount).toLocaleString('es-AR')}</p>
                            <p><strong>Vencimiento:</strong> ${new Date(inv.due_date).toLocaleDateString('es-AR')}</p>
                        </div>
                        <p>Realizá el pago antes del vencimiento para evitar la suspensión del servicio:</p>
                        <p style="text-align: center; margin: 25px 0;">
                            <a href="${dashboardUrl}" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Ver Factura y Pagar →</a>
                        </p>
                        <p style="font-size: 12px;">Si ya realizaste el pago, ignorá este mensaje.</p>
                    </div>
                `,
            });
            sentCount++;
            console.log(`📧 Recordatorio enviado a ${recipient} (${inv.invoice_number})`);
        }

        console.log(`✅ Recordatorios enviados: ${sentCount}/${pendingInvoices.length}`);
        return { success: true, reminded: sentCount };
    } catch (err: any) {
        logger.error('💥 Error en sendPaymentReminders:', err);
        return { success: false, error: err.message };
    }
}

// ========== 4. SUSPENDER TENANTS CON FACTURAS VENCIDAS (PLANES PAGOS) ==========
/**
 * Suspende tenants con facturas vencidas por más de 7 días.
 * @returns {Promise<{success: boolean, suspended?: number, error?: string}>}
 */
async function suspendOverdueTenants() {
    console.log('🔒 [CRON] Verificando tenants con facturas vencidas...');

    try {
        const overdueDays = 7;
        const overdueResult = await query(
            `SELECT DISTINCT t.id, t.slug, t.business_name, t.notification_email, MAX(i.due_date) as oldest_due_date
             FROM tenants t
             JOIN invoices i ON t.id = i.tenant_id
             WHERE t.status = 'active'
               AND t.plan IN ('pro', 'enterprise')
               AND i.status = 'pending'
               AND i.due_date < NOW() - INTERVAL '${overdueDays} days'
             GROUP BY t.id, t.slug, t.business_name, t.notification_email`
        );
        const overdueTenants = overdueResult.rows || [];

        if (overdueTenants.length === 0) {
            console.log('✅ No hay tenants con facturas vencidas para suspender');
            return { success: true, suspended: 0 };
        }

        console.log(`⚠️ Encontrados ${overdueTenants.length} tenants con facturas vencidas`);
        let suspendedCount = 0;
        const transporter = createEmailTransporter();
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        for (const tenant of overdueTenants) {
            try {
                const daysOverdue = Math.floor((Date.now() - new Date(tenant.oldest_due_date).getTime()) / (1000 * 60 * 60 * 24));

                await query(`UPDATE tenants SET status = 'suspended', updated_at = NOW() WHERE id = $1`, [tenant.id]);

                if (tenant.notification_email) {
                    await transporter.sendMail({
                        from: `"Veloré" <${process.env.SMTP_USER}>`,
                        to: tenant.notification_email,
                        subject: `⚠️ Servicio suspendido - Facturas vencidas`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #1e293b;">
                                <h2 style="color: #ef4444;">⚠️ Servicio Suspendido</h2>
                                <p>Hola <strong>${tenant.business_name}</strong>,</p>
                                <p>Tu cuenta ha sido <strong>suspendida temporalmente</strong> debido a facturas vencidas (${daysOverdue} días).</p>
                                <p>Para reactivar tu servicio, regularizá tus pagos pendientes desde tu panel de administración y contactanos.</p>
                                <p style="text-align: center; margin: 25px 0;">
                                    <a href="${baseUrl}/admin/login" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Iniciar Sesión</a>
                                </p>
                                <p style="font-size: 12px;">Una vez regularizado, tu servicio se reactivará en un plazo de 24 horas.</p>
                            </div>
                        `,
                    });
                    console.log(`📧 Email de suspensión enviado a ${tenant.notification_email}`);
                }
                console.log(`🔒 ${tenant.business_name}: Cuenta suspendida (${daysOverdue} días vencidos)`);
                suspendedCount++;
            } catch (err: any) {
                logger.error(`❌ Error suspendiendo ${tenant.business_name}:`, err.message);
            }
        }

        console.log(`✅ Tenants suspendidos: ${suspendedCount}/${overdueTenants.length}`);
        return { success: true, suspended: suspendedCount };
    } catch (err: any) {
        logger.error('💥 Error en suspendOverdueTenants:', err);
        return { success: false, error: err.message };
    }
}

// ========== BACKUP AUTOMÁTICO DE LA DB ==========
/**
 * Crea un backup de la DB via pg_dump y mantiene los últimos 7.
 * @returns {Promise<{success: boolean, filename?: string, error?: string}>}
 */
async function backupDatabase() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        logger.error('No DATABASE_URL configurada para backup');
        return { success: false, error: 'No DATABASE_URL' };
    }
    const backupsDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup-${timestamp}.sql`;
    const filepath = path.join(backupsDir, filename);
    return new Promise((resolve) => {
        exec(`pg_dump "${dbUrl}" > "${filepath}"`, { timeout: 60000 }, (err) => {
            if (err) {
                logger.error('Error en backup:', err.message);
                resolve({ success: false, error: err.message });
                return;
            }
            logger.info(`Backup creado: ${filename}`);
            // Limpiar backups viejos (solo mantener los últimos 7)
            try {
                const files = fs.readdirSync(backupsDir)
                    .filter(f => f.startsWith('backup-') && f.endsWith('.sql'))
                    .sort()
                    .reverse();
                if (files.length > 7) {
                    files.slice(7).forEach(f => {
                        fs.unlinkSync(path.join(backupsDir, f));
                        logger.info(`Backup eliminado (viejo): ${f}`);
                    });
                }
            } catch (cleanErr: any) {
                logger.error('Error limpiando backups viejos:', cleanErr.message);
            }
            resolve({ success: true, filename });
        });
    });
}

// ========== 5. RECORDATORIOS DE TURNOS (diario a las 8:00 para turnos del día) ==========
/**
 * Envía recordatorios por WhatsApp/email a clientes con turnos confirmados para hoy.
 * @returns {Promise<{success: boolean, reminded?: number, error?: string}>}
 */
async function sendAppointmentReminders() {
    console.log('🔔 [CRON] Enviando recordatorios de turnos para hoy...');
    try {
        const result = await query(
            `SELECT a.id, a.client_name, a.client_phone, a.client_email, a.service,
                    a.appointment_date, a.staff_id, a.tenant_id,
                    t.slug, t.business_name, t.business_address, t.business_phone,
                    t.brand_primary_color, t.notification_whatsapp,
                    s.name as staff_name
             FROM appointments a
             JOIN tenants t ON a.tenant_id = t.id
             LEFT JOIN staff s ON a.staff_id = s.id
             WHERE a.appointment_date::date = CURRENT_DATE
               AND a.status = 'confirmed'
               AND a.reminder_sent = false
             ORDER BY a.appointment_date`
        );
        const appointments = result.rows || [];
        if (appointments.length === 0) {
            console.log('✅ No hay turnos para recordar hoy');
            return { success: true, reminded: 0 };
        }
        console.log(`📨 Enviando ${appointments.length} recordatorios...`);
        let sentCount = 0;
        const transporter = createEmailTransporter();
        for (const apt of appointments) {
            try {
                const date = new Date(apt.appointment_date);
                const timeStr = date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
                const dateStr = date.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });

                // WhatsApp
                if (apt.client_phone) {
                    const waBody = `🔔 Recordatorio ${apt.business_name}\nHola ${apt.client_name}, te recordamos que tenés turno hoy:\n📅 ${dateStr}\n🕐 ${timeStr}\n✂️ ${apt.service}${apt.staff_name ? `\n💈 ${apt.staff_name}` : ''}\n📍 ${apt.business_address || ''}`;
                    await sendWhatsApp(apt.client_phone, waBody);
                }

                // Email
                if (apt.client_email) {
                    const html = `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                            <h2 style="color:${apt.brand_primary_color || '#2563eb'}">🔔 Recordatorio de Turno</h2>
                            <p>Hola <strong>${apt.client_name}</strong>,</p>
                            <p>Te recordamos que tenés un turno hoy en <strong>${apt.business_name}</strong>:</p>
                            <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0">
                                <p><strong>📅 Fecha:</strong> ${dateStr}</p>
                                <p><strong>🕐 Hora:</strong> ${timeStr}</p>
                                <p><strong>✂️ Servicio:</strong> ${apt.service}</p>
                                ${apt.staff_name ? `<p><strong>💈 Peluquero:</strong> ${apt.staff_name}</p>` : ''}
                            </div>
                            <p>📍 ${apt.business_address || ''}<br>📞 ${apt.business_phone || ''}</p>
                            <p style="color:#6b7280;font-size:14px;margin-top:20px">💡 Llegá 5 minutos antes</p>
                        </div>`;
                    await transporter.sendMail({
                        from: `"${apt.business_name}" <${process.env.SMTP_USER}>`,
                        to: apt.client_email,
                        subject: `🔔 Recordatorio: Turno hoy en ${apt.business_name}`,
                        html,
                    });
                }

                await query('UPDATE appointments SET reminder_sent = true, updated_at = NOW() WHERE id = $1', [apt.id]);
                sentCount++;
                console.log(`✅ Recordatorio enviado: ${apt.client_name} - ${timeStr}`);
            } catch (err: any) {
                logger.error(`❌ Error en recordatorio para turno ${apt.id}:`, err.message);
            }
        }
        console.log(`✅ Recordatorios enviados: ${sentCount}/${appointments.length}`);
        return { success: true, reminded: sentCount };
    } catch (err: any) {
        logger.error('💥 Error en sendAppointmentReminders:', err);
        return { success: false, error: err.message };
    }
}

// ========== EXPORTAR TODAS LAS FUNCIONES ==========
export {
    generateMonthlyInvoices,
    sendPaymentReminders,
    suspendOverdueTenants,
    suspendExpiredFreeTrials,
    backupDatabase,
    sendAppointmentReminders,
    PLANS,
    MP_CURRENCY
};