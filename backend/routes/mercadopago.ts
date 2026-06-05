
import { Router } from 'express';
import { query, queryOne } from '../database';
import logger from '../services/logger';
import { authenticateSuperAdmin } from '../middleware';
import { verifyMercadoPagoWebhook,
  extractPaymentId,
  isPaymentNotification, } from '../services/mercadopago-webhook';
import { getPayment as mpGetPayment } from '../services/mercadopago-client';
import { activateTenantFromPaidInvoice } from '../services/billing';
import { sendClientConfirmation, notifyStaff } from '../services/notifications';

/**
 * @param {(invoice: any, tenant: any, req: import('express').Request, returnPath?: string) => Promise<any>} createMercadoPagoPreference
 * @param {string} MP_CURRENCY
 * @returns {import('express').Router}
 */
export default function(createMercadoPagoPreference, MP_CURRENCY) {
  const router = Router();

  router.get('/test-webhook', (req, res) => {
    res.json({ status: 'ok', message: 'Webhook endpoint accessible', timestamp: new Date().toISOString() });
  });

  router.post('/payments/mercadopago/create', authenticateSuperAdmin, async (req, res) => {
    try {
      const { invoiceId } = req.body;
      if (!invoiceId) return res.status(400).json({ error: 'invoiceId es requerido' });

      const invoice = await queryOne('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
      if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
      if (invoice.status === 'paid') return res.status(400).json({ error: 'Factura ya pagada' });

      const tenant = await queryOne('SELECT id, business_name, slug FROM tenants WHERE id = $1', [invoice.tenant_id]);
      if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado' });

      const preference = await createMercadoPagoPreference(invoice, tenant, req, '/admin/dashboard');

      await query(
        `INSERT INTO payments (invoice_id, tenant_id, amount, currency, method, status, raw_payload) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [invoice.id, invoice.tenant_id, invoice.amount, MP_CURRENCY, 'mercadopago', 'pending', JSON.stringify(preference)]
      );

      const checkoutUrl = preference.init_point || preference.sandbox_init_point;
      res.json({ init_point: checkoutUrl, preferenceId: preference.id });
    } catch (err: any) {
      logger.error('Error creando preferencia MercadoPago', { error: err.message });
      res.status(500).json({ error: 'Error al crear el pago' });
    }
  });

  router.post('/payments/mercadopago/webhook', async (req, res) => {
    try {
      const verification = verifyMercadoPagoWebhook(req);
      if (!verification.ok) {
        logger.warn('Webhook MercadoPago rechazado', { message: verification.message });
        return res.status(verification.status).send(verification.message);
      }
      if (verification.skipped) {
        logger.warn('Webhook MercadoPago: MP_WEBHOOK_SECRET no configurado (firma omitida en desarrollo)');
      }

      if (!isPaymentNotification(req)) {
        return res.status(200).send('OK');
      }

      const paymentId = extractPaymentId(req);
      if (!paymentId) {
        return res.status(400).send('payment_id no recibido');
      }

      if (!process.env.MP_ACCESS_TOKEN) {
        logger.error('Webhook MercadoPago: MP_ACCESS_TOKEN no configurado');
        return res.status(503).send('Pagos no configurados');
      }

      if (req.body?.live_mode === false) {
        logger.info('Webhook MercadoPago: prueba recibida (live_mode: false), devolviendo OK');
        return res.status(200).send('OK - Test mode');
      }

      const paymentData = await mpGetPayment(paymentId);
      const extRef = paymentData.external_reference || '';

      if (extRef.startsWith('appointment:')) {
        const appointmentId = parseInt(extRef.split(':')[1], 10);
        if (!appointmentId) return res.status(400).send('Turno no encontrado en la referencia');

        const appointment = await queryOne('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
        if (!appointment) return res.status(404).send('Turno no encontrado');

        await query(
          `UPDATE payments SET status = $1, mp_payment_id = $2, raw_payload = COALESCE(raw_payload::jsonb, '{}'::jsonb) || $3::jsonb WHERE invoice_id IS NULL AND mp_payment_id = $4`,
          [paymentData.status, paymentData.id, JSON.stringify(paymentData), paymentData.id]
        );

        if (paymentData.status === 'approved' && !appointment.deposit_paid) {
          await query(
            `UPDATE appointments SET deposit_paid = true, deposit_payment_id = $1, status = 'confirmed', updated_at = NOW() WHERE id = $2`,
            [paymentData.id, appointmentId]
          );
          const tenant = await queryOne('SELECT * FROM tenants WHERE id = $1', [appointment.tenant_id]);
          const updated = await queryOne('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
          if (tenant && updated) {
            const staffMember = updated.staff_id
              ? await queryOne('SELECT name, email FROM staff WHERE id = $1', [updated.staff_id])
              : null;
            if (staffMember) {
              updated.staff_name = staffMember.name;
              updated.staff_email = staffMember.email;
            }
            sendClientConfirmation(updated, tenant).catch(e => logger.error('Error notif cliente seña', { error: e.message }));
            notifyStaff(updated, tenant).catch(e => logger.error('Error notif staff seña', { error: e.message }));
          }
          logger.info('Seña pagada y turno confirmado', { appointmentId });
        }
        return res.status(200).send('OK');
      }

      const invoiceId = parseInt(extRef, 10);
      if (!invoiceId) return res.status(400).send('Factura no encontrada en la referencia');

      const invoice = await queryOne('SELECT id, amount, status FROM invoices WHERE id = $1', [invoiceId]);
      if (!invoice) return res.status(404).send('Factura no encontrada');

      if (paymentData.status === 'approved') {
        const paidAmount = parseFloat(paymentData.transaction_amount);
        const invoiceAmount = parseFloat(invoice.amount);
        if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - invoiceAmount) > 0.01) {
          logger.error('Webhook MercadoPago: monto no coincide', {
            invoiceId,
            paidAmount,
            invoiceAmount,
          });
          return res.status(400).send('Monto no coincide con la factura');
        }
      }

      await query(
        `UPDATE payments SET status = $1, mp_payment_id = $2, raw_payload = COALESCE(raw_payload::jsonb, '{}'::jsonb) || $3::jsonb WHERE invoice_id = $4`,
        [paymentData.status, paymentData.id, JSON.stringify(paymentData), invoiceId]
      );

      if (paymentData.status === 'approved' && invoice.status !== 'paid') {
        await query(
          `UPDATE invoices SET status = 'paid', paid_date = NOW(), payment_method = 'mercadopago' WHERE id = $1`,
          [invoiceId]
        );
        const fullInvoice = await queryOne('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
        if (fullInvoice) {
          const upgraded = await activateTenantFromPaidInvoice(query, fullInvoice);
          if (upgraded) {
            logger.info('Plan activado tras pago MercadoPago', { tenantId: fullInvoice.tenant_id, invoiceId });
          }
        }
      }

      res.status(200).send('OK');
    } catch (err: any) {
      logger.error('Error en webhook MercadoPago', { error: err.message });
      res.status(500).send('ERROR');
    }
  });

  return router;
};

