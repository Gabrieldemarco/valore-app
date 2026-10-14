
// services/email.ts - Transporter de email unificado
import nodemailer from 'nodemailer';
import { getSmtpAccessToken } from './google-smtp';
import config from '../config';
import logger from './logger';
require('dotenv').config();

function createEmailTransporter(smtpEmail?: string, smtpPassword?: string): import('nodemailer').Transporter {
  const user = smtpEmail || process.env.SMTP_USER;
  const pass = smtpPassword || process.env.SMTP_PASS;

  if (process.env.SMTP_SERVICE) {
    return nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user,
        pass,
      },
    });
  }

  const secure = process.env.SMTP_SECURE === 'true';
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Creates an email transporter, preferring Google XOAUTH2 if the tenant has
 * connected their Google account for SMTP. Falls back to traditional SMTP
 * with smtpEmail/smtpPassword (per-tenant or env defaults).
 * Returns null if no SMTP credentials are available.
 *
 * @param smtpEmail - Per-tenant SMTP email (or env default)
 * @param smtpPassword - Per-tenant SMTP password/app password (or env default)
 * @param tenantId - Optional tenant ID for Google XOAUTH2 lookup
 * @param allowFallback - If true (default), falls back to traditional SMTP
 */
async function createEmailTransporterWithGoogle(
  smtpEmail?: string,
  smtpPassword?: string,
  tenantId?: number,
  allowFallback = true
): Promise<import('nodemailer').Transporter | null> {
  // Try Google XOAUTH2 first if tenantId is provided
  if (tenantId) {
    try {
      const tokenResult = await getSmtpAccessToken(tenantId);
      if (tokenResult) {
        const { accessToken, email, refreshToken } = tokenResult;
        const user = email || smtpEmail || process.env.SMTP_USER;
        logger.info('Usando Gmail XOAUTH2 para envío de emails', { tenantId });
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user,
            clientId: config.GOOGLE_CLIENT_ID,
            clientSecret: config.GOOGLE_CLIENT_SECRET,
            refreshToken: refreshToken || '',
            accessToken,
          },
        });
      }
    } catch (err: any) {
      logger.error('Error creando transporter Gmail XOAUTH2:', err.message);
    }
  }

  // Fall back to traditional SMTP
  if (!allowFallback) return null;

  const user = smtpEmail || process.env.SMTP_USER;
  const pass = smtpPassword || process.env.SMTP_PASS;
  if (!user || !pass) return null;

  return createEmailTransporter(smtpEmail, smtpPassword);
}

export default createEmailTransporter;
export { createEmailTransporterWithGoogle };
